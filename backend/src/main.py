from __future__ import annotations

import json
import mimetypes
from io import BytesIO
from pathlib import Path
from typing import Any
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response, StreamingResponse
from pydantic import BaseModel, Field
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from .ai_context import merge_prompt_with_context, resolve_context_artifacts
from .auth import RequestContext, require_request_context, resolve_request_context
from .artifact_drafts import build_run_artifact_payload
from .config import settings
from .providers import (
    OPENROUTER_NOT_CONFIGURED,
    build_google_connect_url,
    call_openrouter,
    call_openrouter_stream,
    compare_models,
    google_calendar_events,
    provider_statuses,
)
from .runtime_store import RuntimeStoreError, get_runtime_store
from .supabase_service import supabase_service
from .workflows import run_studio_workflow

load_dotenv()

app = FastAPI(title="Beyond Chat API", version="0.3.0")

cors_allow_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    settings.app_url,
    "https://beyond-chat-ivory.vercel.app",
]
deduped_cors_allow_origins: list[str] = list(dict.fromkeys(origin for origin in cors_allow_origins if origin))

app.add_middleware(
    CORSMiddleware,
    allow_origins=deduped_cors_allow_origins,
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RuntimeStoreError)
async def runtime_store_error_handler(_request: Request, exc: RuntimeStoreError):
    return JSONResponse(status_code=503, content={"detail": str(exc)})


@app.middleware("http")
async def attach_request_context(request: Request, call_next):
    if request.url.path.startswith("/api") and request.url.path != "/api/health":
        try:
            request.state.request_context = resolve_request_context(
                request.headers.get("authorization"),
                request.headers.get("x-workspace-id"),
            )
        except HTTPException as exc:
            request.state.request_context_error = exc
    return await call_next(request)

SUPPORTED_STUDIOS = {"chat", "writing", "research", "image", "data", "finance"}
FRONTEND_DIST_DIR = Path(__file__).resolve().parents[2] / "frontend" / "dist"


class ChatMessage(BaseModel):
    role: str
    content: str


class OpenRouterChatRequest(BaseModel):
    model: str = Field(default=settings.openrouter_default_model)
    messages: list[ChatMessage]
    temperature: float = Field(default=0.2, ge=0.0, le=2.0)
    max_tokens: int = Field(default=500, ge=1, le=4096)


class OpenRouterChatResponse(BaseModel):
    model: str
    content: str


class CreateThreadRequest(BaseModel):
    title: str
    collection_id: str | None = None
    collection_type: str = "chat"
    studio: str = "chat"
    model: str = settings.openrouter_default_model
    prompt: str | None = None


class CreateMessageRequest(BaseModel):
    content: str
    model: str = settings.openrouter_default_model


class CompareRequest(BaseModel):
    prompt: str
    models: list[str] = Field(min_length=1, max_length=4)
    context_ids: list[str] = Field(default_factory=list)


class RunRequest(BaseModel):
    studio: str
    title: str
    prompt: str
    model: str = settings.openrouter_default_model
    context_ids: list[str] = Field(default_factory=list)
    options: dict[str, Any] = Field(default_factory=dict)


class ArtifactRequest(BaseModel):
    title: str
    artifact_type: str = Field(alias="type")
    studio: str
    content: str
    summary: str | None = None
    content_format: str = "markdown"
    metadata: dict[str, Any] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)
    preview_image: str | None = None
    content_json: Any | None = None
    source_run_id: str | None = None
    storage_path: str | None = None


class SaveRunArtifactRequest(BaseModel):
    title: str | None = None
    artifact_type: str | None = Field(default=None, alias="type")
    summary: str | None = None
    content_format: str | None = None
    tags: list[str] = Field(default_factory=list)


class ExportRequest(BaseModel):
    format: str = Field(pattern="^(markdown|pdf)$")


class LegacyExportRequest(ExportRequest):
    artifact_id: str


class SignedUrlRequest(BaseModel):
    path: str
    expires_in: int = Field(default=3600, ge=60, le=86400)

# Push

def api_success(data: Any) -> dict[str, Any]:
    return {"data": data, "error": None}


def build_pdf(title: str, content: str) -> bytes:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    pdf.setTitle(title)
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(72, 760, title)
    pdf.setFont("Helvetica", 11)
    y = 730
    for line in content.splitlines() or [""]:
        if y < 72:
            pdf.showPage()
            pdf.setFont("Helvetica", 11)
            y = 760
        pdf.drawString(72, y, line[:100])
        y -= 16
    pdf.save()
    return buffer.getvalue()


def get_workspace_payload(context: RequestContext, bootstrap: bool = False) -> dict[str, Any]:
    data_store = get_runtime_store(context)
    if bootstrap:
        bootstrapped = supabase_service.ensure_workspace_for_user(
            context.user_id,
            context.email,
            context.access_token,
        )
        if bootstrapped and isinstance(bootstrapped.get("workspace"), dict):
            workspace = data_store.get_workspace(bootstrapped["workspace"]["id"])
            if workspace is None:
                raise RuntimeStoreError("Workspace bootstrap succeeded but the workspace could not be reloaded.")
            bootstrapped["workspace"] = workspace
            bootstrapped["source"] = context.source
            return bootstrapped

    resolved = supabase_service.resolve_workspace_for_user(
        context.user_id,
        requested_workspace_id=context.workspace_id,
        access_token=context.access_token,
    )
    if resolved and isinstance(resolved.get("workspace"), dict):
        return {
            "workspace": resolved["workspace"],
            "role": resolved.get("role", "admin"),
            "created": False,
            "source": context.source,
        }

    recovered = supabase_service.ensure_workspace_for_user(
        context.user_id,
        context.email,
        context.access_token,
    )
    if recovered and isinstance(recovered.get("workspace"), dict):
        workspace = data_store.get_workspace(recovered["workspace"]["id"])
        if workspace is None:
            raise RuntimeStoreError("Workspace recovery succeeded but the workspace could not be reloaded.")
        return {
            "workspace": workspace,
            "role": recovered.get("role", "admin"),
            "created": bool(recovered.get("created")),
            "source": context.source,
        }

    raise RuntimeStoreError("A workspace could not be resolved for the authenticated user.")


def parse_tags(raw_tags: str | None) -> list[str]:
    if not raw_tags:
        return []
    return [tag.strip() for tag in raw_tags.split(",") if tag.strip()]


def sanitize_storage_filename(filename: str) -> str:
    candidate = Path(filename).name.strip().replace(" ", "-")
    return candidate or "upload.bin"


def resolve_content_type(filename: str, provided_content_type: str | None) -> str:
    if provided_content_type and provided_content_type != "application/octet-stream":
        return provided_content_type
    inferred, _ = mimetypes.guess_type(filename)
    return inferred or "application/octet-stream"


def resolve_storage_path_from_payload(payload: ArtifactRequest | dict[str, Any]) -> str | None:
    if isinstance(payload, ArtifactRequest):
        if payload.storage_path:
            return payload.storage_path
        metadata = payload.metadata
    else:
        if isinstance(payload.get("storage_path"), str) and payload["storage_path"].strip():
            return payload["storage_path"]
        metadata = payload.get("metadata")

    if isinstance(metadata, dict):
        storage_path = metadata.get("storage_path")
        if isinstance(storage_path, str) and storage_path.strip():
            return storage_path
    return None


async def execute_run(
    data_store,
    payload: RunRequest,
    run_id: str,
    workspace_id: str,
    access_token: str | None = None,
) -> dict[str, Any]:
    context_artifacts = resolve_context_artifacts(data_store, workspace_id, payload.context_ids)
    effective_prompt = merge_prompt_with_context(payload.prompt, context_artifacts)
    data_store.add_run_step(
        workspace_id,
        run_id,
        step_name="prepare",
        tool_used="system",
        status="completed",
        input_payload=payload.prompt,
        output_payload="Run accepted",
    )
    if context_artifacts:
        data_store.add_run_step(
            workspace_id,
            run_id,
            step_name="context",
            tool_used="artifact-library",
            status="completed",
            input_payload={"contextIds": payload.context_ids},
            output_payload={
                "artifactIds": [artifact["id"] for artifact in context_artifacts],
                "count": len(context_artifacts),
            },
        )
    return await run_studio_workflow(
        data_store=data_store,
        studio=payload.studio,
        run_id=run_id,
        workspace_id=workspace_id,
        prompt=effective_prompt,
        model=payload.model,
        options=payload.options,
        access_token=access_token,
    )


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "beyond-chat-backend", "status": "ok"}


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "message": "Backend is reachable"}


@app.get("/api/status/providers")
def provider_status() -> dict[str, Any]:
    return {"providers": provider_statuses()}


@app.post("/api/auth/bootstrap")
def bootstrap_auth(context: RequestContext = Depends(require_request_context)) -> dict[str, Any]:
    return api_success(get_workspace_payload(context, bootstrap=True))


@app.get("/api/workspace")
def workspace(context: RequestContext = Depends(require_request_context)) -> dict[str, Any]:
    workspace_payload = get_workspace_payload(context, bootstrap=False)
    return {
        "workspace": workspace_payload["workspace"],
        "authSource": context.source,
    }


@app.get("/api/reminders")
def reminders(context: RequestContext = Depends(require_request_context)) -> dict[str, Any]:
    data_store = get_runtime_store(context)
    return {"items": data_store.list_reminders(context.workspace_id)}


@app.post("/api/openrouter/chat", response_model=OpenRouterChatResponse)
async def openrouter_chat(
    payload: OpenRouterChatRequest,
    _context: RequestContext = Depends(require_request_context),
) -> OpenRouterChatResponse:
    try:
        content = await call_openrouter(
            model=payload.model,
            messages=[message.model_dump() for message in payload.messages],
            temperature=payload.temperature,
            max_tokens=payload.max_tokens,
        )
    except RuntimeError as exc:
        if str(exc) == OPENROUTER_NOT_CONFIGURED:
            raise HTTPException(
                status_code=503,
                detail="Missing OPENROUTER_API_KEY. Add it to backend/.env or runtime environment.",
            ) from exc
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return OpenRouterChatResponse(model=payload.model, content=content)


@app.get("/api/chat/threads")
def list_threads(context: RequestContext = Depends(require_request_context)) -> dict[str, Any]:
    data_store = get_runtime_store(context)
    return {
        "collections": data_store.list_collections(context.workspace_id),
        "threads": data_store.list_threads(context.workspace_id),
    }


@app.post("/api/chat/threads")
def create_thread(
    payload: CreateThreadRequest,
    context: RequestContext = Depends(require_request_context),
) -> dict[str, Any]:
    data_store = get_runtime_store(context)
    thread = data_store.create_thread(
        context.workspace_id,
        title=payload.title,
        collection_id=payload.collection_id,
        collection_type=payload.collection_type,
        studio=payload.studio,
        model=payload.model,
        prompt=payload.prompt,
    )
    return {"thread": thread}


@app.get("/api/chat/threads/{thread_id}")
def get_thread(thread_id: str, context: RequestContext = Depends(require_request_context)) -> dict[str, Any]:
    data_store = get_runtime_store(context)
    thread = data_store.get_thread(context.workspace_id, thread_id)
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    return {"thread": thread}


@app.post("/api/chat/threads/{thread_id}/messages")
async def add_message(
    thread_id: str,
    payload: CreateMessageRequest,
    context: RequestContext = Depends(require_request_context),
) -> dict[str, Any]:
    data_store = get_runtime_store(context)
    thread = data_store.get_thread(context.workspace_id, thread_id)
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")

    user_message = data_store.add_message(context.workspace_id, thread_id, "user", payload.content)
    assistant_content = (
        "OpenRouter is not configured yet. Add `OPENROUTER_API_KEY` to enable live chat responses."
    )

    if settings.openrouter_api_key:
        messages = [
            {"role": message["role"], "content": message["content"]}
            for message in thread["messages"] + [user_message]
        ]
        try:
            assistant_content = await call_openrouter(
                model=payload.model,
                messages=messages,
                temperature=0.4,
                max_tokens=700,
            )
        except RuntimeError as exc:
            assistant_content = str(exc)

    assistant_message = data_store.add_message(context.workspace_id, thread_id, "assistant", assistant_content)
    return {"userMessage": user_message, "assistantMessage": assistant_message}


@app.post("/api/chat/threads/{thread_id}/messages/stream")
async def add_message_stream(
    thread_id: str,
    payload: CreateMessageRequest,
    context: RequestContext = Depends(require_request_context),
) -> StreamingResponse:
    data_store = get_runtime_store(context)
    thread = data_store.get_thread(context.workspace_id, thread_id)
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")

    user_message = data_store.add_message(context.workspace_id, thread_id, "user", payload.content)

    def sse(event: str, data: dict[str, Any]) -> str:
        return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=True)}\n\n"

    async def event_stream():
        assistant_content = ""

        if settings.openrouter_api_key:
            messages = [
                {"role": message["role"], "content": message["content"]}
                for message in thread["messages"] + [user_message]
            ]
            try:
                async for chunk in call_openrouter_stream(
                    model=payload.model,
                    messages=messages,
                    temperature=0.4,
                    max_tokens=700,
                ):
                    assistant_content += chunk
                    yield sse("delta", {"content": chunk})
            except RuntimeError as exc:
                assistant_content = str(exc)
                yield sse("delta", {"content": assistant_content})
            except Exception as exc:
                assistant_content = f"Streaming failed: {exc}"
                yield sse("delta", {"content": assistant_content})
        else:
            assistant_content = "OpenRouter is not configured yet. Add `OPENROUTER_API_KEY` to enable live chat responses."
            yield sse("delta", {"content": assistant_content})

        assistant_message = data_store.add_message(context.workspace_id, thread_id, "assistant", assistant_content)
        yield sse("done", {"userMessage": user_message, "assistantMessage": assistant_message})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/chat/compare")
@app.post("/api/compare")
async def compare(
    payload: CompareRequest,
    context: RequestContext = Depends(require_request_context),
) -> dict[str, Any]:
    data_store = get_runtime_store(context)
    try:
        context_artifacts = resolve_context_artifacts(data_store, context.workspace_id, payload.context_ids)
        effective_prompt = merge_prompt_with_context(payload.prompt, context_artifacts)
        results = await compare_models(effective_prompt, payload.models)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"results": results}


@app.post("/api/runs")
@app.post("/api/run")
async def create_run(
    payload: RunRequest,
    context: RequestContext = Depends(require_request_context),
) -> dict[str, Any]:
    if payload.studio not in SUPPORTED_STUDIOS:
        raise HTTPException(status_code=400, detail=f"Unsupported studio '{payload.studio}'.")
    data_store = get_runtime_store(context)
    try:
        resolve_context_artifacts(data_store, context.workspace_id, payload.context_ids)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    run = data_store.create_run(
        context.workspace_id,
        studio=payload.studio,
        title=payload.title,
        prompt=payload.prompt,
        model=payload.model,
        options=payload.options,
    )

    try:
        output = await execute_run(
            data_store,
            payload,
            run["id"],
            context.workspace_id,
            context.access_token,
        )
        completed = data_store.complete_run(
            context.workspace_id,
            run["id"],
            status="completed",
            output=output,
        )
    except Exception as exc:
        data_store.add_run_step(
            context.workspace_id,
            run["id"],
            step_name="failed",
            tool_used="system",
            status="failed",
            input_payload=payload.prompt,
            output_payload={"error": str(exc)},
        )
        completed = data_store.complete_run(
            context.workspace_id,
            run["id"],
            status="failed",
            error=str(exc),
            output={"error": str(exc)},
        )
    return {"run": completed}


@app.get("/api/runs/{run_id}")
def get_run(run_id: str, context: RequestContext = Depends(require_request_context)) -> dict[str, Any]:
    data_store = get_runtime_store(context)
    run = data_store.get_run(context.workspace_id, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"run": run}


@app.get("/api/runs/{run_id}/steps")
def get_run_steps(run_id: str, context: RequestContext = Depends(require_request_context)) -> dict[str, Any]:
    data_store = get_runtime_store(context)
    run = data_store.get_run(context.workspace_id, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"steps": run["steps"]}


@app.post("/api/artifact")
@app.post("/api/artifacts")
def create_artifact(
    payload: ArtifactRequest,
    context: RequestContext = Depends(require_request_context),
) -> dict[str, Any]:
    data_store = get_runtime_store(context)
    artifact = data_store.upsert_artifact(
        context.workspace_id,
        title=payload.title,
        artifact_type=payload.artifact_type,
        studio=payload.studio,
        content=payload.content,
        summary=payload.summary,
        content_format=payload.content_format,
        metadata=payload.metadata,
        tags=payload.tags,
        preview_image=payload.preview_image,
        content_json=payload.content_json,
        source_run_id=payload.source_run_id,
        storage_path=resolve_storage_path_from_payload(payload),
    )
    return api_success(artifact)


@app.post("/api/runs/{run_id}/artifact")
def save_run_as_artifact(
    run_id: str,
    payload: SaveRunArtifactRequest,
    context: RequestContext = Depends(require_request_context),
) -> dict[str, Any]:
    data_store = get_runtime_store(context)
    run = data_store.get_run(context.workspace_id, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")

    artifact_payload = build_run_artifact_payload(
        run=run,
        title=payload.title,
        artifact_type=payload.artifact_type,
        summary=payload.summary,
        tags=payload.tags,
        content_format=payload.content_format,
    )
    if artifact_payload is None:
        raise HTTPException(status_code=400, detail="Run output cannot be saved as an artifact.")

    artifact = data_store.upsert_artifact(
        context.workspace_id,
        title=artifact_payload["title"],
        artifact_type=artifact_payload["type"],
        studio=artifact_payload["studio"],
        content=artifact_payload["content"],
        summary=artifact_payload["summary"],
        content_format=artifact_payload["content_format"],
        metadata=artifact_payload["metadata"],
        tags=artifact_payload["tags"],
        preview_image=artifact_payload["preview_image"],
        content_json=artifact_payload["content_json"],
        source_run_id=run["id"],
        storage_path=resolve_storage_path_from_payload(artifact_payload),
    )
    return api_success(artifact)


@app.get("/api/artifact/search")
def search_artifacts(
    q: str | None = Query(default=None),
    studio: str | None = Query(default=None),
    artifact_type: str | None = Query(default=None, alias="type"),
    tags: str | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    limit: int = Query(default=24, ge=1, le=100),
    context: RequestContext = Depends(require_request_context),
) -> dict[str, Any]:
    data_store = get_runtime_store(context)
    items = data_store.list_artifacts(
        context.workspace_id,
        query=q,
        studio=studio,
        artifact_type=artifact_type,
        tags=parse_tags(tags),
        date_from=date_from,
        date_to=date_to,
        limit=limit,
    )
    return api_success(items)


@app.get("/api/artifacts")
def list_artifacts(
    q: str | None = Query(default=None),
    studio: str | None = Query(default=None),
    artifact_type: str | None = Query(default=None, alias="type"),
    tags: str | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    limit: int = Query(default=24, ge=1, le=100),
    context: RequestContext = Depends(require_request_context),
) -> dict[str, Any]:
    data_store = get_runtime_store(context)
    items = data_store.list_artifacts(
        context.workspace_id,
        query=q,
        studio=studio,
        artifact_type=artifact_type,
        tags=parse_tags(tags),
        date_from=date_from,
        date_to=date_to,
        limit=limit,
    )
    return {"items": items}


@app.get("/api/artifact/{artifact_id}")
@app.get("/api/artifacts/{artifact_id}")
def get_artifact(artifact_id: str, context: RequestContext = Depends(require_request_context)) -> dict[str, Any]:
    data_store = get_runtime_store(context)
    artifact = data_store.get_artifact(context.workspace_id, artifact_id)
    if artifact is None:
        raise HTTPException(status_code=404, detail="Artifact not found")
    return api_success(artifact)


@app.post("/api/artifact/{artifact_id}/export")
@app.post("/api/artifacts/{artifact_id}/export")
def export_artifact(
    artifact_id: str,
    payload: ExportRequest,
    context: RequestContext = Depends(require_request_context),
) -> Response:
    data_store = get_runtime_store(context)
    artifact = data_store.get_artifact(context.workspace_id, artifact_id)
    if artifact is None:
        raise HTTPException(status_code=404, detail="Artifact not found")

    if payload.format == "markdown":
        return Response(
            content=artifact["content"],
            media_type="text/markdown",
            headers={"Content-Disposition": f'inline; filename="{artifact["title"]}.md"'},
        )

    pdf_bytes = build_pdf(artifact["title"], artifact["content"])
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{artifact["title"]}.pdf"'},
    )


@app.post("/api/export")
def export_artifact_legacy(
    payload: LegacyExportRequest,
    context: RequestContext = Depends(require_request_context),
) -> Response:
    return export_artifact(payload.artifact_id, ExportRequest(format=payload.format), context)


@app.post("/api/storage/artifacts/upload")
async def upload_artifact_file(
    file: UploadFile = File(...),
    artifact_id: str | None = Query(default=None),
    context: RequestContext = Depends(require_request_context),
) -> dict[str, Any]:
    if not supabase_service.is_configured:
        raise HTTPException(status_code=503, detail="Supabase storage is not configured.")

    if artifact_id:
        data_store = get_runtime_store(context)
        artifact = data_store.get_artifact(context.workspace_id, artifact_id)
        if artifact is None:
            raise HTTPException(status_code=404, detail="Artifact not found")
        target_artifact_id = artifact_id
    else:
        target_artifact_id = str(uuid4())

    payload = await file.read()
    upload = supabase_service.upload_artifact_file(
        workspace_id=context.workspace_id,
        artifact_id=target_artifact_id,
        filename=sanitize_storage_filename(file.filename or "upload.bin"),
        content_type=resolve_content_type(
            file.filename or "upload.bin",
            file.content_type,
        ),
        file_bytes=payload,
        access_token=context.access_token,
    )
    if upload is None:
        raise HTTPException(status_code=503, detail="Supabase storage is not configured.")

    return api_success(
        {
            "artifactId": target_artifact_id,
            "bucket": upload["bucket"],
            "path": upload["path"],
            "signedUrl": upload["signed_url"],
        }
    )


@app.post("/api/storage/artifacts/signed-url")
def create_storage_signed_url(
    payload: SignedUrlRequest,
    context: RequestContext = Depends(require_request_context),
) -> dict[str, Any]:
    workspace_prefix = f"{context.workspace_id}/"
    if not payload.path.startswith(workspace_prefix):
        raise HTTPException(status_code=403, detail="Requested storage path is outside the active workspace.")

    signed = supabase_service.create_signed_artifact_url(
        payload.path,
        payload.expires_in,
        context.access_token,
    )
    if signed is None:
        raise HTTPException(status_code=503, detail="Supabase storage is not configured.")

    return api_success(
        {
            "bucket": signed["bucket"],
            "path": signed["path"],
            "signedUrl": signed["signed_url"],
            "expiresIn": signed["expires_in"],
        }
    )


@app.post("/api/integrations/google-calendar/connect-start")
def google_calendar_connect_start(
    _context: RequestContext = Depends(require_request_context),
) -> dict[str, Any]:
    providers = provider_statuses()
    calendar = providers["googleCalendar"]
    if calendar["status"] != "disconnected":
        return {"status": calendar["status"], "url": None}
    return {"status": "disconnected", "url": build_google_connect_url()}


@app.get("/api/integrations/google-calendar/status")
def google_calendar_status(
    _context: RequestContext = Depends(require_request_context),
) -> dict[str, Any]:
    return {"provider": provider_statuses()["googleCalendar"]}


@app.get("/api/integrations/google-calendar/events")
def google_calendar_agenda(
    _context: RequestContext = Depends(require_request_context),
) -> dict[str, Any]:
    return {"items": google_calendar_events()}


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend_app(full_path: str):
    if full_path.startswith("api"):
        raise HTTPException(status_code=404, detail="Not found")

    candidate = (FRONTEND_DIST_DIR / full_path).resolve()
    if FRONTEND_DIST_DIR.exists() and candidate.is_file() and FRONTEND_DIST_DIR in candidate.parents:
        return FileResponse(candidate)

    index_path = FRONTEND_DIST_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)

    raise HTTPException(status_code=404, detail="Frontend build output is not available.")

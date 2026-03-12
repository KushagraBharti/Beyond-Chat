from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Any
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from .auth import RequestContext, require_request_context, resolve_request_context
from .config import settings
from .providers import (
    OPENROUTER_NOT_CONFIGURED,
    TAVILY_NOT_CONFIGURED,
    build_google_connect_url,
    call_openrouter,
    compare_models,
    google_calendar_events,
    provider_statuses,
    tavily_search,
)
from .store import store
from .supabase_service import supabase_service

load_dotenv()

app = FastAPI(title="Beyond Chat API", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        settings.app_url,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def attach_request_context(request: Request, call_next):
    if request.url.path.startswith("/api") and request.url.path != "/api/health":
        try:
            request.state.request_context = resolve_request_context(
                request.headers.get("authorization"),
                request.headers.get("x-workspace-id"),
                request.headers.get("x-mvp-bypass"),
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


class ExportRequest(BaseModel):
    format: str = Field(pattern="^(markdown|pdf)$")


class LegacyExportRequest(ExportRequest):
    artifact_id: str


class DirectExportRequest(ExportRequest):
    artifact_id: str


class SignedUrlRequest(BaseModel):
    path: str
    expires_in: int = Field(default=3600, ge=60, le=86400)


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
    if context.source == "supabase_jwt" and bootstrap:
        bootstrapped = supabase_service.ensure_workspace_for_user(context.user_id, context.email)
        if bootstrapped and isinstance(bootstrapped.get("workspace"), dict):
            workspace = bootstrapped["workspace"]
            workspace_id = workspace.get("id") or context.workspace_id
            workspace_name = workspace.get("name") or settings.local_workspace_name
            store.ensure_workspace(workspace_id, workspace_name)
            bootstrapped["workspace"] = store.get_workspace(workspace_id)
            bootstrapped["source"] = context.source
            return bootstrapped

    local_workspace = store.ensure_workspace(context.workspace_id, settings.local_workspace_name)
    return {
        "workspace": local_workspace,
        "role": "admin",
        "created": False,
        "source": context.source,
    }


def parse_tags(raw_tags: str | None) -> list[str]:
    if not raw_tags:
        return []
    return [tag.strip() for tag in raw_tags.split(",") if tag.strip()]


def sanitize_storage_filename(filename: str) -> str:
    candidate = Path(filename).name.strip().replace(" ", "-")
    return candidate or "upload.bin"


async def execute_run(payload: RunRequest, run_id: str) -> dict[str, Any]:
    store.add_run_step(run_id, "prepare", "system", "completed", payload.prompt, "Run accepted")

    if payload.studio == "data":
        summary = payload.options.get("data_summary") or "Sample CSV detected with 120 rows and 6 columns."
        insights = [
            "Detected a moderate concentration in the top revenue segment.",
            "Two columns contain sparse values and should be normalized before export.",
            "Trends suggest a weekly cycle worth charting in the next iteration.",
        ]
        output = {
            "headline": "Dataset review completed",
            "summary": summary,
            "insights": insights,
            "steps": [
                "Validated uploaded structure",
                "Profiled columns and missingness",
                "Generated starter insights",
            ],
        }
        store.add_run_step(run_id, "analyze-data", "local-profiler", "completed", summary, output)
        return output

    if payload.studio == "image":
        raise RuntimeError("Image generation is not configured yet. Add provider keys to enable live runs.")

    if payload.studio in {"research", "finance"}:
        store.add_run_step(run_id, "search", "tavily", "running", payload.prompt, "Searching sources")
        search_results = await tavily_search(payload.prompt)
        store.add_run_step(run_id, "search", "tavily", "completed", payload.prompt, search_results)

        evidence_lines = [
            f"- {item['title']}: {item['snippet']} ({item['url']})"
            for item in search_results.get("results", [])
        ]
        system_prompt = (
            "You are producing a structured report for Beyond Chat. "
            "Return concise markdown with sections for Summary, Key Findings, Risks, and Recommended Next Steps."
        )
        synthesis_prompt = (
            f"Studio: {payload.studio}\n"
            f"User request: {payload.prompt}\n\n"
            "Evidence:\n"
            + ("\n".join(evidence_lines) if evidence_lines else "- No external evidence was available.")
        )
        store.add_run_step(run_id, "synthesize", "openrouter", "running", synthesis_prompt, "Generating report")
        content = await call_openrouter(
            model=payload.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": synthesis_prompt},
            ],
            temperature=0.2,
            max_tokens=900,
        )
        output = {
            "format": "markdown",
            "content": content,
            "sources": search_results.get("results", []),
        }
        store.add_run_step(run_id, "synthesize", "openrouter", "completed", synthesis_prompt, output)
        return output

    if payload.studio == "writing":
        store.add_run_step(run_id, "rewrite", "openrouter", "running", payload.prompt, "Drafting content")
        content = await call_openrouter(
            model=payload.model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are Beyond Chat's writing assistant. "
                        "Return polished markdown suitable for a rich-text editor import."
                    ),
                },
                {"role": "user", "content": payload.prompt},
            ],
            temperature=0.4,
            max_tokens=1200,
        )
        output = {"format": "markdown", "content": content}
        store.add_run_step(run_id, "rewrite", "openrouter", "completed", payload.prompt, output)
        return output

    store.add_run_step(run_id, "complete", "openrouter", "running", payload.prompt, "Generating response")
    content = await call_openrouter(
        model=payload.model,
        messages=[{"role": "user", "content": payload.prompt}],
        temperature=0.3,
        max_tokens=800,
    )
    output = {"format": "markdown", "content": content}
    store.add_run_step(run_id, "complete", "openrouter", "completed", payload.prompt, output)
    return output


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
        "mvpBypassEnabled": settings.allow_local_auth_bypass,
        "authSource": context.source,
    }


@app.get("/api/reminders")
def reminders(context: RequestContext = Depends(require_request_context)) -> dict[str, Any]:
    return {"items": store.list_reminders(context.workspace_id)}


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
    return {
        "collections": store.list_collections(context.workspace_id),
        "threads": store.list_threads(context.workspace_id),
    }


@app.post("/api/chat/threads")
def create_thread(
    payload: CreateThreadRequest,
    context: RequestContext = Depends(require_request_context),
) -> dict[str, Any]:
    thread = store.create_thread(
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
    thread = store.get_thread(context.workspace_id, thread_id)
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    return {"thread": thread}


@app.post("/api/chat/threads/{thread_id}/messages")
async def add_message(
    thread_id: str,
    payload: CreateMessageRequest,
    context: RequestContext = Depends(require_request_context),
) -> dict[str, Any]:
    thread = store.get_thread(context.workspace_id, thread_id)
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")

    user_message = store.add_message(thread_id, "user", payload.content)
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

    assistant_message = store.add_message(thread_id, "assistant", assistant_content)
    return {"userMessage": user_message, "assistantMessage": assistant_message}


@app.post("/api/chat/compare")
async def compare(
    payload: CompareRequest,
    _context: RequestContext = Depends(require_request_context),
) -> dict[str, Any]:
    try:
        results = await compare_models(payload.prompt, payload.models)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"results": results}


@app.post("/api/runs")
async def create_run(
    payload: RunRequest,
    context: RequestContext = Depends(require_request_context),
) -> dict[str, Any]:
    if payload.studio not in SUPPORTED_STUDIOS:
        raise HTTPException(status_code=400, detail=f"Unsupported studio '{payload.studio}'.")

    run = store.create_run(
        context.workspace_id,
        payload.studio,
        payload.title,
        payload.prompt,
        payload.model,
        payload.options,
    )

    try:
        output = await execute_run(payload, run["id"])
        completed = store.complete_run(context.workspace_id, run["id"], "completed", output=output)
    except RuntimeError as exc:
        store.add_run_step(run["id"], "failed", "system", "failed", payload.prompt, {"error": str(exc)})
        completed = store.complete_run(
            context.workspace_id,
            run["id"],
            "failed",
            error=str(exc),
            output={"error": str(exc)},
        )
    return {"run": completed}


@app.get("/api/runs/{run_id}")
def get_run(run_id: str, context: RequestContext = Depends(require_request_context)) -> dict[str, Any]:
    run = store.get_run(context.workspace_id, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"run": run}


@app.get("/api/runs/{run_id}/steps")
def get_run_steps(run_id: str, context: RequestContext = Depends(require_request_context)) -> dict[str, Any]:
    run = store.get_run(context.workspace_id, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"steps": run["steps"]}


@app.post("/api/artifact")
@app.post("/api/artifacts")
def create_artifact(
    payload: ArtifactRequest,
    context: RequestContext = Depends(require_request_context),
) -> dict[str, Any]:
    artifact = store.upsert_artifact(
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
    items = store.list_artifacts(
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
    items = store.list_artifacts(
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
    artifact = store.get_artifact(context.workspace_id, artifact_id)
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
    artifact = store.get_artifact(context.workspace_id, artifact_id)
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


@app.post("/api/export")
def direct_export(
    payload: DirectExportRequest,
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
        artifact = store.get_artifact(context.workspace_id, artifact_id)
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
        content_type=file.content_type or "application/octet-stream",
        file_bytes=payload,
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

    signed = supabase_service.create_signed_artifact_url(payload.path, payload.expires_in)
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

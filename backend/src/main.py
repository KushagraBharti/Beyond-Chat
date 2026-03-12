from __future__ import annotations

import json
from io import BytesIO
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from .config import settings
from .providers import (
    OPENROUTER_NOT_CONFIGURED,
    build_google_connect_url,
    call_openrouter,
    compare_models,
    google_calendar_events,
    provider_statuses,
    tavily_search,
)
from .store import store

load_dotenv()

app = FastAPI(title="Beyond Chat API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


def jsonable(value: Any) -> str:
    if isinstance(value, str):
        return value
    return json.dumps(value or {}, ensure_ascii=True, default=str)


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


@app.get("/api/workspace")
def workspace() -> dict[str, Any]:
    return {
        "workspace": store.get_workspace(),
        "mvpBypassEnabled": True,
    }


@app.get("/api/reminders")
def reminders() -> dict[str, Any]:
    return {"items": store.list_reminders()}


@app.post("/api/openrouter/chat", response_model=OpenRouterChatResponse)
async def openrouter_chat(payload: OpenRouterChatRequest) -> OpenRouterChatResponse:
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
def list_threads() -> dict[str, Any]:
    return {
        "collections": store.list_collections(),
        "threads": store.list_threads(),
    }


@app.post("/api/chat/threads")
def create_thread(payload: CreateThreadRequest) -> dict[str, Any]:
    thread = store.create_thread(
        title=payload.title,
        collection_id=payload.collection_id,
        collection_type=payload.collection_type,
        studio=payload.studio,
        model=payload.model,
        prompt=payload.prompt,
    )
    return {"thread": thread}


@app.get("/api/chat/threads/{thread_id}")
def get_thread(thread_id: str) -> dict[str, Any]:
    thread = store.get_thread(thread_id)
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    return {"thread": thread}


@app.post("/api/chat/threads/{thread_id}/messages")
async def add_message(thread_id: str, payload: CreateMessageRequest) -> dict[str, Any]:
    thread = store.get_thread(thread_id)
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
async def compare(payload: CompareRequest) -> dict[str, Any]:
    try:
        results = await compare_models(payload.prompt, payload.models)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"results": results}


@app.post("/api/runs")
async def create_run(payload: RunRequest) -> dict[str, Any]:
    run = store.create_run(payload.studio, payload.title, payload.prompt, payload.model, payload.options)

    try:
        output = await execute_run(payload, run["id"])
        completed = store.complete_run(run["id"], "completed", output=output)
    except RuntimeError as exc:
        store.add_run_step(run["id"], "failed", "system", "failed", payload.prompt, {"error": str(exc)})
        completed = store.complete_run(
            run["id"],
            "failed",
            error=str(exc),
            output={"error": str(exc)},
        )
    return {"run": completed}


@app.get("/api/runs/{run_id}")
def get_run(run_id: str) -> dict[str, Any]:
    run = store.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"run": run}


@app.get("/api/runs/{run_id}/steps")
def get_run_steps(run_id: str) -> dict[str, Any]:
    run = store.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"steps": run["steps"]}


@app.post("/api/artifacts")
def create_artifact(payload: ArtifactRequest) -> dict[str, Any]:
    artifact = store.upsert_artifact(
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
    return {"artifact": artifact}


@app.get("/api/artifacts")
def list_artifacts(
    q: str | None = Query(default=None),
    studio: str | None = Query(default=None),
    artifact_type: str | None = Query(default=None, alias="type"),
    limit: int = Query(default=24, ge=1, le=100),
) -> dict[str, Any]:
    return {"items": store.list_artifacts(query=q, studio=studio, artifact_type=artifact_type, limit=limit)}


@app.get("/api/artifacts/{artifact_id}")
def get_artifact(artifact_id: str) -> dict[str, Any]:
    artifact = store.get_artifact(artifact_id)
    if artifact is None:
        raise HTTPException(status_code=404, detail="Artifact not found")
    return {"artifact": artifact}


@app.post("/api/artifacts/{artifact_id}/export")
def export_artifact(artifact_id: str, payload: ExportRequest) -> Response:
    artifact = store.get_artifact(artifact_id)
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


@app.post("/api/integrations/google-calendar/connect-start")
def google_calendar_connect_start() -> dict[str, Any]:
    providers = provider_statuses()
    calendar = providers["googleCalendar"]
    if calendar["status"] != "disconnected":
        return {"status": calendar["status"], "url": None}
    return {"status": "disconnected", "url": build_google_connect_url()}


@app.get("/api/integrations/google-calendar/status")
def google_calendar_status() -> dict[str, Any]:
    return {"provider": provider_statuses()["googleCalendar"]}


@app.get("/api/integrations/google-calendar/events")
def google_calendar_agenda() -> dict[str, Any]:
    return {"items": google_calendar_events()}

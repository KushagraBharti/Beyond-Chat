import json
import os
from urllib import error, request

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from supabase import Client, create_client
except Exception:
    Client = None  # type: ignore[assignment]
    create_client = None  # type: ignore[assignment]

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client | None = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and create_client is not None:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

app = FastAPI(title="Beyond Chat API", version="0.1.0")

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


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "beyond-chat-backend", "status": "ok"}


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "message": "Backend is reachable"}


class ChatMessage(BaseModel):
    role: str
    content: str


class OpenRouterChatRequest(BaseModel):
    model: str = Field(default="openai/gpt-4o-mini")
    messages: list[ChatMessage]
    temperature: float = Field(default=0.2, ge=0.0, le=2.0)
    max_tokens: int = Field(default=400, ge=1, le=4096)


class OpenRouterChatResponse(BaseModel):
    model: str
    content: str


def _extract_assistant_content(payload: dict) -> str:
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        return ""

    first_choice = choices[0]
    if not isinstance(first_choice, dict):
        return ""

    message = first_choice.get("message")
    if not isinstance(message, dict):
        return ""

    content = message.get("content")
    return content if isinstance(content, str) else ""


@app.post("/api/openrouter/chat", response_model=OpenRouterChatResponse)
def openrouter_chat(payload: OpenRouterChatRequest) -> OpenRouterChatResponse:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Missing OPENROUTER_API_KEY. Add it to backend/.env or runtime environment.",
        )

    referer = os.getenv("OPENROUTER_HTTP_REFERER", "http://127.0.0.1:5173")
    app_title = os.getenv("OPENROUTER_APP_TITLE", "Beyond Chat MVP")
    timeout_seconds = float(os.getenv("OPENROUTER_TIMEOUT_SECONDS", "45"))

    request_payload = {
        "model": payload.model,
        "messages": [message.model_dump() for message in payload.messages],
        "temperature": payload.temperature,
        "max_tokens": payload.max_tokens,
    }

    openrouter_request = request.Request(
        url="https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(request_payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": referer,
            "X-Title": app_title,
        },
        method="POST",
    )

    try:
        with request.urlopen(openrouter_request, timeout=timeout_seconds) as response:
            response_payload = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        raw_error = exc.read().decode("utf-8")
        raise HTTPException(status_code=exc.code, detail=f"OpenRouter request failed: {raw_error}") from exc
    except error.URLError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach OpenRouter: {exc.reason}") from exc

    return OpenRouterChatResponse(
        model=str(response_payload.get("model", payload.model)),
        content=_extract_assistant_content(response_payload),
    )


@app.get("/api/supabase-check")
def supabase_check() -> dict:
    if supabase is None:
        return {
            "ok": False,
            "error": "Supabase service role credentials are not configured.",
            "hint": "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env",
        }

    try:
        resp = supabase.auth.admin.list_users(page=1, per_page=1)

        if isinstance(resp, dict):
            return {"ok": True, "type": "dict", "keys": list(resp.keys())}
        if isinstance(resp, list):
            return {"ok": True, "type": "list", "length": len(resp)}

        return {"ok": True, "type": str(type(resp)), "preview": str(resp)[:200]}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from .config import settings

OPENROUTER_NOT_CONFIGURED = "OPENROUTER_NOT_CONFIGURED"
TAVILY_NOT_CONFIGURED = "TAVILY_NOT_CONFIGURED"


async def call_openrouter(
    model: str,
    messages: list[dict[str, str]],
    temperature: float = 0.4,
    max_tokens: int = 900,
) -> str:
    if not settings.openrouter_api_key:
        raise RuntimeError(OPENROUTER_NOT_CONFIGURED)

    async with httpx.AsyncClient(timeout=settings.openrouter_timeout_seconds) as client:
        response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.openrouter_api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": settings.openrouter_http_referer,
                "X-Title": settings.app_title,
            },
            json={
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
        )
        response.raise_for_status()
        payload = response.json()

    choices = payload.get("choices") or []
    if not choices:
        return ""
    first_choice = choices[0]
    if not isinstance(first_choice, dict):
        return ""
    message = first_choice.get("message") or {}
    if not isinstance(message, dict):
        return ""
    content = message.get("content", "")
    return content if isinstance(content, str) else ""


async def compare_models(prompt: str, models: list[str]) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for model in models:
        started = datetime.now(timezone.utc)
        try:
            content = await call_openrouter(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are Beyond Chat compare mode. Return a concise but complete answer.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=1000,
            )
            latency_ms = int((datetime.now(timezone.utc) - started).total_seconds() * 1000)
            results.append(
                {
                    "model": model,
                    "status": "completed",
                    "content": content,
                    "latencyMs": latency_ms,
                    "error": None,
                }
            )
        except RuntimeError as exc:
            if str(exc) == OPENROUTER_NOT_CONFIGURED:
                results.append(
                    {
                        "model": model,
                        "status": "not_configured",
                        "content": "",
                        "latencyMs": 0,
                        "error": "OpenRouter is not configured.",
                    }
                )
                continue
            raise
        except Exception as exc:
            latency_ms = int((datetime.now(timezone.utc) - started).total_seconds() * 1000)
            results.append(
                {
                    "model": model,
                    "status": "failed",
                    "content": "",
                    "latencyMs": latency_ms,
                    "error": str(exc),
                }
            )
    return results


async def tavily_search(query: str) -> dict[str, Any]:
    if not settings.tavily_api_key:
        raise RuntimeError(TAVILY_NOT_CONFIGURED)

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            "https://api.tavily.com/search",
            json={
                "api_key": settings.tavily_api_key,
                "query": query,
                "search_depth": "advanced",
                "include_answer": True,
                "max_results": 5,
                "include_images": False,
            },
        )
        response.raise_for_status()
        payload = response.json()

    results = []
    for item in payload.get("results", []):
        if not isinstance(item, dict):
            continue
        results.append(
            {
                "title": item.get("title", "Untitled source"),
                "url": item.get("url", ""),
                "snippet": item.get("content", ""),
            }
        )
    return {
        "answer": payload.get("answer", ""),
        "results": results,
    }


def provider_statuses() -> dict[str, Any]:
    google_ready = bool(settings.google_client_id and settings.google_client_secret)
    return {
        "openrouter": {
            "status": "connected" if settings.openrouter_api_key else "not_configured",
            "label": "OpenRouter",
            "details": "LLM and compare provider",
        },
        "tavily": {
            "status": "connected" if settings.tavily_api_key else "not_configured",
            "label": "Tavily",
            "details": "Research and finance web search",
        },
        "googleCalendar": {
            "status": "disconnected" if google_ready else "not_configured",
            "label": "Google Calendar",
            "details": "Read-only agenda and upcoming events",
        },
        "openrouterImages": {
            "status": "disconnected" if settings.openrouter_api_key else "not_configured",
            "label": "OpenRouter Images",
            "details": "Image generation provider",
        },
        "supabase": {
            "status": "connected" if settings.supabase_url and settings.supabase_service_role_key else "not_configured",
            "label": "Supabase",
            "details": "Workspace auth, storage, and persistence",
        },
    }


def google_calendar_events() -> list[dict[str, str]]:
    now = datetime.now(timezone.utc)
    return [
        {
            "id": "preview-1",
            "title": "Design review",
            "startsAt": (now + timedelta(hours=2)).isoformat(),
            "location": "Google Meet",
        },
        {
            "id": "preview-2",
            "title": "Research sync",
            "startsAt": (now + timedelta(hours=5)).isoformat(),
            "location": "Workspace calendar",
        },
        {
            "id": "preview-3",
            "title": "Artifact cleanup",
            "startsAt": (now + timedelta(days=1, hours=1)).isoformat(),
            "location": "Beyond Chat",
        },
    ]


def build_google_connect_url() -> str | None:
    if not settings.google_client_id or not settings.google_client_secret:
        return None

    params = httpx.QueryParams(
        {
            "client_id": settings.google_client_id,
            "redirect_uri": settings.google_redirect_uri,
            "response_type": "code",
            "access_type": "offline",
            "prompt": "consent",
            "scope": "https://www.googleapis.com/auth/calendar.readonly",
        }
    )
    return f"https://accounts.google.com/o/oauth2/v2/auth?{params}"

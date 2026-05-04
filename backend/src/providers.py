from __future__ import annotations

import asyncio
import base64
import json
from datetime import datetime, timezone
from typing import Any, AsyncIterator

import httpx

from .config import settings
from .dexter_client import local_dexter_runtime_available

OPENROUTER_NOT_CONFIGURED = "OPENROUTER_NOT_CONFIGURED"
EXA_NOT_CONFIGURED = "EXA_NOT_CONFIGURED"


def _openrouter_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": settings.openrouter_http_referer,
        "X-Title": settings.app_title,
    }


async def _post_openrouter_json(
    *,
    url: str,
    payload: dict[str, Any],
    timeout: float,
    retries: int = 3,
    error_provider: str = "OpenRouter",
) -> dict[str, Any]:
    last_error: Exception | None = None
    async with httpx.AsyncClient(timeout=timeout) as client:
        for attempt in range(retries):
            try:
                response = await client.post(url, headers=_openrouter_headers(), json=payload)
                response.raise_for_status()
                data = response.json()
                return data if isinstance(data, dict) else {}
            except httpx.HTTPError as exc:
                last_error = exc
                if attempt == retries - 1:
                    response = exc.response if isinstance(exc, httpx.HTTPStatusError) else None
                    raise RuntimeError(_provider_error_message(error_provider, exc, response)) from exc
                await asyncio.sleep(0.35 * (attempt + 1))

    raise RuntimeError(str(last_error) if last_error else "OpenRouter request failed.")


def _provider_error_message(provider: str, exc: Exception, response: httpx.Response | None = None) -> str:
    if response is not None:
        try:
            payload = response.json()
        except ValueError:
            payload = response.text
        return f"{provider} request failed with {response.status_code}: {payload}"
    return f"{provider} request failed: {exc}"


async def call_openrouter(
    model: str,
    messages: list[dict[str, str]],
    temperature: float = 0.4,
    max_tokens: int = 900,
) -> str:
    if not settings.openrouter_api_key:
        raise RuntimeError(OPENROUTER_NOT_CONFIGURED)

    payload = await _post_openrouter_json(
        url="https://openrouter.ai/api/v1/chat/completions",
        payload={
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        },
        timeout=settings.openrouter_timeout_seconds,
        error_provider="OpenRouter chat",
    )

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


def _normalize_openrouter_content(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        text_parts = [
            part.get("text", "")
            for part in content
            if isinstance(part, dict) and isinstance(part.get("text"), str)
        ]
        return "".join(text_parts)
    return ""


async def call_openrouter_with_tools(
    model: str,
    messages: list[dict[str, str]],
    temperature: float = 0.4,
    max_tokens: int = 900,
    tools: list[dict[str, Any]] | None = None,
    tool_choice: str | dict[str, Any] | None = None,
) -> dict[str, Any]:
    if not settings.openrouter_api_key:
        raise RuntimeError(OPENROUTER_NOT_CONFIGURED)

    request_payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if tools:
        request_payload["tools"] = tools
    if tool_choice is not None:
        request_payload["tool_choice"] = tool_choice

    payload = await _post_openrouter_json(
        url="https://openrouter.ai/api/v1/chat/completions",
        payload=request_payload,
        timeout=settings.openrouter_timeout_seconds,
        error_provider="OpenRouter compare",
    )

    choices = payload.get("choices") or []
    first_choice = choices[0] if choices and isinstance(choices[0], dict) else {}
    message = first_choice.get("message") if isinstance(first_choice, dict) else {}
    if not isinstance(message, dict):
        message = {}

    tool_calls = message.get("tool_calls") or []
    return {
        "content": _normalize_openrouter_content(message.get("content", "")),
        "toolCalls": tool_calls if isinstance(tool_calls, list) else [],
        "finishReason": first_choice.get("finish_reason") if isinstance(first_choice, dict) else None,
    }


async def call_openrouter_stream(
    model: str,
    messages: list[dict[str, str]],
    temperature: float = 0.4,
    max_tokens: int = 900,
) -> AsyncIterator[str]:
    if not settings.openrouter_api_key:
        raise RuntimeError(OPENROUTER_NOT_CONFIGURED)

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": True,
    }

    timeout = httpx.Timeout(connect=10.0, write=30.0, read=None, pool=30.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            async with client.stream(
                "POST",
                "https://openrouter.ai/api/v1/chat/completions",
                headers=_openrouter_headers(),
                json=payload,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    raw_line = line.strip()
                    if not raw_line or not raw_line.startswith("data:"):
                        continue

                    data = raw_line[5:].strip()
                    if data == "[DONE]":
                        break

                    try:
                        chunk_payload = json.loads(data)
                    except json.JSONDecodeError:
                        continue

                    choices = chunk_payload.get("choices") or []
                    if not choices or not isinstance(choices[0], dict):
                        continue

                    delta = choices[0].get("delta") or {}
                    if not isinstance(delta, dict):
                        continue

                    content = delta.get("content")
                    if isinstance(content, str) and content:
                        yield content
                        continue

                    if isinstance(content, list):
                        text_parts = [
                            part.get("text", "")
                            for part in content
                            if isinstance(part, dict) and isinstance(part.get("text"), str)
                        ]
                        merged = "".join(text_parts)
                        if merged:
                            yield merged
        except httpx.HTTPError as exc:
            response = exc.response if isinstance(exc, httpx.HTTPStatusError) else None
            raise RuntimeError(_provider_error_message("OpenRouter chat", exc, response)) from exc


def _image_modalities(model: str) -> list[str]:
    """Return the correct modalities list per OpenRouter docs.

    Models that output both text and images (e.g. Gemini, GPT) use
    ``["image", "text"]``.  Image-only models (Sourceful, Flux,
    ByteDance Seedream, etc.) use ``["image"]``.
    """
    text_and_image_prefixes = ("google/", "openai/")
    if model.startswith(text_and_image_prefixes):
        return ["image", "text"]
    return ["image"]


async def call_openrouter_image(
    model: str,
    prompt: str,
    *,
    aspect_ratio: str = "1:1",
    image_size: str = "1K",
) -> list[tuple[bytes, str]]:
    """Call OpenRouter image generation via chat completions endpoint.

    Uses the ``modalities`` and ``image_config`` parameters as documented at
    https://openrouter.ai/docs/guides/overview/multimodal/image-generation.
    Returns list of ``(image_bytes, content_type)`` tuples.
    """
    if not settings.openrouter_api_key:
        raise RuntimeError(OPENROUTER_NOT_CONFIGURED)

    body: dict[str, Any] = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "modalities": _image_modalities(model),
    }
    if aspect_ratio or image_size:
        image_config: dict[str, str] = {}
        if aspect_ratio:
            image_config["aspect_ratio"] = aspect_ratio
        if image_size:
            image_config["image_size"] = image_size
        body["image_config"] = image_config

    payload = await _post_openrouter_json(
        url="https://openrouter.ai/api/v1/chat/completions",
        payload=body,
        timeout=180.0,
        error_provider="OpenRouter images",
    )

    results: list[tuple[bytes, str]] = []
    choices = payload.get("choices") or []
    for choice in choices:
        if not isinstance(choice, dict):
            continue
        message = choice.get("message") or {}
        if not isinstance(message, dict):
            continue
        images = message.get("images") or []
        for img_entry in images:
            if not isinstance(img_entry, dict):
                continue
            image_url_obj = img_entry.get("image_url") or {}
            data_url = image_url_obj.get("url", "") if isinstance(image_url_obj, dict) else ""
            if data_url.startswith("data:"):
                # Parse data URL: data:image/png;base64,<data>
                header, _, b64_data = data_url.partition(",")
                content_type = header.split(";")[0].replace("data:", "") or "image/png"
                results.append((base64.b64decode(b64_data), content_type))
            elif data_url.startswith("http"):
                async with httpx.AsyncClient(timeout=60.0) as dl:
                    img_resp = await dl.get(data_url)
                    img_resp.raise_for_status()
                    ct = img_resp.headers.get("content-type", "image/png").split(";")[0].strip()
                    results.append((img_resp.content, ct))

    return results


async def compare_models(
    prompt: str,
    models: list[str],
    tools: list[dict[str, Any]] | None = None,
    tool_choice: str | dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    async def run_single_model(model: str) -> dict[str, Any]:
        started = datetime.now(timezone.utc)
        try:
            response = await call_openrouter_with_tools(
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
                tools=tools,
                tool_choice=tool_choice,
            )
            latency_ms = int((datetime.now(timezone.utc) - started).total_seconds() * 1000)
            return {
                "model": model,
                "status": "completed",
                "content": response["content"],
                "latencyMs": latency_ms,
                "error": None,
                "toolCalls": response["toolCalls"],
                "finishReason": response["finishReason"],
            }
        except RuntimeError as exc:
            if str(exc) == OPENROUTER_NOT_CONFIGURED:
                return {
                    "model": model,
                    "status": "not_configured",
                    "content": "",
                    "latencyMs": 0,
                    "error": "OpenRouter is not configured.",
                    "toolCalls": [],
                    "finishReason": None,
                }
            raise
        except Exception as exc:
            latency_ms = int((datetime.now(timezone.utc) - started).total_seconds() * 1000)
            return {
                "model": model,
                "status": "failed",
                "content": "",
                "latencyMs": latency_ms,
                "error": str(exc),
                "toolCalls": [],
                "finishReason": None,
            }

    return list(await asyncio.gather(*(run_single_model(model) for model in models)))


async def exa_search(query: str) -> dict[str, Any]:
    if not settings.exasearch_api_key:
        raise RuntimeError(EXA_NOT_CONFIGURED)

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            "https://api.exa.ai/search",
            headers={
                "x-api-key": settings.exasearch_api_key,
                "Content-Type": "application/json",
            },
            json={
                "query": query,
                "numResults": 5,
                "contents": {
                    "text": True,
                    "highlights": True,
                },
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
                "snippet": item.get("text") or " ".join(item.get("highlights") or []),
            }
        )
    return {
        "answer": "",
        "results": results,
    }


def provider_statuses() -> dict[str, Any]:
    google_ready = bool(settings.google_client_id and settings.google_client_secret)
    local_dexter_ready = (
        local_dexter_runtime_available()
        and bool(settings.openrouter_api_key)
        and bool(settings.financial_datasets_api_key)
    )
    dexter_ready = bool(settings.dexter_runner_url) or local_dexter_ready
    dexter_details = (
        "Sandboxed finance agent runtime"
        if settings.dexter_runner_url
        else "Local finance agent runtime"
    )
    return {
        "openrouter": {
            "status": "connected" if settings.openrouter_api_key else "not_configured",
            "label": "OpenRouter",
            "details": "LLM and compare provider",
        },
        "exa": {
            "status": "connected" if settings.exasearch_api_key else "not_configured",
            "label": "Exa",
            "details": "Web search for research and Dexter",
        },
        "dexter": {
            "status": "connected" if dexter_ready else "not_configured",
            "label": "Dexter Finance",
            "details": dexter_details,
        },
        "financialDatasets": {
            "status": "connected" if settings.financial_datasets_api_key else "not_configured",
            "label": "Financial Datasets",
            "details": "Market data and fundamentals for Dexter",
        },
        "googleCalendar": {
            "status": "disconnected" if google_ready else "not_configured",
            "label": "Google Calendar",
            "details": "Read-only agenda and upcoming events",
        },
        "openrouterImages": {
            "status": "connected" if settings.openrouter_api_key else "not_configured",
            "label": "OpenRouter Images",
            "details": "Image generation via chat completions endpoint",
        },
        "supabase": {
            "status": "connected" if settings.supabase_url and settings.supabase_anon_key else "not_configured",
            "label": "Supabase",
            "details": "Workspace auth, storage, and persistence",
        },
        "supabaseStorage": {
            "status": "connected" if settings.supabase_url and settings.supabase_anon_key else "not_configured",
            "label": "Supabase Storage",
            "details": f"Bucket target: {settings.supabase_storage_bucket}",
        },
        "notion": {
            "status": "not_configured",
            "label": "Notion",
            "details": "Company knowledge context connector",
        },
        "googleDrive": {
            "status": "not_configured",
            "label": "Google Drive",
            "details": "Uploaded briefs, decks, documents, and spreadsheets",
        },
        "slack": {
            "status": "not_configured",
            "label": "Slack",
            "details": "Team discussion context connector",
        },
    }


def google_calendar_events() -> list[dict[str, str]]:
    return []


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

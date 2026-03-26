from __future__ import annotations

import asyncio
import os
import time

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api", tags=["compare"])

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

ALLOWED_MODELS = {
    "openai/gpt-4o",
    "anthropic/claude-sonnet-4",
    "google/gemini-2.0-flash-001",
}


class CompareRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=4000)
    models: list[str] = Field(..., min_length=2, max_length=3)


class ModelResponse(BaseModel):
    model: str
    content: str = ""
    tokens: int | None = None
    duration_ms: int = 0
    error: str | None = None


class CompareResponse(BaseModel):
    results: list[ModelResponse]


async def _call_model(
    client: httpx.AsyncClient, model_id: str, prompt: str
) -> ModelResponse:
    start = time.monotonic()
    try:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "X-Title": "Beyond Chat",
            },
            json={
                "model": model_id,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 1024,
            },
            timeout=60.0,
        )
        elapsed = int((time.monotonic() - start) * 1000)
        resp.raise_for_status()
        data = resp.json()
        choice = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        return ModelResponse(
            model=model_id,
            content=choice,
            tokens=usage.get("completion_tokens"),
            duration_ms=elapsed,
        )
    except Exception as exc:
        elapsed = int((time.monotonic() - start) * 1000)
        return ModelResponse(
            model=model_id,
            duration_ms=elapsed,
            error=str(exc),
        )


@router.post("/compare", response_model=CompareResponse)
async def compare(req: CompareRequest) -> CompareResponse:
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=503, detail="OPENROUTER_API_KEY not configured")

    invalid = [m for m in req.models if m not in ALLOWED_MODELS]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Unsupported models: {invalid}")

    async with httpx.AsyncClient() as client:
        tasks = [_call_model(client, model_id, req.prompt) for model_id in req.models]
        results = await asyncio.gather(*tasks)

    return CompareResponse(results=list(results))

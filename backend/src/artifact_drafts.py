from __future__ import annotations

import json
from typing import Any


def unique_tags(tags: list[str | None]) -> list[str]:
    seen: set[str] = set()
    normalized: list[str] = []
    for tag in tags:
        if tag is None:
            continue
        candidate = tag.strip().lower()
        if not candidate or candidate in seen:
            continue
        seen.add(candidate)
        normalized.append(candidate)
    return normalized


def summarize(text: str, fallback: str) -> str:
    source = text.strip() or fallback.strip()
    return source[:180]


def stringify_output(output: Any) -> str:
    return json.dumps(output, ensure_ascii=True, indent=2)


def text_output(output: dict[str, Any]) -> str:
    content = output.get("content")
    return content.strip() if isinstance(content, str) else ""


def _default_artifact_type(studio: str) -> str:
    return {
        "writing": "document",
        "research": "report",
        "finance": "report",
        "data": "report",
        "image": "image",
    }.get(studio, "report")


def build_run_artifact_payload(
    *,
    run: dict[str, Any],
    title: str | None = None,
    artifact_type: str | None = None,
    summary: str | None = None,
    tags: list[str] | None = None,
    content_format: str | None = None,
) -> dict[str, Any] | None:
    output = run.get("output")
    if not isinstance(output, dict):
        return None

    studio = str(run.get("studio") or "report")
    run_title = str(run.get("title") or "Untitled Artifact")
    run_prompt = str(run.get("prompt") or run_title)
    chosen_title = (title or run_title).strip() or "Untitled Artifact"
    chosen_type = (artifact_type or _default_artifact_type(studio)).strip() or _default_artifact_type(studio)
    chosen_summary = summary or summarize(run_prompt, chosen_title)

    metadata = {
        "runId": run.get("id"),
        "model": run.get("model"),
        "status": run.get("status"),
        "prompt": run.get("prompt"),
        "options": run.get("options") or {},
        "output": output,
    }

    preview_image: str | None = None
    content_json: Any | None = None

    if studio == "image":
        urls = output.get("urls")
        if isinstance(urls, list) and urls:
            preview_image = str(urls[0])
        content = str(
            output.get("enhanced_prompt")
            or output.get("prompt")
            or run.get("prompt")
            or chosen_title
        )
        artifact_content_format = content_format or "plain"
        content_json = output
    else:
        content = text_output(output)
        if not content:
            content = stringify_output(output)
        artifact_content_format = content_format or ("markdown" if text_output(output) else "json")
        if artifact_content_format == "json":
            content_json = output

    combined_tags = unique_tags([studio, chosen_type, "saved-output", *(tags or [])])

    return {
        "title": chosen_title,
        "type": chosen_type,
        "studio": studio,
        "content": content,
        "summary": chosen_summary,
        "content_format": artifact_content_format,
        "metadata": metadata,
        "tags": combined_tags,
        "preview_image": preview_image,
        "content_json": content_json,
    }


def build_compare_artifact_payload(
    *,
    prompt: str,
    result: dict[str, Any],
    context_ids: list[str],
) -> dict[str, Any] | None:
    content = str(result.get("content") or "").strip()
    if not content:
        return None

    model = str(result.get("model") or "unknown-model")
    return {
        "title": f"Compare result: {model}",
        "type": "compare_result",
        "studio": "chat",
        "content": content,
        "summary": summarize(prompt, model),
        "content_format": "plain",
        "metadata": {
            "comparePrompt": prompt,
            "model": model,
            "latencyMs": result.get("latencyMs"),
            "status": result.get("status"),
            "contextIds": context_ids,
        },
        "tags": unique_tags(["chat", "compare", model]),
        "preview_image": None,
        "content_json": None,
    }


def build_image_artifact_payload(
    *,
    prompt: str,
    model: str,
    ratio: str,
    quality: str,
    url: str,
    storage_path: str | None = None,
) -> dict[str, Any] | None:
    if not url.strip():
        return None

    return {
        "title": prompt.strip()[:60] or "Generated image",
        "type": "image",
        "studio": "image",
        "content": prompt.strip() or "Generated image",
        "summary": f"Generated with {model}",
        "content_format": "plain",
        "metadata": {
            "model": model,
            "ratio": ratio,
            "quality": quality,
            "storage_path": storage_path or "",
        },
        "tags": unique_tags(["image", "generated"]),
        "preview_image": url,
        "content_json": None,
    }

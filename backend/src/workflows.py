from __future__ import annotations

import asyncio
import base64
from typing import Any

from .config import settings
from .providers import (
    EXA_NOT_CONFIGURED,
    OPENROUTER_NOT_CONFIGURED,
    call_openrouter,
    call_openrouter_image,
    exa_search,
)
from .dexter_client import run_dexter_finance
from .runtime_store import RuntimeDataStore
from .supabase_service import supabase_service


def _quality_to_image_size(quality: str) -> str:
    """Map the frontend quality label to an OpenRouter image_size value."""
    return {
        "Draft": "1K",
        "High": "2K",
        "Ultra": "4K",
    }.get(quality, "1K")


def _record_step(
    data_store: RuntimeDataStore,
    workspace_id: str,
    run_id: str,
    step_name: str,
    tool_used: str,
    status: str,
    input_payload: Any,
    output_payload: Any,
) -> None:
    data_store.add_run_step(
        workspace_id,
        run_id,
        step_name=step_name,
        tool_used=tool_used,
        status=status,
        input_payload=input_payload,
        output_payload=output_payload,
    )


def _format_options_brief(options: dict[str, Any], keys: list[str]) -> str:
    lines = []
    for key in keys:
        value = options.get(key)
        if value not in (None, "", [], {}):
            label = key.replace("_", " ").title()
            lines.append(f"{label}: {value}")
    return "\n".join(lines)


async def run_writing_workflow(
    *,
    data_store: RuntimeDataStore,
    workspace_id: str,
    run_id: str,
    prompt: str,
    model: str,
    options: dict[str, Any],
) -> dict[str, Any]:
    brief = _format_options_brief(options, ["tone", "audience", "format", "length", "constraints"])
    prepared_prompt = prompt if not brief else f"{prompt}\n\nWriting brief:\n{brief}"

    _record_step(data_store, workspace_id, run_id, "prepare_brief", "system", "completed", options, {"preparedPrompt": prepared_prompt})
    _record_step(data_store, workspace_id, run_id, "draft", "openrouter", "running", prepared_prompt, "Drafting content")
    content = await call_openrouter(
        model=model,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are Beyond Chat's Writing Studio. Produce polished markdown that is ready to save as an artifact. "
                    "Respect the requested tone, audience, format, and constraints. Use headings and bullets when useful."
                ),
            },
            {"role": "user", "content": prepared_prompt},
        ],
        temperature=0.45,
        max_tokens=1400,
    )
    output = {
        "format": "markdown",
        "content": content,
        "workflow": "writing",
        "artifactType": options.get("artifact_type", "document"),
    }
    _record_step(data_store, workspace_id, run_id, "draft", "openrouter", "completed", prepared_prompt, output)
    return output


async def _run_search_backed_report(
    *,
    data_store: RuntimeDataStore,
    workspace_id: str,
    run_id: str,
    studio: str,
    prompt: str,
    model: str,
    options: dict[str, Any],
) -> dict[str, Any]:
    planning_payload = {
        "prompt": prompt,
        "goal": options.get("goal"),
        "outputFormat": options.get("output_format", "markdown"),
    }
    _record_step(data_store, workspace_id, run_id, "plan", "system", "completed", planning_payload, {"studio": studio})

    sources: list[dict[str, str]] = []
    search_answer = ""
    search_note = None

    _record_step(data_store, workspace_id, run_id, "search", "exa", "running", prompt, "Searching sources")
    try:
        search_results = await exa_search(prompt)
        sources = search_results.get("results", [])
        search_answer = search_results.get("answer", "")
        _record_step(data_store, workspace_id, run_id, "search", "exa", "completed", prompt, search_results)
    except RuntimeError as exc:
        if str(exc) != EXA_NOT_CONFIGURED:
            raise
        search_note = "Exa is not configured; continuing without external search."
        fallback_search = {"answer": "", "results": [], "warning": search_note}
        _record_step(data_store, workspace_id, run_id, "search", "exa", "completed", prompt, fallback_search)

    evidence_lines = [
        f"- {item.get('title', 'Untitled source')}: {item.get('snippet', '')} ({item.get('url', '')})"
        for item in sources
    ]
    if search_answer:
        evidence_lines.insert(0, f"- Search answer: {search_answer}")
    if search_note:
        evidence_lines.insert(0, f"- Note: {search_note}")

    system_prompt = (
        "You are Beyond Chat's Research Studio. Produce a concise, structured markdown report with these sections: "
        "## Executive Summary, ## Key Findings, ## Risks or Unknowns, ## Recommended Next Steps, ## Sources."
    )
    if studio == "finance":
        system_prompt = (
            "You are Beyond Chat's Finance Studio. Produce a structured markdown memo with these sections: "
            "## Executive Summary, ## Financial Signals, ## Risks, ## Recommendations, ## Sources. "
            "Be explicit about assumptions and avoid fabricating numbers that are not in the evidence."
        )

    synthesis_prompt = (
        f"Studio: {studio}\n"
        f"User request: {prompt}\n\n"
        "Evidence:\n"
        + ("\n".join(evidence_lines) if evidence_lines else "- No external evidence was available.")
    )
    _record_step(data_store, workspace_id, run_id, "synthesize", "openrouter", "running", synthesis_prompt, "Generating report")
    content = await call_openrouter(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": synthesis_prompt},
        ],
        temperature=0.2,
        max_tokens=1100,
    )
    output = {
        "format": "markdown",
        "content": content,
        "workflow": studio,
        "sources": sources,
        "searchAnswer": search_answer,
        "artifactType": options.get("artifact_type", "report"),
    }
    if search_note:
        output["warning"] = search_note
    _record_step(data_store, workspace_id, run_id, "synthesize", "openrouter", "completed", synthesis_prompt, output)
    return output


async def run_research_workflow(
    *,
    data_store: RuntimeDataStore,
    workspace_id: str,
    run_id: str,
    prompt: str,
    model: str,
    options: dict[str, Any],
) -> dict[str, Any]:
    return await _run_search_backed_report(
        data_store=data_store,
        workspace_id=workspace_id,
        run_id=run_id,
        studio="research",
        prompt=prompt,
        model=model,
        options=options,
    )


async def run_finance_workflow(
    *,
    data_store: RuntimeDataStore,
    workspace_id: str,
    run_id: str,
    prompt: str,
    model: str,
    options: dict[str, Any],
) -> dict[str, Any]:
    _record_step(
        data_store,
        workspace_id,
        run_id,
        "dexter_dispatch",
        "vercel-sandbox",
        "running",
        {"prompt": prompt, "model": model},
        "Launching Dexter finance agent",
    )

    async def record_dexter_event(event: dict[str, Any]) -> None:
        event_type = event.get("type")
        if event_type == "tool_start":
            _record_step(
                data_store,
                workspace_id,
                run_id,
                str(event.get("tool") or "dexter_tool"),
                str(event.get("tool") or "dexter"),
                "running",
                event.get("args", {}),
                {"toolCallId": event.get("toolCallId")},
            )
        elif event_type == "tool_progress":
            _record_step(
                data_store,
                workspace_id,
                run_id,
                str(event.get("tool") or "dexter_tool"),
                str(event.get("tool") or "dexter"),
                "running",
                event.get("args", {}),
                {
                    "message": event.get("message"),
                    "progress": event.get("progress"),
                    "toolCallId": event.get("toolCallId"),
                },
            )
        elif event_type == "tool_end":
            _record_step(
                data_store,
                workspace_id,
                run_id,
                str(event.get("tool") or "dexter_tool"),
                str(event.get("tool") or "dexter"),
                "completed",
                event.get("args", {}),
                {
                    "duration": event.get("duration"),
                    "result": str(event.get("result", ""))[:4000],
                },
            )
        elif event_type == "tool_error":
            _record_step(
                data_store,
                workspace_id,
                run_id,
                str(event.get("tool") or "dexter_tool"),
                str(event.get("tool") or "dexter"),
                "failed",
                event.get("args", {}),
                {"error": event.get("error")},
            )

    result = await run_dexter_finance(
        prompt=prompt,
        model=model,
        workspace_id=workspace_id,
        run_id=run_id,
        options=options,
        on_event=record_dexter_event,
    )

    _record_step(
        data_store,
        workspace_id,
        run_id,
        "dexter_dispatch",
        "vercel-sandbox",
        "completed",
        {"prompt": prompt, "model": model},
        {
            "engine": "dexter",
            "sandbox": result.get("sandbox"),
        },
    )

    output = {
        "format": "markdown",
        "workflow": "finance",
        "engine": "dexter",
        "content": str(result.get("answer") or ""),
        "toolCalls": result.get("toolCalls", []),
        "sources": result.get("sources", []),
        "usage": result.get("usage"),
        "sandbox": result.get("sandbox"),
        "artifactType": options.get("artifact_type", "report"),
    }

    _record_step(
        data_store,
        workspace_id,
        run_id,
        "dexter_complete",
        "dexter",
        "completed",
        {"prompt": prompt, "model": model},
        {"answerLength": len(output["content"]), "toolCallCount": len(output["toolCalls"])},
    )
    return output


async def run_image_workflow(
    *,
    data_store: RuntimeDataStore,
    run_id: str,
    workspace_id: str,
    prompt: str,
    model: str,
    options: dict[str, Any],
    access_token: str | None,
) -> dict[str, Any]:
    fallback_model = model if model and model != settings.openrouter_default_model else settings.openrouter_image_default_model
    requested_models = options.get("models")
    selected_models: list[str] = []
    if isinstance(requested_models, list):
        for item in requested_models:
            if isinstance(item, str) and item.strip():
                selected_models.append(item.strip())

    if not selected_models:
        selected_models = [fallback_model]

    # Keep model order stable while removing duplicates.
    selected_models = list(dict.fromkeys(selected_models))

    quality = str(options.get("quality", "High"))
    ratio = str(options.get("ratio", "1:1"))

    constraints = {
        "quality": quality,
        "ratio": ratio,
        "models": selected_models,
        "modelCount": len(selected_models),
    }
    _record_step(data_store, workspace_id, run_id, "collect_constraints", "system", "completed", options, constraints)

    _record_step(data_store, workspace_id, run_id, "enhance_prompt", "openrouter", "running", prompt, "Enhancing prompt")
    enhanced_prompt = await call_openrouter(
        model=settings.openrouter_default_model,
        messages=[
            {
                "role": "system",
                "content": (
                    "You rewrite prompts for AI image generation. Make the prompt vivid, concrete, and production-ready. "
                    "Return only the rewritten prompt, no preamble."
                ),
            },
            {"role": "user", "content": f"Prompt: {prompt}\nAspect ratio: {ratio}"},
        ],
        temperature=0.5,
        max_tokens=320,
    )
    _record_step(data_store, workspace_id, run_id, "enhance_prompt", "openrouter", "completed", prompt, {"enhancedPrompt": enhanced_prompt})

    _record_step(
        data_store,
        workspace_id,
        run_id,
        "generate",
        "openrouter-images",
        "running",
        enhanced_prompt,
        {
            "models": selected_models,
            "quality": quality,
            "ratio": ratio,
        },
    )

    async def generate_for_model(image_model: str) -> dict[str, Any]:
        try:
            generated_images = await call_openrouter_image(
                model=image_model,
                prompt=enhanced_prompt,
                aspect_ratio=ratio,
                image_size=_quality_to_image_size(quality),
            )
            return {
                "model": image_model,
                "images": generated_images,
                "error": None,
            }
        except Exception as exc:
            return {
                "model": image_model,
                "images": [],
                "error": str(exc),
            }

    generated_results = await asyncio.gather(*(generate_for_model(image_model) for image_model in selected_models))

    generated_counts = {
        result["model"]: len(result["images"])
        for result in generated_results
    }
    generated_errors = {
        result["model"]: result["error"]
        for result in generated_results
        if result["error"]
    }

    total_generated = sum(generated_counts.values())
    if total_generated == 0 and generated_errors:
        raise RuntimeError(f"Image generation failed for all selected models: {generated_errors}")

    _record_step(
        data_store,
        workspace_id,
        run_id,
        "generate",
        "openrouter-images",
        "completed",
        enhanced_prompt,
        {
            "count": total_generated,
            "models": selected_models,
            "countsByModel": generated_counts,
            "errorsByModel": generated_errors,
        },
    )

    _record_step(data_store, workspace_id, run_id, "upload", "supabase", "running", run_id, "Uploading generated images")
    urls: list[str] = []
    paths: list[str] = []
    variants: list[dict[str, Any]] = []
    for result in generated_results:
        image_model = str(result["model"])
        model_images = result["images"]
        model_error = result["error"]
        model_urls: list[str] = []
        model_paths: list[str] = []
        model_slug = image_model.replace("/", "-").replace(":", "-")

        for index, (image_bytes, content_type) in enumerate(model_images):
            extension = "jpg" if "jpeg" in content_type else "png"
            uploaded = supabase_service.upload_image_file(
                workspace_id=workspace_id,
                run_id=run_id,
                filename=f"{model_slug}_{index + 1}.{extension}",
                content_type=content_type,
                image_bytes=image_bytes,
                access_token=access_token,
            )
            if uploaded and uploaded.get("signed_url"):
                model_urls.append(uploaded["signed_url"])
                model_paths.append(uploaded["path"])
            else:
                # Fallback: serve as base64 data URL when storage is unavailable
                b64 = base64.b64encode(image_bytes).decode()
                model_urls.append(f"data:{content_type};base64,{b64}")
                model_paths.append("")

        urls.extend(model_urls)
        paths.extend(model_paths)
        variant = {
            "model": image_model,
            "urls": model_urls,
            "paths": model_paths,
            "count": len(model_urls),
        }
        if model_error:
            variant["error"] = model_error
        variants.append(variant)

    _record_step(
        data_store,
        workspace_id,
        run_id,
        "upload",
        "supabase",
        "completed",
        run_id,
        {
            "count": len(urls),
            "paths": paths,
            "variants": [{"model": item["model"], "count": item["count"]} for item in variants],
        },
    )

    return {
        "format": "image",
        "workflow": "image",
        "prompt": prompt,
        "enhanced_prompt": enhanced_prompt,
        "model": selected_models[0],
        "models": selected_models,
        "variants": variants,
        "urls": urls,
        "paths": paths,
        "count": len(urls),
        "artifactType": "image",
    }


async def run_data_workflow(
    *,
    data_store: RuntimeDataStore,
    workspace_id: str,
    run_id: str,
    prompt: str,
    model: str,
    options: dict[str, Any],
) -> dict[str, Any]:
    data_summary = str(options.get("data_summary") or "No dataset summary provided.")
    row_count = options.get("row_count")
    column_names = options.get("columns") or []
    profile = {
        "summary": data_summary,
        "rowCount": row_count,
        "columns": column_names,
    }
    _record_step(data_store, workspace_id, run_id, "profile_dataset", "system", "completed", options, profile)

    analysis_prompt = (
        f"User request: {prompt}\n\n"
        f"Dataset summary: {data_summary}\n"
        f"Rows: {row_count if row_count is not None else 'Unknown'}\n"
        f"Columns: {', '.join(column_names) if column_names else 'Unknown'}"
    )
    _record_step(data_store, workspace_id, run_id, "analyze", "openrouter", "running", analysis_prompt, "Analyzing dataset")
    content = await call_openrouter(
        model=model,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are Beyond Chat's Data Studio. Return structured markdown with sections: "
                    "## Overview, ## Trends, ## Data Quality Notes, ## Recommended Actions. "
                    "Stay grounded in the supplied dataset summary."
                ),
            },
            {"role": "user", "content": analysis_prompt},
        ],
        temperature=0.2,
        max_tokens=950,
    )
    output = {
        "format": "markdown",
        "content": content,
        "workflow": "data",
        "summary": data_summary,
        "profile": profile,
        "artifactType": "report",
    }
    _record_step(data_store, workspace_id, run_id, "analyze", "openrouter", "completed", analysis_prompt, output)
    return output


async def run_studio_workflow(
    *,
    data_store: RuntimeDataStore,
    studio: str,
    run_id: str,
    workspace_id: str,
    prompt: str,
    model: str,
    options: dict[str, Any],
    access_token: str | None,
) -> dict[str, Any]:
    if studio == "writing":
        return await run_writing_workflow(
            data_store=data_store,
            workspace_id=workspace_id,
            run_id=run_id,
            prompt=prompt,
            model=model,
            options=options,
        )
    if studio == "research":
        return await run_research_workflow(
            data_store=data_store,
            workspace_id=workspace_id,
            run_id=run_id,
            prompt=prompt,
            model=model,
            options=options,
        )
    if studio == "image":
        return await run_image_workflow(
            data_store=data_store,
            run_id=run_id,
            workspace_id=workspace_id,
            prompt=prompt,
            model=model,
            options=options,
            access_token=access_token,
        )
    if studio == "data":
        return await run_data_workflow(
            data_store=data_store,
            workspace_id=workspace_id,
            run_id=run_id,
            prompt=prompt,
            model=model,
            options=options,
        )
    if studio == "finance":
        return await run_finance_workflow(
            data_store=data_store,
            workspace_id=workspace_id,
            run_id=run_id,
            prompt=prompt,
            model=model,
            options=options,
        )

    _record_step(data_store, workspace_id, run_id, "complete", "openrouter", "running", prompt, "Generating response")
    content = await call_openrouter(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=800,
    )
    output = {"format": "markdown", "content": content}
    _record_step(data_store, workspace_id, run_id, "complete", "openrouter", "completed", prompt, output)
    return output


__all__ = [
    "run_studio_workflow",
    "run_writing_workflow",
    "run_research_workflow",
    "run_image_workflow",
    "run_data_workflow",
    "run_finance_workflow",
    "OPENROUTER_NOT_CONFIGURED",
]

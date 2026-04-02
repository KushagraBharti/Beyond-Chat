from __future__ import annotations

from typing import Any

from .config import settings
from .providers import (
    OPENROUTER_NOT_CONFIGURED,
    TAVILY_NOT_CONFIGURED,
    call_openrouter,
    call_openrouter_image,
    tavily_search,
)
from .store import store
from .supabase_service import supabase_service


def _ratio_to_size(ratio: str) -> str:
    return {
        "1:1": "1024x1024",
        "16:9": "1792x1024",
        "9:16": "1024x1792",
        "4:5": "1024x1280",
    }.get(ratio, "1024x1024")


def _record_step(
    run_id: str,
    step_name: str,
    tool_used: str,
    status: str,
    input_payload: Any,
    output_payload: Any,
) -> None:
    store.add_run_step(run_id, step_name, tool_used, status, input_payload, output_payload)


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
    run_id: str,
    prompt: str,
    model: str,
    options: dict[str, Any],
) -> dict[str, Any]:
    brief = _format_options_brief(options, ["tone", "audience", "format", "length", "constraints"])
    prepared_prompt = prompt if not brief else f"{prompt}\n\nWriting brief:\n{brief}"

    _record_step(run_id, "prepare_brief", "system", "completed", options, {"preparedPrompt": prepared_prompt})
    _record_step(run_id, "draft", "openrouter", "running", prepared_prompt, "Drafting content")
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
    _record_step(run_id, "draft", "openrouter", "completed", prepared_prompt, output)
    return output


async def _run_search_backed_report(
    *,
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
    _record_step(run_id, "plan", "system", "completed", planning_payload, {"studio": studio})

    sources: list[dict[str, str]] = []
    search_answer = ""
    search_note = None

    _record_step(run_id, "search", "tavily", "running", prompt, "Searching sources")
    try:
        search_results = await tavily_search(prompt)
        sources = search_results.get("results", [])
        search_answer = search_results.get("answer", "")
        _record_step(run_id, "search", "tavily", "completed", prompt, search_results)
    except RuntimeError as exc:
        if str(exc) != TAVILY_NOT_CONFIGURED:
            raise
        search_note = "Tavily is not configured; continuing without external search."
        fallback_search = {"answer": "", "results": [], "warning": search_note}
        _record_step(run_id, "search", "tavily", "completed", prompt, fallback_search)

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
    _record_step(run_id, "synthesize", "openrouter", "running", synthesis_prompt, "Generating report")
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
    _record_step(run_id, "synthesize", "openrouter", "completed", synthesis_prompt, output)
    return output


async def run_research_workflow(
    *,
    run_id: str,
    prompt: str,
    model: str,
    options: dict[str, Any],
) -> dict[str, Any]:
    return await _run_search_backed_report(
        run_id=run_id,
        studio="research",
        prompt=prompt,
        model=model,
        options=options,
    )


async def run_finance_workflow(
    *,
    run_id: str,
    prompt: str,
    model: str,
    options: dict[str, Any],
) -> dict[str, Any]:
    return await _run_search_backed_report(
        run_id=run_id,
        studio="finance",
        prompt=prompt,
        model=model,
        options=options,
    )


async def run_image_workflow(
    *,
    run_id: str,
    workspace_id: str,
    prompt: str,
    model: str,
    options: dict[str, Any],
    access_token: str | None,
) -> dict[str, Any]:
    image_model = model if model and model != settings.openrouter_default_model else settings.openrouter_image_default_model
    style = str(options.get("style", ""))
    quality = str(options.get("quality", "High"))
    ratio = str(options.get("ratio", "1:1"))

    constraints = {
        "style": style,
        "quality": quality,
        "ratio": ratio,
        "model": image_model,
    }
    _record_step(run_id, "collect_constraints", "system", "completed", options, constraints)

    _record_step(run_id, "enhance_prompt", "openrouter", "running", prompt, "Enhancing prompt")
    enhanced_prompt = await call_openrouter(
        model=settings.openrouter_default_model,
        messages=[
            {
                "role": "system",
                "content": (
                    "You rewrite prompts for AI image generation. Make the prompt vivid, concrete, and production-ready. "
                    "Incorporate style and quality constraints naturally. Return only the rewritten prompt."
                ),
            },
            {"role": "user", "content": f"Prompt: {prompt}\nStyle: {style}\nQuality: {quality}\nAspect ratio: {ratio}"},
        ],
        temperature=0.5,
        max_tokens=320,
    )
    _record_step(run_id, "enhance_prompt", "openrouter", "completed", prompt, {"enhancedPrompt": enhanced_prompt})

    _record_step(run_id, "generate", "openrouter-images", "running", enhanced_prompt, "Generating image")
    generated_images = await call_openrouter_image(
        model=image_model,
        prompt=enhanced_prompt,
        size=_ratio_to_size(ratio),
        n=1,
    )
    _record_step(
        run_id,
        "generate",
        "openrouter-images",
        "completed",
        enhanced_prompt,
        {"count": len(generated_images), "model": image_model},
    )

    _record_step(run_id, "upload", "supabase", "running", run_id, "Uploading generated images")
    urls: list[str] = []
    paths: list[str] = []
    for index, (image_bytes, content_type) in enumerate(generated_images):
        extension = "jpg" if "jpeg" in content_type else "png"
        uploaded = supabase_service.upload_image_file(
            workspace_id=workspace_id,
            run_id=run_id,
            filename=f"image_{index + 1}.{extension}",
            content_type=content_type,
            image_bytes=image_bytes,
            access_token=access_token,
        )
        if uploaded and uploaded.get("signed_url"):
            urls.append(uploaded["signed_url"])
            paths.append(uploaded["path"])
    _record_step(run_id, "upload", "supabase", "completed", run_id, {"count": len(urls), "paths": paths})

    return {
        "format": "image",
        "workflow": "image",
        "prompt": prompt,
        "enhanced_prompt": enhanced_prompt,
        "model": image_model,
        "urls": urls,
        "paths": paths,
        "count": len(urls),
        "artifactType": "image",
    }


async def run_data_workflow(
    *,
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
    _record_step(run_id, "profile_dataset", "system", "completed", options, profile)

    analysis_prompt = (
        f"User request: {prompt}\n\n"
        f"Dataset summary: {data_summary}\n"
        f"Rows: {row_count if row_count is not None else 'Unknown'}\n"
        f"Columns: {', '.join(column_names) if column_names else 'Unknown'}"
    )
    _record_step(run_id, "analyze", "openrouter", "running", analysis_prompt, "Analyzing dataset")
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
    _record_step(run_id, "analyze", "openrouter", "completed", analysis_prompt, output)
    return output


async def run_studio_workflow(
    *,
    studio: str,
    run_id: str,
    workspace_id: str,
    prompt: str,
    model: str,
    options: dict[str, Any],
    access_token: str | None,
) -> dict[str, Any]:
    if studio == "writing":
        return await run_writing_workflow(run_id=run_id, prompt=prompt, model=model, options=options)
    if studio == "research":
        return await run_research_workflow(run_id=run_id, prompt=prompt, model=model, options=options)
    if studio == "image":
        return await run_image_workflow(
            run_id=run_id,
            workspace_id=workspace_id,
            prompt=prompt,
            model=model,
            options=options,
            access_token=access_token,
        )
    if studio == "data":
        return await run_data_workflow(run_id=run_id, prompt=prompt, model=model, options=options)
    if studio == "finance":
        return await run_finance_workflow(run_id=run_id, prompt=prompt, model=model, options=options)

    _record_step(run_id, "complete", "openrouter", "running", prompt, "Generating response")
    content = await call_openrouter(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=800,
    )
    output = {"format": "markdown", "content": content}
    _record_step(run_id, "complete", "openrouter", "completed", prompt, output)
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

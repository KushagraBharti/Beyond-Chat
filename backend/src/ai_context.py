from __future__ import annotations

from typing import Any

from .runtime_store import RuntimeDataStore

MAX_CONTEXT_ARTIFACTS = 8
MAX_CONTEXT_CHARS_PER_ARTIFACT = 2000


def resolve_context_artifacts(
    data_store: RuntimeDataStore,
    workspace_id: str,
    artifact_ids: list[str],
) -> list[dict[str, Any]]:
    seen: set[str] = set()
    artifacts: list[dict[str, Any]] = []

    for artifact_id in artifact_ids[:MAX_CONTEXT_ARTIFACTS]:
        if artifact_id in seen:
            continue
        seen.add(artifact_id)
        artifact = data_store.get_artifact(workspace_id, artifact_id)
        if artifact is None:
            raise ValueError(f"Context artifact '{artifact_id}' was not found in the active workspace.")
        artifacts.append(artifact)

    return artifacts


def _format_data_content_block(artifact: dict[str, Any]) -> str:
    content_json = artifact.get("contentJson")
    if not isinstance(content_json, dict):
        return ""

    lines: list[str] = [f"[Data Analysis - {artifact.get('title') or 'Untitled'}]"]

    insight = content_json.get("insight")
    if isinstance(insight, str) and insight.strip():
        lines.append(f"Insight: {insight.strip()}")

    table = content_json.get("table")
    if isinstance(table, dict):
        headers = table.get("headers") or []
        rows = table.get("rows") or []
        if headers:
            lines.append("")
            lines.append("Table:")
            lines.append("| " + " | ".join(str(header) for header in headers) + " |")
            lines.append("| " + " | ".join("---" for _ in headers) + " |")
            for row in rows:
                lines.append("| " + " | ".join(str(cell) for cell in (row or [])) + " |")

    chart_data = content_json.get("chart_data")
    chart_type = content_json.get("chart_type", "")
    if isinstance(chart_data, dict):
        labels = chart_data.get("labels") or []
        datasets = chart_data.get("datasets") or []
        first_dataset = datasets[0] if datasets and isinstance(datasets[0], dict) else {}
        values = first_dataset.get("data") or []
        if labels or values:
            lines.append("")
            lines.append(f"Chart data ({chart_type}):")
            lines.append(f"Labels: {labels}")
            lines.append(f"Values: {values}")

    return "\n".join(lines)


def build_context_block(artifacts: list[dict[str, Any]]) -> str:
    if not artifacts:
        return ""

    sections: list[str] = []
    for artifact in artifacts:
        if artifact.get("studio") == "data" and artifact.get("contentJson") is not None:
            body = _format_data_content_block(artifact)
            if not body:
                body = str(artifact.get("content") or "").strip() or "[empty]"
        else:
            content = str(artifact.get("content") or "").strip()
            body = content[:MAX_CONTEXT_CHARS_PER_ARTIFACT]
            if len(content) > MAX_CONTEXT_CHARS_PER_ARTIFACT:
                body += "\n...[truncated]"
            body = body or "[empty]"

        sections.append(
            "\n".join(
                [
                    f"Artifact ID: {artifact['id']}",
                    f"Title: {artifact.get('title') or 'Untitled'}",
                    f"Studio: {artifact.get('studio') or 'unknown'}",
                    f"Type: {artifact.get('type') or 'unknown'}",
                    f"Summary: {artifact.get('summary') or 'No summary provided.'}",
                    "Content:",
                    body,
                ]
            )
        )

    return "Attached workspace context:\n\n" + "\n\n---\n\n".join(sections)


def merge_prompt_with_context(prompt: str, artifacts: list[dict[str, Any]]) -> str:
    context_block = build_context_block(artifacts)
    if not context_block:
        return prompt
    return f"{context_block}\n\nUser request:\n{prompt}"

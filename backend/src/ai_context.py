from __future__ import annotations

from typing import Any

from .store import store

MAX_CONTEXT_ARTIFACTS = 8
MAX_CONTEXT_CHARS_PER_ARTIFACT = 2000


def resolve_context_artifacts(workspace_id: str, artifact_ids: list[str]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    artifacts: list[dict[str, Any]] = []

    for artifact_id in artifact_ids[:MAX_CONTEXT_ARTIFACTS]:
        if artifact_id in seen:
            continue
        seen.add(artifact_id)
        artifact = store.get_artifact(workspace_id, artifact_id)
        if artifact is None:
            raise ValueError(f"Context artifact '{artifact_id}' was not found in the active workspace.")
        artifacts.append(artifact)

    return artifacts


def build_context_block(artifacts: list[dict[str, Any]]) -> str:
    if not artifacts:
        return ""

    sections: list[str] = []
    for artifact in artifacts:
        content = str(artifact.get("content") or "").strip()
        trimmed_content = content[:MAX_CONTEXT_CHARS_PER_ARTIFACT]
        if len(content) > MAX_CONTEXT_CHARS_PER_ARTIFACT:
            trimmed_content += "\n...[truncated]"

        sections.append(
            "\n".join(
                [
                    f"Artifact ID: {artifact['id']}",
                    f"Title: {artifact.get('title') or 'Untitled'}",
                    f"Studio: {artifact.get('studio') or 'unknown'}",
                    f"Type: {artifact.get('type') or 'unknown'}",
                    f"Summary: {artifact.get('summary') or 'No summary provided.'}",
                    "Content:",
                    trimmed_content or "[empty]",
                ]
            )
        )

    return "Attached workspace context:\n\n" + "\n\n---\n\n".join(sections)


def merge_prompt_with_context(prompt: str, artifacts: list[dict[str, Any]]) -> str:
    context_block = build_context_block(artifacts)
    if not context_block:
        return prompt
    return f"{context_block}\n\nUser request:\n{prompt}"

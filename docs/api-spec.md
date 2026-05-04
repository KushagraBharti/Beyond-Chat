# Beyond Chat API Spec

## Runtime Contract

- Public:
  - `GET /`
  - `GET /api/health`
  - `GET /api/status/providers`
- Protected routes require:
  - `Authorization: Bearer <supabase_access_token>`
- Optional active-workspace header:
  - `X-Workspace-Id: <workspace-id>`

Hosted runtime authentication is Supabase-only. Local bypass is not part of the supported API contract.

## Response Conventions

- Some routes use `{ "data": ..., "error": null }`
- Some routes use route-specific payloads like `{ "workspace": ... }` or `{ "items": [...] }`
- Export routes return raw file responses

## Public Routes

### `GET /`

```json
{
  "service": "beyond-chat-backend",
  "status": "ok"
}
```

### `GET /api/health`

```json
{
  "status": "ok",
  "message": "Backend is reachable"
}
```

### `GET /api/status/providers`

```json
{
  "providers": {
    "openrouter": {
      "status": "connected",
      "label": "OpenRouter",
      "details": "..."
    }
  }
}
```

Valid provider states:

- `connected`
- `disconnected`
- `not_configured`
- `error`

Current provider keys include OpenRouter, Exa, Dexter, Financial Datasets, OpenRouter Images, Supabase, Supabase Storage, Google Calendar, Notion, Google Drive, and Slack. Unimplemented connectors report `not_configured` rather than returning fake data.

## Auth And Workspace

### `POST /api/auth/bootstrap`

Ensures the authenticated user resolves to a workspace.

```json
{
  "data": {
    "workspace": {
      "id": "workspace-id",
      "name": "Beyond Chat Workspace",
      "created_at": "2026-04-09T00:00:00Z"
    },
    "role": "admin",
    "created": true,
    "source": "supabase_jwt"
  },
  "error": null
}
```

### `GET /api/workspace`

```json
{
  "workspace": {
    "id": "workspace-id",
    "name": "Beyond Chat Workspace",
    "created_at": "2026-04-09T00:00:00Z"
  },
  "authSource": "supabase_jwt"
}
```

### `GET /api/reminders`

```json
{
  "items": [
    {
      "id": "reminder-id",
      "title": "Follow up",
      "note": "Review the latest artifact",
      "due_at": "2026-04-10T09:00:00Z",
      "status": "open",
      "source": "internal",
      "workspace_id": "workspace-id",
      "created_at": "2026-04-09T00:00:00Z"
    }
  ]
}
```

## Chat

### `GET /api/chat/threads`

```json
{
  "collections": [
    {
      "id": "collection-id",
      "workspace_id": "workspace-id",
      "kind": "project",
      "title": "Launch"
    }
  ],
  "threads": [
    {
      "id": "thread-id",
      "workspace_id": "workspace-id",
      "collection_id": "collection-id",
      "collection_type": "project",
      "studio": "chat",
      "title": "Launch thread",
      "model": "openai/gpt-4o-mini",
      "prompt": "Summarize...",
      "metadata": {}
    }
  ]
}
```

### `POST /api/chat/threads`

```json
{
  "title": "Thread title",
  "collection_id": "optional-collection-id",
  "collection_type": "chat",
  "studio": "chat",
  "model": "openai/gpt-4o-mini",
  "prompt": "Optional prompt"
}
```

Response:

```json
{
  "thread": {}
}
```

### `GET /api/chat/threads/{thread_id}`

Response:

```json
{
  "thread": {
    "id": "thread-id",
    "messages": []
  }
}
```

### `POST /api/chat/threads/{thread_id}/messages`

```json
{
  "content": "Please summarize this draft",
  "model": "openai/gpt-4o-mini",
  "context_ids": ["artifact-id"]
}
```

When `context_ids` are supplied, the backend resolves the artifacts owned by the authenticated user profile and merges their title, summary, provenance, and bounded content into the provider prompt. The persisted user message remains the user's original content, with selected context recorded in message metadata.

Assistant chat messages can be saved from the frontend as `chat_response` artifacts with thread title, message id, and selected context metadata.

Response:

```json
{
  "userMessage": {},
  "assistantMessage": {}
}
```

### `POST /api/chat/compare`

```json
{
  "prompt": "Compare these outputs",
  "models": ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet"],
  "context_ids": [],
  "tools": [],
  "tool_choice": null
}
```

Response:

```json
{
  "results": [
    {
      "model": "openai/gpt-4o-mini",
      "status": "completed",
      "content": "Result text",
      "latencyMs": 1200,
      "error": null,
      "toolCalls": [],
      "finishReason": "stop"
    }
  ]
}
```

When `tools` and `tool_choice` are provided, the backend passes them through to OpenRouter for each selected model. Returned OpenRouter `tool_calls` are preserved in `toolCalls` so Compare can display requested tool use instead of flattening the response to text only.

## Runs

### `POST /api/runs`

Supported studios:

- `chat`
- `writing`
- `research`
- `image`
- `data`
- `finance`

```json
{
  "studio": "research",
  "title": "Research run",
  "prompt": "Investigate the market",
  "model": "openai/gpt-4o-mini",
  "context_ids": [],
  "options": {}
}
```

Response:

```json
{
  "run": {}
}
```

Research runs require live Exa search. Completed Research outputs are source-backed markdown reports with Executive Summary, Key Findings, Competitor or Landscape Matrix, Opportunity/Risk Matrix, Recommended Next Steps, and Sources sections; matrix sections should use markdown tables when evidence supports them.

Writing targeted edit mode uses the same run endpoint with bounded selected-range context instead of sending or regenerating an entire long document:

```json
{
  "studio": "writing",
  "title": "Edit section",
  "prompt": "Make this paragraph more executive.",
  "model": "openai/gpt-4o-mini",
  "options": {
    "mode": "targeted_edit",
    "selected_text": "The selected paragraph to revise.",
    "before_context": "Short bounded text before the selected range.",
    "after_context": "Short bounded text after the selected range."
  }
}
```

The Writing Studio frontend can save the current assistant draft or targeted edit suggestion as a `writing` artifact, preserving originating run provenance when the suggestion came from a run.
The Writing editor exposes artifact context selection and sends selected `context_ids` into writing runs and writing Compare calls. Saved writing documents and assistant suggestions retain those context IDs in artifact metadata.

The run records `prepare_targeted_edit` and `targeted_edit` steps. The output `content` is only the replacement markdown for the selected range.

Writing multi-output mode creates multiple documents from one live writing run:

```json
{
  "studio": "writing",
  "title": "Writing launch kit",
  "prompt": "Use the attached launch context.",
  "context_ids": ["artifact-id"],
  "options": {
    "mode": "multi_output",
    "documents": [
      { "title": "Executive Launch Brief", "brief": "Summarize the decision and evidence." },
      { "title": "Launch Email", "brief": "Draft the launch email." }
    ]
  }
}
```

The output contains `documents`, each with `title`, `summary`, and markdown `content`. The Writing library can save each returned document as a separate `writing` artifact with the same `source_run_id` and selected context metadata.

Image runs also accept the standard `context_ids` field. When supplied, the backend merges selected artifact content into the prompt before the image prompt enhancement step, so generated images can be grounded in prior writing, research, data, finance, or chat artifacts. The Image Studio frontend exposes Context Builder and stores selected context IDs in saved image artifact metadata.

### `GET /api/runs/{run_id}`

```json
{
  "run": {
    "id": "run-id",
    "workspace_id": "legacy-workspace-id",
    "ownerProfileId": "supabase-user-id",
    "createdBy": "supabase-user-id"
  }
}
```

### `GET /api/runs/{run_id}/steps`

```json
{
  "steps": []
}
```

Research and Finance output panels can pass completed run markdown into downstream studios using route state. Research can continue into Data, Finance, Writing, or Compare; Finance can continue into Writing or Compare.

## Artifacts

### `POST /api/artifact`
### `POST /api/artifacts`

```json
{
  "title": "Artifact title",
  "type": "document",
  "studio": "writing",
  "content": "Artifact body",
  "summary": "Optional summary",
  "content_format": "markdown",
  "metadata": {},
  "tags": ["launch"],
  "preview_image": null,
  "content_json": null,
  "source_run_id": null,
  "storage_path": null
}
```

Response:

```json
{
  "data": {
    "id": "artifact-id",
    "workspace_id": "legacy-workspace-id",
    "ownerProfileId": "supabase-user-id",
    "createdBy": "supabase-user-id"
  },
  "error": null
}
```

### `GET /api/artifact/search`

Query params:

- `q`
- `studio`
- `type`
- `tags`
- `date_from`
- `date_to`
- `limit`

Response:

```json
{
  "data": []
}
```

### `GET /api/artifacts`

Response:

```json
{
  "items": []
}
```

### `GET /api/artifact/{artifact_id}`
### `GET /api/artifacts/{artifact_id}`

Response:

```json
{
  "data": {
    "id": "artifact-id"
  },
  "error": null
}
```

### `POST /api/artifact/{artifact_id}/export`
### `POST /api/artifacts/{artifact_id}/export`

```json
{
  "format": "markdown"
}
```

Response content types:

- `text/markdown`
- `application/pdf`

### `POST /api/artifacts/export-bundle`

Exports a selected set of authenticated user artifacts as one Markdown bundle.

```json
{
  "title": "Cinder Orange Launch Kit",
  "artifact_ids": ["artifact-1", "artifact-2"]
}
```

Response content type:

- `text/markdown`

### `POST /api/export`

Legacy export alias:

```json
{
  "artifact_id": "artifact-id",
  "format": "pdf"
}
```

## Storage

### `POST /api/data/preview`

Parses an uploaded data file from Supabase Storage and returns a tabular preview plus profile metadata.
Supported file types:

- CSV
- XLSX
- XLS

```json
{
  "storage_path": "workspace-id/artifact-id/file.xlsx"
}
```

```json
{
  "data": {
    "fileType": "excel",
    "headers": ["region", "revenue"],
    "rows": [["North", "1200"]],
    "profile": {
      "rowCount": 2,
      "columnCount": 2,
      "columns": [
        { "name": "region", "dtype": "object", "missing": 0 }
      ]
    }
  },
  "error": null
}
```

### `POST /api/data/analyze`

Parses an uploaded CSV/XLSX/XLS from Supabase Storage, profiles it with pandas, sends the dataset profile and preview to OpenRouter, records run steps, and returns chart/table/insight JSON.
The JSON result includes `insight`, `metrics`, `risks`, `recommendations`, `chart_type`, `chart_data`, and `table`.
The Data Studio UI can save the combined report plus separate `chart` and `table` artifacts from this response.
The combined report artifact preserves the metrics, risks, and recommendations in Markdown plus the full JSON payload.
The Data Studio UI can also continue the generated markdown analysis into Finance, Writing, or Compare without requiring manual copy/paste.
Data accepts a route-prefilled prompt from upstream Research/Finance output handoffs.

```json
{
  "storage_path": "workspace-id/artifact-id/file.csv",
  "prompt": "Find the strongest revenue regions",
  "model": "openai/gpt-4o-mini"
}
```

### `POST /api/storage/artifacts/upload`

Multipart upload with `file`, optional `artifact_id`.

```json
{
  "data": {
    "artifactId": "artifact-or-generated-id",
    "bucket": "artifacts",
    "path": "workspace-id/artifact-id/file.png",
    "signedUrl": "https://..."
  },
  "error": null
}
```

### `POST /api/storage/artifacts/signed-url`

```json
{
  "path": "workspace-id/artifact-id/file.png",
  "expires_in": 3600
}
```

```json
{
  "data": {
    "bucket": "artifacts",
    "path": "workspace-id/artifact-id/file.png",
    "signedUrl": "https://...",
    "expiresIn": 3600
  },
  "error": null
}
```

## Integrations

### `POST /api/integrations/google-calendar/connect-start`
### `GET /api/integrations/google-calendar/status`
### `GET /api/integrations/google-calendar/events`

Returns `{ "items": [] }` until a real calendar data path is connected. The endpoint does not emit deterministic preview events.

## Error Model

- `400` malformed input or unsupported studio
- `401` missing or invalid authentication
- `403` workspace/path mismatch
- `404` missing artifact or run
- `503` missing provider or Supabase configuration

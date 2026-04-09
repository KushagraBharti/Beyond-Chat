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
  "model": "openai/gpt-4o-mini"
}
```

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
  "context_ids": []
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
      "error": null
    }
  ]
}
```

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

### `GET /api/runs/{run_id}`

```json
{
  "run": {}
}
```

### `GET /api/runs/{run_id}/steps`

```json
{
  "steps": []
}
```

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
    "id": "artifact-id"
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

### `POST /api/export`

Legacy export alias:

```json
{
  "artifact_id": "artifact-id",
  "format": "pdf"
}
```

## Storage

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

These remain scaffolded integration endpoints behind authenticated context.

## Error Model

- `400` malformed input or unsupported studio
- `401` missing or invalid authentication
- `403` workspace/path mismatch
- `404` missing artifact or run
- `503` missing provider or Supabase configuration

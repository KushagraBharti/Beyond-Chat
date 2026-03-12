# Beyond Chat API Specification

## Authentication Model

- Public routes:
  - `GET /`
  - `GET /api/health`
  - `GET /api/status/providers`
- Protected routes require one of:
  - `Authorization: Bearer <supabase_access_token>`
  - local bypass headers when `ALLOW_LOCAL_AUTH_BYPASS=true`
- Request context is resolved in middleware and enforced through the shared dependency layer.
- Optional workspace override header:
  - `X-Workspace-Id: <workspace-id>`

## Normalized Response Conventions

- Most JSON routes return either:
  - `{ "data": ..., "error": null }`
  - route-specific payloads such as `{ "workspace": ... }` or `{ "items": [...] }`
- Export routes return raw file responses.
- Provider-backed routes return explicit readiness states instead of failing silently.

## Public Routes

### `GET /`

- Purpose: basic root banner
- Response:

```json
{
  "app": "Beyond Chat API",
  "status": "ok"
}
```

### `GET /api/health`

- Purpose: backend liveness check
- Response:

```json
{
  "status": "ok",
  "message": "Backend is reachable"
}
```

### `GET /api/status/providers`

- Purpose: expose normalized provider availability
- Response shape:

```json
{
  "providers": {
    "openrouter": {
      "status": "connected",
      "label": "OpenRouter",
      "details": "..."
    },
    "tavily": {
      "status": "not_configured",
      "label": "Tavily",
      "details": "..."
    },
    "googleCalendar": {
      "status": "disconnected",
      "label": "Google Calendar",
      "details": "..."
    }
  }
}
```

Status values:

- `connected`
- `disconnected`
- `not_configured`
- `error`

## Auth and Workspace Routes

### `POST /api/auth/bootstrap`

- Purpose: ensure the current user has a profile, workspace, and membership
- Auth: required in production
- Response:

```json
{
  "data": {
    "workspace": {
      "id": "workspace-id",
      "name": "Beyond Chat Workspace"
    },
    "role": "admin",
    "created": true,
    "source": "supabase_jwt"
  },
  "error": null
}
```

### `GET /api/workspace`

- Purpose: fetch active workspace metadata and auth mode information
- Auth: required in production
- Response:

```json
{
  "workspace": {
    "id": "workspace-id",
    "name": "Beyond Chat Workspace",
    "created_at": "2026-03-11T12:00:00Z"
  },
  "mvpBypassEnabled": true,
  "authSource": "local_bypass"
}
```

### `GET /api/reminders`

- Purpose: fetch reminder cards for the workspace home surface
- Auth: required in production
- Response:

```json
{
  "items": [
    {
      "id": "reminder-id",
      "title": "Follow up on artifact export",
      "dueAt": "2026-03-12T09:00:00Z"
    }
  ]
}
```

## Chat Routes

### `GET /api/chat/threads`

- Purpose: list threads for the active workspace
- Auth: required in production
- Response:

```json
{
  "items": [
    {
      "id": "thread-id",
      "title": "Market research",
      "studio": "chat"
    }
  ]
}
```

### `POST /api/chat/threads`

- Purpose: create a thread and optionally seed the first prompt
- Auth: required in production
- Request:

```json
{
  "title": "Thread title",
  "collection_id": "optional-collection-id",
  "collection_type": "chat",
  "studio": "chat",
  "model": "openai/gpt-4o-mini",
  "prompt": "Optional first prompt"
}
```

### `GET /api/chat/threads/{thread_id}`

- Purpose: fetch a single thread with messages
- Auth: required in production

### `POST /api/chat/threads/{thread_id}/messages`

- Purpose: append a user message and generate the assistant reply
- Auth: required in production
- Request:

```json
{
  "content": "Please summarize this draft",
  "model": "openai/gpt-4o-mini"
}
```

### `POST /api/chat/compare`

- Purpose: run the same prompt against multiple models
- Auth: required in production
- Request:

```json
{
  "prompt": "Compare these outputs",
  "models": ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet"],
  "context_ids": []
}
```

## Run Routes

### `POST /api/runs`

- Purpose: create a run for `writing`, `research`, `image`, `data`, `finance`, or `chat`
- Auth: required in production
- Request:

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

Errors:

- `400` unsupported studio
- `503` provider not configured

### `GET /api/runs/{run_id}`

- Purpose: fetch run summary and output
- Auth: required in production

### `GET /api/runs/{run_id}/steps`

- Purpose: fetch step timeline for a run
- Auth: required in production

## Artifact Routes

### `POST /api/artifact`

### `POST /api/artifacts`

- Purpose: create or update an artifact record
- Auth: required in production
- Request:

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
  "preview_image": null
}
```

### `GET /api/artifact/search`

- Purpose: search/filter artifacts
- Auth: required in production
- Query params:
  - `q`
  - `studio`
  - `type`
  - `tags`
  - `date_from`
  - `date_to`
  - `limit`

### `GET /api/artifacts`

- Purpose: list artifacts in item-array form
- Auth: required in production
- Query params: same as `/api/artifact/search`

### `GET /api/artifact/{artifact_id}`

### `GET /api/artifacts/{artifact_id}`

- Purpose: fetch a single artifact
- Auth: required in production

### `POST /api/artifact/{artifact_id}/export`

### `POST /api/artifacts/{artifact_id}/export`

- Purpose: export an artifact as Markdown or PDF
- Auth: required in production
- Request:

```json
{
  "format": "markdown"
}
```

- Response:
  - `text/markdown`
  - `application/pdf`

### `POST /api/export`

- Purpose: backward-compatible export alias that accepts `artifact_id` in the body
- Auth: required in production

## Storage Routes

### `POST /api/storage/artifacts/upload`

- Purpose: upload a file into the configured Supabase Storage bucket under a workspace-scoped path
- Auth: required in production
- Request: multipart form with:
  - `file`
  - optional query param `artifact_id`
- Response:

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

- Purpose: create a time-limited read URL for an existing storage object in the active workspace
- Auth: required in production
- Request:

```json
{
  "path": "workspace-id/artifact-id/file.png",
  "expires_in": 3600
}
```

## Google Calendar Integration Routes

### `POST /api/integrations/google-calendar/connect-start`

- Purpose: return a Google OAuth connect URL when the provider is in a disconnected state
- Auth: required in production

### `GET /api/integrations/google-calendar/status`

- Purpose: fetch the normalized Google Calendar provider state
- Auth: required in production

### `GET /api/integrations/google-calendar/events`

- Purpose: fetch agenda items for the home dashboard
- Auth: required in production

## Error Model

- `401` missing or invalid authentication
- `403` workspace/path mismatch
- `404` missing artifact or run
- `400` malformed input or unsupported studio
- `503` provider or Supabase service configuration missing

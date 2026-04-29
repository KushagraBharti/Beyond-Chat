# Initial API Contracts

## Contract Principles

- Health remains publicly reachable.
- All product routes except health require authenticated context.
- Provider-backed routes must fail gracefully with explicit status and error information.

## Core Endpoints

### Health

- `GET /api/health`
- Returns backend reachability status.

### Auth Bootstrap

- `POST /api/auth/bootstrap`
- Ensures the authenticated user has a workspace and workspace membership.

### Workspace

- `GET /api/workspace`
- Returns workspace identity and current auth mode metadata.

### Providers

- `GET /api/status/providers`
- Returns normalized provider states:
  - `connected`
  - `disconnected`
  - `not_configured`
  - `error`

### Chat

- `GET /api/chat/threads`
- `POST /api/chat/threads`
- `GET /api/chat/threads/{thread_id}`
- `POST /api/chat/threads/{thread_id}/messages`
- `POST /api/chat/compare`

### Runs

- `POST /api/runs`
- `GET /api/runs/{run_id}`
- `GET /api/runs/{run_id}/steps`

### Artifacts

- `POST /api/artifact`
- `GET /api/artifacts`
- `GET /api/artifact/search`
- `GET /api/artifact/{artifact_id}`
- `POST /api/artifact/{artifact_id}/export`

### Workspace Productivity

- `GET /api/reminders`

### Integrations

- `POST /api/integrations/google-calendar/connect-start`
- `GET /api/integrations/google-calendar/status`
- `GET /api/integrations/google-calendar/events`

### Storage

- `POST /api/storage/artifacts/upload`
- `POST /api/storage/artifacts/signed-url`

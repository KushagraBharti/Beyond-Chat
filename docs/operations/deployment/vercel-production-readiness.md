# Vercel production readiness

Status: **blocked for deployment**. This is a read-only inventory and preflight record; it does not authorize a deployment or an environment, domain, DNS, or Git-integration mutation.

## Immutable resource inventory

All checked-in/local links use Vercel team `team_zZPyc4iWczMNMcU7ReWg3dGc`.

| Surface | Vercel project | Immutable project ID | Local deployment root |
| --- | --- | --- | --- |
| Frontend | `beyond-chat-production` | `prj_oq31gdbP117PJBxU3A0v87ewWqdr` | `frontend/` (the repository root and `frontend/` links resolve to the same project) |
| FastAPI control plane | `beyond-chat-backend` | `prj_LVvFbBJ4ksVdgGTkBwJdZ82mAIZu` | `backend/` |
| Temporary sandbox runner | `beyond-chat-sandbox-runner` | `prj_C0NH6PmkehZKvrVbWjijd6G9l18k` | `backend/sandbox-runner/` |

The frontend ID and team ID were also corroborated through the connected Vercel project interface. The backend and runner IDs are currently corroborated only by their local `.vercel/project.json` links because the local Vercel CLI is not authenticated.

## Topology and build contract

The current deployment topology is three Vercel projects, not a single root deployment:

| Surface | Framework/build | Output/runtime | Routing |
| --- | --- | --- | --- |
| Frontend | Vite; `npm install`, then `npm run build` | `dist/` static output | SPA fallback; `/api/*` is proxied using the target-scoped server-side `API_BASE_URL` |
| Backend | Vercel Python auto-build from `backend/api/index.py` | FastAPI serverless function | All paths rewrite to `/api/index.py` |
| Sandbox runner | TypeScript/Vercel Functions | `public/` plus `api/run.ts`; max duration 300 seconds | `/api/run` is POST-only |

The sandbox runner is transitional and must be retained only until the Modal path reaches parity and its rollback window closes.

## Current hosted state

- Frontend production domains: `beyond-chat-production.vercel.app` and `beyond-chat-production-kushagras-projects-5d330ca5.vercel.app`.
- Latest visible frontend deployment: `dpl_8ZSswK2T7BUvBDfvVzUc6xX1ZgGt`, target `production`, state `READY`, created `2026-07-11 08:54:09Z`, source `cli`, Git ref `main`, Git SHA `67878080cc4355a4cdb982df7a966d50ad6a956f`.
- HTTP smoke check on 2026-07-11: frontend `/` returned 200, frontend `/api/health` returned 200, direct backend `/api/health` returned 200, and runner GET `/api/run` returned the expected 405.
- The current checkout is on `main` at `0c9bdbaad36cac1d451ad0cd7865447f3f0814a2`; it is not the commit represented by the visible production deployment.
- The visible frontend deployment was CLI-created. Its Git metadata proves source context, but does not prove that Vercel Git auto-deployment is enabled. Git binding and the backend/runner deployment lists require authenticated CLI verification.

## Preview-safe API routing

`frontend/vercel.json` no longer hardcodes the production backend. It expands `API_BASE_URL` at the Vercel routing layer. Configure it independently per target:

- Production: the production backend origin.
- Preview: a preview/test backend origin approved for preview data and credentials. Do not reuse the production backend or production data plane.
- Local Vite development: no Vercel variable is needed; `vite.config.mjs` proxies `/api` to `http://127.0.0.1:8000`.

Because `API_BASE_URL` is server-side routing configuration, it is not exposed in the Vite browser bundle. A target without the variable cannot silently fall back to production.

## Environment-name readiness

The canonical manifest currently requires these backend names in both preview and production:

`APP_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_COOKIE_PASSWORD`, `WORKOS_REDIRECT_URI`, `WORKOS_LOGOUT_URI`, `WORKOS_WEBHOOK_SECRET`.

The current feature-gate state makes no frontend or sandbox-runner variable required. Conditional provider variables remain required only when their corresponding feature gate is enabled. Vercel-managed names such as `VERCEL_*` are not application gaps.

Known gap: `API_BASE_URL` is required by frontend routing but is not yet declared for the `frontend` surface in `scripts/config/environment-manifest.json`. That manifest is outside this deployment-readiness edit scope and must be updated by its owner before any environment write or production deployment.

Actual Vercel variable names and targets could not be compared: the local CLI reports no existing credentials. Do not infer readiness from local `.env` files and do not print or pull values during the audit. After authenticating the CLI, list names/targets only:

```powershell
cd frontend
npm exec --yes --package=vercel@50.28.0 -- vercel env ls preview
npm exec --yes --package=vercel@50.28.0 -- vercel env ls production

cd ..\backend
npm exec --yes --package=vercel@50.28.0 -- vercel env ls preview
npm exec --yes --package=vercel@50.28.0 -- vercel env ls production

cd sandbox-runner
npm exec --yes --package=vercel@50.28.0 -- vercel env ls preview
npm exec --yes --package=vercel@50.28.0 -- vercel env ls production
```

For each of the same three roots, complete the remaining read-only inventory with:

```powershell
npm exec --yes --package=vercel@50.28.0 -- vercel project inspect
npm exec --yes --package=vercel@50.28.0 -- vercel list --format=json
npm exec --yes --package=vercel@50.28.0 -- vercel inspect <deployment-url-or-id> --format=json
```

## Release blockers

1. Restore authenticated Vercel CLI access and reverify every project/team ID before running any command that can mutate Vercel.
2. Declare `API_BASE_URL` in the canonical environment manifest for the frontend preview and production surfaces, then configure separate target-scoped values in Vercel.
3. Inventory variable names/targets for all three projects and resolve required-name gaps without exposing values.
4. Verify project settings (root directory, install/build/output commands, framework), production domains, and Git binding for all three projects using authenticated read-only inspection.
5. List and inspect recent backend and runner deployments; record known-good rollback deployment IDs.
6. Build and smoke-test a preview against non-production dependencies before promotion.

## Validation evidence

- `npm run build` in `frontend/` passed on 2026-07-11 (Vite 8.1.4, 1,366 modules transformed).
- Pinned `vercel@50.28.0 build` found and parsed `frontend/vercel.json`, then stopped before a Vercel build because local project settings have not been pulled and the CLI has no credential. This is an external-readiness blocker, not a local Vite build failure.
- The Vite build retained the existing large-chunk warning for `LandingScene3D`; this deployment-readiness change did not introduce or modify that product code.

## Deploy and rollback commands (do not run until blockers clear)

Run commands from the named deployment root so the immutable local link selects the intended project. Pin Vercel CLI `50.28.0`.

Frontend preview, validation, and production promotion:

```powershell
cd frontend
npm install
npm run build
npm exec --yes --package=vercel@50.28.0 -- vercel pull --yes --environment=preview
npm exec --yes --package=vercel@50.28.0 -- vercel build
npm exec --yes --package=vercel@50.28.0 -- vercel deploy --prebuilt
# Smoke-test the returned preview URL, then promote the exact tested artifact:
npm exec --yes --package=vercel@50.28.0 -- vercel promote <validated-preview-url>
```

Backend preview and production promotion:

```powershell
cd backend
uv sync
npm exec --yes --package=vercel@50.28.0 -- vercel pull --yes --environment=preview
npm exec --yes --package=vercel@50.28.0 -- vercel build
npm exec --yes --package=vercel@50.28.0 -- vercel deploy --prebuilt
# After /api/health and auth/control-plane smoke tests:
npm exec --yes --package=vercel@50.28.0 -- vercel promote <validated-preview-url>
```

Temporary runner preview and production promotion:

```powershell
cd backend\sandbox-runner
npm install
npm run typecheck
npm exec --yes --package=vercel@50.28.0 -- vercel pull --yes --environment=preview
npm exec --yes --package=vercel@50.28.0 -- vercel build
npm exec --yes --package=vercel@50.28.0 -- vercel deploy --prebuilt
# After POST contract/authentication tests:
npm exec --yes --package=vercel@50.28.0 -- vercel promote <validated-preview-url>
```

Rollback from the affected project root:

```powershell
npm exec --yes --package=vercel@50.28.0 -- vercel rollback <known-good-production-deployment-url-or-id>
```

Prefer promotion of an already-tested preview over a fresh production rebuild. A database or provider change needs its own approved recovery sequence before application promotion or rollback.

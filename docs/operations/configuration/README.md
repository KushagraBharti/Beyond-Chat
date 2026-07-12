# Environment and deployment configuration

`scripts/config/environment-manifest.json` is the canonical inventory for configuration names. It records each variable's type, owner, provider, sensitivity, allowed surface, environment requirement, compatibility alias, and feature gate. Environment templates are human-friendly projections of that manifest; they are not a second source of truth.

Current Phase 0–2 pass/fail evidence is recorded in
[phase0-2-gate-audit.md](phase0-2-gate-audit.md). Configuration-name presence is
never a substitute for the live provider evidence in that audit.

Beyond uses three environments: local development, ephemeral Vercel previews, and production. There is no standing staging product. Preview and production must use different provider applications, webhook endpoints, databases, and credentials wherever a provider supports isolation. A preview deployment must never receive a production database service role, WorkOS cookie password, webhook secret, Stripe secret, or provider API key.

## Validate names without exposing values

The validator records assignment names only. It does not parse, compare, or print the right-hand side of an assignment.

```powershell
node scripts/config/validate-environment.mjs --environment local --surface backend --file backend/.env
node scripts/config/validate-environment.mjs --environment preview --surface frontend --file frontend/.env.local
node scripts/config/validate-environment.mjs --environment production --surface backend
```

When `--file` is omitted, validation inspects names in the current process environment. The report contains only names in five categories:

- `missing`: required by the manifest and not assigned;
- `unknown`: assigned but absent from the manifest and provider-managed allowlist;
- `conflicts`: duplicated across input files, supplied to the wrong surface, or canonical and compatibility alias both assigned;
- `forbidden`: explicitly prohibited for the selected environment;
- `present`: assignment name exists; this is not proof that its value is valid.

The validator exits non-zero for missing, unknown, conflicting, or forbidden names. It deliberately does not validate credential contents or contact providers.

## Surface templates

| Surface | Template | Secret destination |
|---|---|---|
| Backend control plane | `backend/env.example` | `backend/.env` locally; backend Vercel project otherwise |
| Browser frontend | `frontend/env.example` | Public configuration only; frontend Vercel project otherwise |
| Legacy Vercel sandbox runner | `backend/sandbox-runner/env.example` | Runner Vercel project only while the legacy gate exists |
| Modal operator CLI | `env.example` | Local untracked environment or the Modal CLI credential store |

Do not copy the backend template into the frontend. `VITE_*` values are embedded in the browser bundle and therefore must be public. In particular, Supabase service-role, WorkOS, OpenRouter, Composio, Modal, and Stripe secrets are forbidden on the frontend even if a build tool would accept them.

## Provider configuration

### Vercel

Maintain separate frontend and backend projects, plus the legacy sandbox-runner project only until Modal replacement is complete. Scope every name independently to Development, Preview, or Production in the Vercel dashboard. Vercel-provided names such as `VERCEL`, `VERCEL_*`, and `VERCEL_OIDC_TOKEN` are managed and must not be copied into templates or committed.

Use `vercel env pull <path> --environment=<development|preview|production>` only into ignored `.env.local` files. A pull replaces the target file, so keep manual overrides elsewhere. This repository does not require or authorize provider mutation as part of configuration validation.

Static deployment caveat: `frontend/vercel.json` currently rewrites `/api/*` to the production backend hostname. Until API routing becomes environment-aware, preview deployments are not isolated from the production backend and must not be treated as production-ready.

### Supabase

The backend requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for the canonical data plane. The service-role key is server-only. `SUPABASE_ANON_KEY` and the two `VITE_SUPABASE_*` names are compatibility configuration for the isolated legacy browser adapter; their gate is off in all canonical environments.

Use separate Supabase projects for preview and production. Confirm migration state, RLS/advisor status, storage policies, and the project represented by each URL out of band; name presence cannot prove any of those properties.

### WorkOS

The backend owns AuthKit. Production and preview require `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_COOKIE_PASSWORD`, `WORKOS_REDIRECT_URI`, `WORKOS_LOGOUT_URI`, and `WORKOS_WEBHOOK_SECRET`. Register exact, environment-specific HTTPS redirect, logout, webhook, and web-origin URLs in WorkOS. Cookie passwords must be independently generated per environment and at least 32 high-entropy characters.

`WORKOS_ISSUER` may be derived from the client ID. Cookie-name variables are optional defaults. `VITE_WORKOS_CSRF_COOKIE_NAME` is public and must match the backend CSRF cookie name; no WorkOS secret belongs in the browser.

### Modal

`MODAL_TOKEN_ID` and `MODAL_TOKEN_SECRET` are operator/control-plane credentials. They are allowed only in a local operator environment and are forbidden in preview/production application environments. Never forward Modal, Supabase service-role, Stripe, WorkOS, Composio, or OpenRouter credentials into a task sandbox. Runtime access should use a narrowly scoped Modal Secret attached to the sidecar/control plane after the Modal execution gate is approved.

### Composio

`COMPOSIO_API_KEY` is backend-only and conditional on the `composio_actions` gate. Do not expose it to the frontend or task sandbox. Before enabling the gate, configure separate preview/production projects, OAuth callback URLs, allowed integrations/actions, and policy/approval boundaries.

### OpenRouter and data providers

`OPENROUTER_API_KEY` is conditional on `live_models`. Exa, Financial Datasets, and X credentials have independent research, finance, and social gates. The legacy sandbox runner receives these keys because that implementation executes Dexter directly; the target Modal design keeps provider credentials in the trusted sidecar and out of the sandbox.

Before enabling live models, approve model/provider allowlists, retention/data-handling policy, spend limits, request attribution, and failure behavior separately for preview and production.

### Stripe

Billing v2 is disabled unless `BILLING_V2_ENABLED=true`. Its canonical names are `STRIPE_SECRET_KEY`, `STRIPE_BILLING_V2_PRICE_ID`, and `STRIPE_BILLING_V2_WEBHOOK_SECRET`. `STRIPE_PRO_PRICE_ID` and `STRIPE_WEBHOOK_SECRET` remain explicit compatibility aliases for legacy routes. Do not assign a canonical name and its alias together; the validator reports that as a conflict.

Before enabling billing, create the Beyond product/price, register an environment-specific webhook, verify signatures and replay tolerance, prove checkout/portal/cancellation flows, and confirm server-side entitlement updates. Name presence alone is not evidence that a live price or webhook is correct.

## Live gate defaults

Only core URLs, Supabase data, and WorkOS auth are enabled in the canonical manifest. These gates remain disabled in local, preview, and production until their owner approves the provider and runtime path:

- legacy Supabase browser auth;
- live model calls;
- Exa research, Financial Datasets finance, and X social search;
- Google Calendar OAuth;
- legacy Vercel Dexter runner;
- Modal execution;
- Composio actions;
- Stripe billing v2 and legacy billing.

Changing a gate in the manifest documents readiness intent; it does not itself enable application behavior. Runtime/product gates must still fail closed.

## Secret handling

All `.env`, `.env.*`, and `*.local` files are ignored. Committed `env.example` files contain names and non-secret local defaults only. Session transcripts and local attachment directories are ignored because they may contain credentials or personal data. Never paste provider values into issue comments, validation output, screenshots, build logs, or readiness reports.

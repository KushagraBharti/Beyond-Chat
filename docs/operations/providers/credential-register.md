# Credential Register

This register records credential contracts, never values. “Local” means an ignored file or OS credential store. “Production” means a write-only provider secret store.

Evidence captured: **2026-07-12 UTC**, against commit
**`a90849180a3f1c230d989bebcf57442382c4778d`**. An ignored local `.env` is a
noncanonical projection and never proves provider ownership. Credential posture
must be superseded explicitly by a later dated, commit-scoped record.

| Credential name | Service owner | Allowed locations | Forbidden locations | Rotation/event rule | Current posture |
|---|---|---|---|---|---|
| GitHub CLI OAuth token | Engineering owner | OS keyring | Repo files, Vercel, Modal | Replace now with least privilege; rotate on collaborator/device loss | Authenticated but scopes are broader than required |
| Vercel CLI token/session | Engineering owner | Vercel CLI credential store | Repo/env files | Reauthenticate on revocation; prefer OIDC for CI | Authenticated |
| Supabase CLI token | Data owner | Supabase CLI credential store | Repo/env files | Rotate on device/collaborator loss | Session returns 401 Unauthorized as of 2026-07-12; reauthentication required |
| `VITE_SUPABASE_URL` | Frontend | Frontend Vercel Production; ignored frontend env | Backend-only secret stores | Change only with project migration | Public configuration |
| `VITE_SUPABASE_ANON_KEY` or publishable equivalent | Frontend | Frontend Vercel Production; ignored frontend env | Do not treat as authorization | Rotate on project key rotation | Public/publishable, protected by RLS |
| `SUPABASE_URL` | Backend | Backend Vercel; ignored backend env | Frontend project unless explicitly public alias | Change only with project migration | Runtime reports configured |
| `SUPABASE_ANON_KEY` | Backend | Backend Vercel; ignored backend env | Frontend under an unprefixed duplicate | Rotate with Supabase keys | Runtime reports configured |
| `SUPABASE_SERVICE_ROLE_KEY` | Data owner | Backend Vercel only; tightly controlled local env | Frontend, Modal sandbox, runner, logs | Rotate before pilot and after any suspected exposure | Removed from frontend project |
| database password/direct URL | Data owner | Supabase/secret manager; migration operator only | Frontend, Modal, application runtime unless required | Rotate before pilot; rotate after backup/reset operators finish | Removed from frontend project |
| `OPENROUTER_API_KEY` | Agent runtime owner | Backend and temporary legacy runner Vercel; ignored matching local envs | Frontend, docs, browser storage | Rotate at least quarterly or on exposure; cap monthly spend | Fresh key, `$25` monthly reset cap, API verified |
| `EXASEARCH_API_KEY` | Research owner | Backend and only runtimes that directly call Exa | Frontend, docs | Quarterly/on exposure; monitor request budget | Direct probe 200 |
| `FINANCIAL_DATASETS_API_KEY` | Finance owner | Backend and finance runtime only | Frontend, general client | Quarterly/on exposure; contract review | Direct probe 200 |
| `COMPOSIO_API_KEY` | Integration gateway owner | Backend control plane only | Frontend, Modal sandbox, legacy runner | Rotate after integration validation, then quarterly/on exposure | Scoped runtime key; six required permission areas |
| Composio legacy full-access key | Integration admin | Admin secret store only | Application runtime | Revoke immediately after scoped-key integration passes | Rotation/revocation remains blocked on shipped runtime exercising the narrow scoped key; legacy key must not be wired |
| `DEXTER_RUNNER_SHARED_SECRET` | Runtime owner | Backend + temporary runner only; ignored local files | Frontend/docs | Rotate on deploy owner change or exposure; replace with Modal identity later | Fresh 256-bit value, synchronized 2026-07-11 |
| `WORKOS_API_KEY` | Identity owner | Backend Vercel only | Frontend, sandbox | Quarterly/on exposure | Production auth succeeds, proving a usable backend identity path; credential value and exact provider-key ownership remain intentionally unrecorded |
| `WORKOS_CLIENT_ID` | Identity owner | Backend and public auth config where SDK requires | Do not use as a secret | Changes with selected application | Canonical client selected and installed as Sensitive in backend Vercel Production only |
| `WORKOS_COOKIE_PASSWORD` | Identity owner | Backend Vercel only | Frontend, logs | 32+ random bytes; rotate with session invalidation plan | Fresh 384-bit random value installed as Sensitive in backend Vercel Production; value never recorded |
| WorkOS webhook secret | Identity owner | Backend Vercel only | Frontend/sandbox | Rotate on endpoint recreation/exposure | Not created; no endpoint exists yet, so creating one would be premature |
| Stripe CLI session | Billing owner | Stripe CLI credential store | Repo/Vercel | Refresh before expiration; revoke lost devices | Live/test access through 2026-10-08 |
| `STRIPE_SECRET_KEY` | Billing owner | Backend Vercel only | Frontend, runner, Modal | Rotate on exposure; key must match intended account | Intended-account key not installed; ignored local assignment is noncanonical and mismatched; live Stripe remains blocked |
| `STRIPE_WEBHOOK_SECRET` | Billing owner | Backend Vercel only | Frontend/runner | Rotate when webhook endpoint changes | Deferred; existing value not trusted |
| `STRIPE_PRICE_ID` | Billing owner | Backend configuration | Never grants entitlement by itself | Update only through billing ADR/migration | Deferred; no live Beyond price |
| Modal service token/identity | Runtime owner | Modal/Vercel backend secret store as required | Frontend/sandbox payload | Prefer service identity; rotate on owner change | App/images/volumes exist, but narrow production service-identity evidence remains absent |

## Open rotation and activation blockers

- Rotate credentials exposed in local transcripts/session artifacts before
  external collaboration, pilot traffic, or commercial production; do not use
  this register as proof that rotation occurred.
- Exercise the narrow Composio runtime key through shipped code, then revoke the
  legacy full-access key and capture revocation/rollback evidence.
- Activate the intended Stripe account, install an account-matched backend key,
  and create/verify the live product, price, webhook, and controlled charge/refund
  only in the authorized billing phase. No current evidence proves live billing.

## Rotation evidence

Every rotation record must contain: credential name, provider resource ID, old-version revocation time, new-version activation time, operator, affected deployments, verification command, and rollback outcome. It must never contain either value.

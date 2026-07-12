# Canonical WorkOS Configuration

## Activation prerequisite

The canonical Production environment currently renders `Enable the Production environment` and requires a billing address and payment method. Billing activation is intentionally deferred. Do not enter payment data or enable Production without an explicit later instruction.

After activation, every mutation must target only:

- environment `environment_01KX84DX4GA5XMSN4D4FK9DFND`
- application `app_01KX84DXGTP1ZKASV4PBVSASM6`
- client `client_01KX84DX9XT83ZSTCBM0T2XC8G`

Before mutation, query the exact IDs again and assert that both canonical and legacy organization counts are still zero.

## Required AuthKit settings

| Setting | Required value |
|---|---|
| Application name | `Beyond Chat` |
| Homepage | `https://beyond-chat-production.vercel.app` |
| Initiate login | `https://beyond-chat-production.vercel.app/login` |
| Production callback | `https://beyond-chat-backend.vercel.app/api/auth/callback` |
| Local callback | `http://127.0.0.1:8000/api/auth/callback` |
| Production logout destination | `https://beyond-chat-production.vercel.app` |
| Local logout destination | `http://127.0.0.1:5173` |
| Production web origin | `https://beyond-chat-production.vercel.app` |
| Local web origin | `http://127.0.0.1:5173` |
| Access-token expiry | 300 seconds |
| Maximum session time | 604,800 seconds (7 days) |
| Inactivity timeout | 172,800 seconds (48 hours) |

## Supabase third-party identity contract

Before direct Data API, Storage, or Realtime validation, add the canonical WorkOS environment as a Supabase Third-Party Auth integration using the issuer for the canonical client. Configure the WorkOS JWT template so the Postgres `role` claim is always `authenticated`, preserve the organization role separately (for example `user_role`), and retain `iss`, `sub`, and `org_id`. The database authorization helpers map only the exact `(iss, sub)` identity and require a non-empty `org_id` that resolves to the selected active organization; a missing organization claim must fail closed.

Record the exact production issuer in `WORKOS_ISSUER`. Do not guess it from a staging client or custom auth domain, and do not rely on the WorkOS organization role claim for internal authorization.

Local values may coexist only if WorkOS supports multiple entries. They must never replace the production values.

## Branding

Use the truthful product name `Beyond Chat` and a neutral, legible theme. Do not invent or hotlink a logo, icon, support URL, privacy URL, or terms URL. Brand assets and legal URLs must be added only when an authoritative project-owned asset/page exists.

## Credential contract

1. Create one production API key only after Production is enabled.
2. Transfer it directly into Vercel backend project `prj_LVvFbBJ4ksVdgGTkBwJdZ82mAIZu` as Sensitive `WORKOS_API_KEY` scoped to Production.
3. Never place it in the frontend, Modal sandbox, logs, docs, shell history, or command-line arguments.
4. Verify only key metadata and environment-variable name/type/target; never pull or print the value.
5. Keep `WORKOS_CLIENT_ID` and `WORKOS_COOKIE_PASSWORD` backend-only until the application integration explicitly requires public client configuration.

Do not create a webhook until the backend contains a deployed, signature-verifying endpoint with replay protection and an event allowlist.

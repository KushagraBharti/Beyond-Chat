# Production environment readiness

**Snapshot date:** 2026-07-11  
**Assessment mode:** local assignment-name presence only; no values inspected, no provider queried, and no provider configuration changed.

This snapshot is intentionally conservative. A name marked present means only that an assignment exists in an inspected local file. It does not prove the value is non-empty, valid, production-scoped, correctly rotated, or installed in Vercel or another provider.

## Required canonical control plane

| Surface/provider | Present assignment names | Missing assignment names | Readiness |
|---|---|---|---|
| Backend URL | None observed | `APP_URL` | Blocked |
| Supabase backend | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | None by name | Provider/project scope unverified |
| WorkOS backend | None observed | `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_COOKIE_PASSWORD`, `WORKOS_REDIRECT_URI`, `WORKOS_LOGOUT_URI`, `WORKOS_WEBHOOK_SECRET` | Blocked |
| Frontend WorkOS public config | Uses the documented default when absent | None required | Requires deployed cookie/origin verification |

The inspected backend local environment also contains a Supabase anonymous key. That key is optional compatibility configuration and is not part of canonical WorkOS production readiness.

## Disabled live gates

The following credentials have one or more assignment names present locally, but their gates remain disabled and they are not counted as production-ready capabilities:

- OpenRouter live models;
- Exa research;
- Financial Datasets finance;
- X social search;
- Google Calendar OAuth;
- legacy Vercel Dexter runner;
- Composio actions;
- legacy Stripe billing.

Modal execution and Stripe billing v2 are also disabled. Modal operator credential presence was not assessed because those credentials must not be stored in an application env file. Billing-v2 canonical price and webhook names were not observed.

## External blockers and required evidence

1. Vercel Development/Preview/Production inventories were not queried. Install the required names in the correct project and scope, then run the validator against a name-only export or process environment.
2. Frontend preview traffic currently rewrites to the production backend hostname in `frontend/vercel.json`. Preview isolation is blocked until routing is environment-aware.
3. WorkOS needs exact production redirect/logout/webhook/web-origin registration and independently generated production cookie material.
4. Supabase URL/key name presence must be matched to the intended production project; canonical migrations, RLS, storage, and security-advisor state require separate verification.
5. Modal needs an approved runtime app, image, secret boundary, and adapter before `modal_execution` can be enabled.
6. Composio needs a deployed backend adapter, project/key installation, OAuth callbacks, action allowlists, and approval policy before `composio_actions` can be enabled.
7. OpenRouter needs production key installation plus model allowlists, retention policy, budgets, and request attribution before `live_models` can be enabled.
8. Stripe has no verified live Beyond product/price/webhook in this assessment. Keep `BILLING_V2_ENABLED=false` until end-to-end billing and entitlement verification passes.

## Go/no-go

**No-go for production.** Required WorkOS and application URL names are absent from the inspected backend environment, Vercel environment presence is unknown, and preview isolation is not correct. Disabled provider gates should remain disabled until their listed evidence exists.

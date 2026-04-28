# Auth Fixes + Stripe Payments + Rate Limiting Design

**Date:** 2026-04-27
**Status:** Approved

## Overview

Three interconnected workstreams:
1. Fix missing auth flows (password reset, email confirmation callback, loading state)
2. Implement Stripe subscription billing at $10/month (Free + Pro tiers)
3. Enforce per-user rate limits using request count and dollar spend tracking

Stack: Supabase (auth + DB + storage), FastAPI backend, React + TypeScript frontend, Stripe Checkout.

---

## Section 1: Auth Fixes

### What's missing

- No password reset flow — no "Forgot password?" link, no reset page
- No `/auth/callback` route — Supabase confirmation and reset emails link back to this URL, but it doesn't exist
- `ProtectedRoute` returns `null` while loading, causing a blank flash

### Changes

**New routes:**
- `/auth/callback` — reads Supabase URL params (`token`, `type`), exchanges token, redirects to `/dashboard` (email confirm) or `/reset-password` (password reset)
- `/reset-password` — form where user enters new password, calls `supabase.auth.updateUser({ password })`

**Modified:**
- `LoginPage.tsx` — add "Forgot password?" link that calls `supabase.auth.resetPasswordForEmail(email)` and shows confirmation message
- `ProtectedRoute.tsx` — replace `null` loading return with a centered spinner

**No backend changes needed** — Supabase handles JWT exchange natively.

---

## Section 2: Supabase Schema

Two new tables, applied via `supabase/migrations/001_billing.sql`.

### `user_plans`

One row per user. Tracks Stripe subscription state.

```sql
CREATE TABLE user_plans (
  user_id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id     TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan                   TEXT NOT NULL DEFAULT 'free',   -- 'free' | 'pro'
  status                 TEXT NOT NULL DEFAULT 'active', -- 'active' | 'cancelled' | 'past_due'
  current_period_end     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);
```

### `usage_events`

One row per AI-generating action. Indexed for monthly queries.

```sql
CREATE TABLE usage_events (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id        TEXT NOT NULL,
  event_type          TEXT NOT NULL, -- 'run' | 'message' | 'compare'
  model               TEXT,
  estimated_cost_usd  NUMERIC(10,6) DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX usage_events_user_month ON usage_events (user_id, created_at);
```

---

## Section 3: Stripe + Billing Flow

### Environment variables

| Variable | Location |
|---|---|
| `STRIPE_SECRET_KEY` | `backend/.env` |
| `STRIPE_WEBHOOK_SECRET` | `backend/.env` |
| `STRIPE_PRO_PRICE_ID` | `backend/.env` |

### Stripe product

- Product: "Beyond Chat Pro"
- Price: $10.00/month recurring

### Upgrade flow

```
User clicks "Upgrade to Pro"
  → POST /api/billing/checkout
  → Backend creates/gets Stripe Customer, creates Checkout Session
  → Returns { checkoutUrl }
  → Frontend redirects: window.location = checkoutUrl
  → User completes payment on Stripe
  → Stripe redirects to /billing/success?session_id=...
  → Stripe fires webhook → backend updates user_plans
```

### Webhook events handled

| Event | Action |
|---|---|
| `checkout.session.completed` | Set `plan=pro`, store `stripe_customer_id` + `stripe_subscription_id` |
| `invoice.payment_succeeded` | Update `current_period_end` |
| `customer.subscription.deleted` | Set `plan=free`, `status=cancelled` |
| `customer.subscription.updated` | Sync `status` field |

### Backend endpoints

- `POST /api/billing/checkout` — create Stripe Checkout Session, return URL
- `POST /api/billing/webhook` — receive Stripe webhook, update `user_plans`
- `GET /api/billing/status` — return current plan, status, period end, monthly usage
- `POST /api/billing/portal` — create Stripe Customer Portal session for manage/cancel

### Frontend routes

- `/billing/success` — brief confirmation, redirect to `/dashboard` after 3s
- `/billing/cancel` — redirect to `/pricing`

### UI updates

- `PricingPage.tsx` — "Upgrade to Pro" triggers `POST /api/billing/checkout`, price shown as $10/mo
- `SettingsPage.tsx` — new "Plan & Billing" section: plan badge, usage bar, "Upgrade to Pro" or "Manage Subscription" button

---

## Section 4: Rate Limiting

### Limits

| Tier | Request limit | Spend limit |
|---|---|---|
| Free | 20 requests/month | $2.00/month |
| Pro | Unlimited | $50.00/month (safety net) |

### Enforcement

New `backend/src/usage.py` module with two functions:

- `check_usage_limits(user_id, plan)` — queries `usage_events` for current calendar month, raises `HTTP 402` if over limit
- `record_usage_event(user_id, workspace_id, event_type, model)` — writes one row to `usage_events` after a successful AI call

Called in `main.py` at the start and end of: runs, chat messages, streaming messages, compare.

### Cost estimation table

| Model pattern | Estimated cost/request |
|---|---|
| `gpt-4o*` | $0.010 |
| `gpt-4*` | $0.008 |
| `claude-3-5*` | $0.008 |
| `claude-3-opus*` | $0.015 |
| `claude*` / `gpt-3.5*` | $0.002 |
| anything else | $0.005 |

These are governance estimates, not billing figures.

### 402 response shape

```json
{
  "detail": "Monthly request limit reached.",
  "code": "LIMIT_REQUESTS",
  "plan": "free",
  "limit": 20,
  "used": 20
}
```

### Frontend handling

- `lib/api.ts` — catches 402, emits a custom `upgrade-required` DOM event
- `UpgradeModal.tsx` — global component listening for that event, shows limit explanation + "Upgrade to Pro" CTA that triggers checkout

---

## Section 5: File Map

### New files

| File | Purpose |
|---|---|
| `frontend/src/pages/public/AuthCallbackPage.tsx` | Handles `/auth/callback` |
| `frontend/src/pages/public/ResetPasswordPage.tsx` | Handles `/reset-password` |
| `frontend/src/pages/public/BillingSuccessPage.tsx` | Handles `/billing/success` |
| `frontend/src/components/UpgradeModal.tsx` | Global 402 upgrade prompt |
| `backend/src/usage.py` | Limit checking + usage event recording |
| `backend/src/billing.py` | Stripe checkout, webhook, status, portal endpoints |
| `supabase/migrations/001_billing.sql` | Schema migration |

### Modified files

| File | Change |
|---|---|
| `frontend/src/app/AppShell.tsx` | Add new public routes |
| `frontend/src/pages/public/LoginPage.tsx` | Add forgot password link |
| `frontend/src/pages/public/PricingPage.tsx` | Wire checkout, update price |
| `frontend/src/components/ProtectedRoute.tsx` | Loading spinner |
| `frontend/src/lib/api.ts` | Catch 402, emit event |
| `frontend/src/pages/protected/SettingsPage.tsx` | Plan & Billing section |
| `backend/src/main.py` | Register billing routes, add usage middleware calls |
| `backend/src/config.py` | Add Stripe settings |

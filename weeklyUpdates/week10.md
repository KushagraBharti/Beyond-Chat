# NISHANT BHAGAT

## Weekly Summary
- Week 10 was focused entirely on building out the Stripe subscription billing system end-to-end — from the Supabase schema through the backend endpoints and into the frontend checkout and plan display flows.
- The first half of the week was spent standing up the billing infrastructure: database tables, backend API routes, and Stripe integration using the v5 Python SDK.
- The second half was spent wiring the frontend — a dedicated Pricing page with checkout, a post-payment success page, plan status in the Settings card and sidebar, and fixing a series of bugs that surfaced during end-to-end testing with real Stripe test payments.

## Work Completed
- Created the billing schema in the canonical `backend/sql-related-files/011_billing.sql` file, with a context copy in `supabase/migrations/001_billing.sql` — `user_plans` table storing Stripe customer and subscription IDs alongside plan and status, and `usage_events` table for per-request cost tracking with composite indexes for fast monthly rollups.
- Built `backend/src/billing.py` from scratch with four endpoints: `GET /api/billing/status` (returns plan, status, period end, monthly request count and spend), `POST /api/billing/checkout` (creates or reuses a Stripe customer and opens a Checkout Session), `POST /api/billing/portal` (opens the Stripe Customer Portal for subscription management), and `POST /api/billing/webhook` (verifies Stripe signatures and handles `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`, and `customer.subscription.updated`).
- Added `stripe_secret_key`, `stripe_webhook_secret`, and `stripe_pro_price_id` fields to `backend/src/config.py` and wired the billing router into `backend/src/main.py`.
- Added `getBillingStatus()`, `createCheckoutSession()`, and `createPortalSession()` to `frontend/src/lib/api.ts` alongside the `BillingStatus` TypeScript interface.
- Built `BillingSuccessPage.tsx` — a post-checkout landing page that shows a Pro confirmation and auto-redirects to the dashboard after a countdown.
- Wired `/billing/success` and `/billing/cancel` routes into `AppShell.tsx` with lazy loading.
- Rewrote the Pricing page upgrade flow in `PricingPage.tsx` so unauthenticated users are redirected to login with an `upgrade_intent` flag in `sessionStorage`, and authenticated users are sent directly to Stripe Checkout.
- Added a `useEffect` on the Pricing page that auto-triggers the checkout API when a user lands there after completing signup with upgrade intent set.
- Fixed the `LoginPage.tsx` redirect logic — removed inline `navigate` calls from `handleSubmit` that were racing with the `useEffect` observer, making the `useEffect` the sole navigator and routing to `/pricing` when `upgrade_intent` is present.
- Added a Plan & Billing card to `SettingsPage.tsx` showing current plan, monthly request count, spend, and an upgrade or manage subscription button with a loading state during fetch.
- Redesigned the `DashboardLayout.tsx` sidebar footer to show an avatar, display name, and a Free or Pro pill badge on the left with a sign-out icon on the right — the collapsed variant shows a Pro dot indicator on the avatar.
- Added UUID regex validation to `getStoredWorkspaceId()` in `api.ts` to strip stale non-UUID values that were causing Supabase `invalid input syntax for type uuid` errors.
- Debugged and fixed multiple Stripe SDK issues: switched all `StripeClient` calls to the `params={}` dict style required by v5+, added `"payment_method_types": ["card"]` to the checkout session params, fixed the webhook handler to use `stripe.Webhook.construct_event` (which returns the event object) instead of `WebhookSignature.verify_header` (which only returns bool), and set `stripe.api_key` before calling the construct method.
- Fixed a Supabase Python client bug where `_get_or_create_plan` was calling `.maybe_single()` which returns `None` when no row exists — switched to `.limit(1).execute()` and checking the `data` list directly.
- Pushed all billing changes to the `auth-fixes` branch on GitHub, excluding environment files with secrets.

## Research / Technical Findings
- Stripe Python SDK v5 (`StripeClient`) requires all API calls to pass parameters as a `params={}` dict rather than direct keyword arguments — mixing styles causes silent failures or unexpected behavior.
- `stripe.Webhook.construct_event(payload, sig_header, secret)` is the correct way to both verify the signature and parse the event object in one call; `WebhookSignature.verify_header` only performs verification and does not return a usable event.
- The Supabase Python client's `.maybe_single()` returns `None` when zero rows match, which causes an `AttributeError` when you try to access `.data` on it — `.limit(1).execute()` with a list check on `result.data` is the safer pattern.
- Preserving post-login intent across a redirect requires a flag in `sessionStorage` rather than URL state, because Supabase's OAuth and email confirmation redirects can strip query parameters.
- React `useEffect` and `handleSubmit` both calling `navigate` creates a race condition — the `useEffect` observer on session state should be the single source of navigation truth after auth state changes.
- Stripe Checkout `payment_method_types` must be explicitly set when using `StripeClient` — omitting it causes an `InvalidRequestError: No valid payment method types` even though the Stripe dashboard has card payments enabled.

## Blockers / Risks
- The Stripe webhook is successfully receiving events from Stripe (confirmed via dashboard event log) but the `user_plans` table is not updating to `pro` after payment — the backend Vercel deployment is missing `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRO_PRICE_ID` environment variables, which causes the endpoint to return a 503 before processing the event.
- Email confirmation on Pro upgrade is not yet implemented — Stripe's built-in subscription confirmation emails need to be enabled in the Stripe dashboard, or a custom transactional email needs to be sent from the webhook handler.
- Rate limiting (Section 4) is not yet started — `usage_events` is being written but there is no enforcement middleware checking request counts or spend against plan limits.

## Hours Worked
- Total estimated time: 14 hours


# DIYA MEHTA

## Weekly Summary
- Week 10 was focused on implementing a production-ready Google Calendar integration and refining the local development authentication flow to enable faster iteration.
- The primary goal was to move from mock calendar data to a live, authorized API connection that persists across sessions.
- Successfully implemented the full OAuth 2.0 lifecycle on the backend and wired the live agenda view into the frontend dashboard.

## Work Completed
- **OAuth Infrastructure**: Built the OAuth 2.0 flow in `backend/src/providers.py`, including URL generation with `calendar.readonly` scopes and a callback handler for secure code exchange.
- **Token Management**: Implemented a local persistence layer (`.google_tokens.json`) to store access and refresh tokens, enabling integration state to survive backend restarts.
- **Live Agenda API**: Replaced mock event data with actual calls to the Google Calendar `primary` events endpoint using `httpx`, fetching real-time event titles, start times, and locations.
- **Token Refresh Logic**: Developed an automatic refresh mechanism that detects expired access tokens and silently updates them using the refresh token before API calls.
- **Backend Routing**: Added the `/api/integrations/google-calendar/callback` endpoint to `main.py` and updated existing status and event routes to handle live user contexts.
- **Auth Bypass Refinement**: Modified `backend/src/auth.py` and `backend/src/runtime_store.py` to support a local bypass mode (`ALLOW_LOCAL_AUTH_BYPASS`), allowing full testing of integrations without a Supabase production JWT.
- **Frontend Integration**: Updated `HomePage.tsx` to display real calendar data and connected the "Connect" button to the live OAuth flow, ensuring the UI reflects the real-time `Connected` status.

## Research / Technical Findings
- Google OAuth token exchange requires a strict `redirect_uri` match between the initial request and the code exchange call; even a trailing slash mismatch causes a `redirect_uri_mismatch` error.
- Implementing a silent refresh loop (checking `expires_at` before every request) is essential for a seamless user experience in read-only calendar integrations.
- Local development bypasses must be synchronized across the stack (frontend `.env` and backend `auth.py`) to prevent 401/403 errors during cross-origin API requests.
- The `timeMin` parameter in the Google Calendar API must be in RFC3339 format (ISO string) to correctly filter for upcoming events and minimize payload size.

## Blockers / Risks
- **Credential Sensitivity**: The integration relies on `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the `.env` file, which must be manually configured in any new deployment environment.
- **Token Storage Scaling**: The current JSON-file-based token storage is suitable for local development but will require a migration to a relational database (Supabase/Postgres) for multi-user production support.
- **Scope Limitations**: The integration is currently limited to `readonly` access; any future feature for creating calendar events will require a scope update and user re-consent.

## Hours Worked
- Total estimated time: 6 hours

HARSHWARDHAN KOTHARI 
                                                                                
  Weekly Summary  

  Week 10 was focused on cross-studio context injection between the Data and   
  Finance studios — making the rich structured output from Data analyses
  (insights, tables, chart data) fully available to Finance AI runs that attach 
  those artifacts.

  The first part of the week was spent on the backend: auditing how             
  build_context_block() in ai_context.py was handling Data artifacts and
  rewriting it to format contentJson — the nested insight, markdown table, and  
  chart data — instead of truncating the plain content field that only stored a
  short insight string.

  The second part was spent on the frontend: extending ContextBuilder with a    
  dedicated "Suggested from Data Studio" section that pre-fetches and surfaces
  relevant Data artifacts automatically when a user opens the Finance studio    
  workspace, so they no longer have to manually search across studios. The week
  closed with resolving a persistent macOS Gatekeeper quarantine issue that was
  blocking all pytest runs and fixing a broken git object store to push the
  changes cleanly to the shared repo.

  Work Completed

  - Added _format_data_content_block() helper in backend/src/ai_context.py that 
  extracts and formats a Data artifact's contentJson — insight string, a full
  markdown table (headers + rows), and chart data (type, labels, values) — into 
  a structured context block for AI prompts.
  - Modified build_context_block() to branch on studio == "data" and presence of
   contentJson, using the structured formatter for Data artifacts and the       
  existing plain-text truncation path for all other studios.
  - Added suggestedStudio?: string prop to                                      
  frontend/src/components/RunStudioWorkspace.tsx and threaded it through to     
  ContextBuilder.
  - Added suggestedStudio="data" to <RunStudioWorkspace> in                     
  frontend/src/pages/protected/FinancePage.tsx so Finance runs automatically    
  request Data studio suggestions.
  - Extended frontend/src/components/ContextBuilder.tsx with a suggestedItems   
  state, a separate useEffect (with active-flag cleanup) that calls             
  listArtifacts({ studio: suggestedStudio, limit: 5 }), deduplication against
  the main artifact list, and a "Suggested from X Studio" UI section with purple
   studio badges. 
  - Fixed a .gitignore bug where frontend/.env.local and api-credentials.txt
  were concatenated onto one line, causing api-credentials.txt to not be        
  ignored.
  - Diagnosed macOS com.apple.quarantine extended attributes on 65 files in     
  backend/.venv causing [Errno 60] Operation timed out on every pytest import of
   compiled .so extensions (numpy, pandas, fastapi). Fixed with xattr -r -d 
  com.apple.quarantine backend/.venv — all 26 backend tests now pass.           
  - Resolved a broken git object store (commit 705ff36c referenced as a parent
  but missing from the local object store after a prior rebase) by using git    
  archive to extract a clean snapshot into a fresh repo and force-pushing to
  KushagraBharti/Beyond-Chat.git.                                               
                  
  Research / Technical Findings

  - Data artifacts store full analysis results in contentJson (nested insight,  
  table.headers/rows, chart_data.labels/datasets) while Finance artifacts have
  contentJson: null — the context injector must check both studio type and field
   presence to avoid an incorrect branch.
  - macOS Gatekeeper applies com.apple.quarantine to .so files downloaded or
  copied into a venv, causing ETIMEDOUT (errno 60) on import rather than a      
  standard permission error. Stripping the attribute with xattr -r -d on the
  entire venv directory is a permanent fix that survives Python process         
  restarts.       
  - A git object store missing a commit that is referenced in the reflog cannot
  be recovered with git fetch or bypassed with --force — git traverses the      
  remote's ref graph during pack negotiation and aborts before the push is
  applied. Extracting a clean tree with git archive and starting a fresh local  
  repo is the reliable escape hatch.
  - React useEffect fetches in ContextBuilder require an active boolean flag for
   cleanup — without it, a slow artifact fetch that resolves after the component
   unmounts will attempt a state update on an unmounted component and log a
  warning in strict mode.                                                       
                  
  Blockers / Risks

  - The local git repo's object store still has broken links from the prior     
  rebase (d44b1c0c → 705ff36c). Future local history operations (rebase, bisect)
   may surface the same corruption. A clean git clone from the remote would give
   a fully healthy local repo.
  - The "Suggested from Data Studio" section fetches the 5 most recently created
   Data artifacts with no relevance ranking. As the Data studio accumulates     
  artifacts, the suggestions may not surface the most contextually relevant ones
   for a given Finance run.                                                     
  - _format_data_content_block() handles several nested optional fields
  (table.headers, chart_data.datasets[0].data) with no unit tests. The          
  formatting logic should be covered by backend tests to guard against
  regressions if the contentJson schema evolves.                                
                  
  Hours Worked

  Total estimated time: 8 hours





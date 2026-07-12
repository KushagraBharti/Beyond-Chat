# Public product truthfulness

`plan.md` is the canonical product and architecture plan. This note records the public-surface rules for the transitional prototype and should be updated when an implementation is verified.

## Current public position

- Beyond Chat is a transitional prototype moving from studio-centric UI toward a project- and organization-centered AI work environment.
- Existing chat, run-step, artifact, research, finance, image, and data flows are prototype behavior. They are not promises about final navigation, provider availability, or future packaging.
- Public pages must not list specific model vendors or model versions as generally available unless the current product verifies that availability.
- Public pages must not claim unlimited usage, a free trial, savings, customer results, autonomous completion times, or live connector coverage without current evidence.
- Draft Terms and Privacy pages must remain explicitly labeled as drafts and not effective legal documents.

## Pricing and billing

- The locked initial commercial target is **$30 per user per month**.
- The price is a planning target until a live product, price, account activation, and billing operations are verified.
- Paid checkout is disabled during this phase. A pricing CTA may create or request an account, but it must not create a checkout session or imply a paid entitlement.
- A billing return page is only a neutral handoff. It must never infer entitlement from URL parameters or the fact that a user returned from a payment provider.
- Entitlements and plan state become effective only after server-side verification and idempotent webhook processing.

## Architecture language

Public and repository documentation may describe current prototype infrastructure only when it is clearly marked transitional. The locked target architecture and migration direction live in `plan.md`; current Supabase Auth, legacy schema, studio navigation, OpenRouter wiring, and Vercel Sandbox assumptions must not be presented as the final product architecture.

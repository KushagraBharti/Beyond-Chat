# Customer data deletion runbook

**Draft pending legal/retention approval and provider adapter completion.** Authenticate the requester, verify Owner authority (or applicable data-subject route), identify legal hold/contract constraints, disclose scope/timeline, and issue a durable deletion case ID.

Inventory organization records, memberships, projects, threads/runs/events, outputs/object storage, knowledge sources/indexes, memory, agents/automations, credentials/references, collaboration provider data, observability/support records, and Stripe customer/subscription records. Cancel future execution and revoke access first. Billing records may require legally mandated retention and must be restricted rather than silently erased.

Delete authoritative data transactionally where possible; tombstone and queue derived indexes/caches; invoke provider deletion APIs with idempotency; retain receipts without content; verify retrieval and guessed-ID denial; then send a completion report listing completed, retained-with-basis, failed/retrying, and provider-pending categories. Backup expiry must follow the approved retention schedule; do not claim immediate physical erasure from immutable backups.

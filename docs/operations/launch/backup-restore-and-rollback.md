# Backup, restore, and rollback drills

## Backup/restore

Record backup identity, schema/runtime versions, encryption/access owner, retention, and restore target without secrets. Restore into an isolated non-production target, validate row/object counts and hashes, tenant isolation, event ordering, entitlement state, and application queries. Measure RPO/RTO. Destroy the drill target through the approved process. Provider dashboard backup claims are insufficient without a successful restore.

## Application rollback

Promote only an immutable preview artifact that passed scoped tests. Record the prior deployment, schema compatibility, flags, and rollback owner. Roll back by disabling new flags first and re-pointing to the last verified artifact; do not run a production deployment from this document. Verify health, auth, run acceptance/replay, billing status read, and error metrics.

## Billing rollback

Disable checkout and quantity writes; keep signed webhook ingestion if its processor is safe so evidence is not lost. If webhook code is unsafe, return retryable failure and repair before provider retry expiry. Never roll back database state by deleting newer billing events. Rebuild projections from the immutable event log and reconcile with Stripe.

All three drills are currently **not performed** and block launch.

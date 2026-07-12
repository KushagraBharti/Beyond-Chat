# Phase 11 automation slice

## Delivered boundary

`@beyond/automation-engine` is a provider-neutral reference control plane. It stores immutable versions with exact agent, tool, knowledge, and approval-policy pins; normalizes manual, schedule, signed-webhook, and Composio triggers; deduplicates executions; leases work; dispatches through the normal runtime port; and retains attempts, failures, approvals, costs, action receipts, and terminal history.

The frontend automation workspace is intentionally truthful. Its default adapter says persistence and notifications are in-memory, runtime is simulated, and scheduler/Composio are not connected. It does not claim that a schedule, webhook endpoint, provider action, or notification exists.

## Safety and recovery invariants

- Trigger identity is unique within organization + automation. A duplicate returns the original execution.
- Destination identity is unique within execution + destination. Production delivery must pair the receipt with a provider idempotency key and reconcile ambiguous outcomes.
- Workers atomically claim one eligible execution with a bounded lease. Expired leases return to the queue without rewriting prior attempts.
- Budget and action limits are checked server-side. Consequential destinations stop in `awaiting_approval` and expire/deny closed.
- Retry records append failures and end in a visible dead letter; they never replace history.
- A paused definition rejects non-test triggers. Owner removal preserves an automation only when an active organization service principal remains; otherwise it pauses.
- Schedule evaluation uses the stored IANA timezone. Nonexistent DST times advance to the next valid local occurrence and repeated fall-back times execute once at the first occurrence.

## Gate evidence

| Gate | Reference evidence | Live gate |
|---|---|---|
| Duplicate triggers do not duplicate external actions | Concurrent dedupe/claim/action-receipt test | Postgres uniqueness + transactional outbox + provider idempotency/reconciliation |
| Paused/failed work is visible | UI states, failure inbox, pause test | Connected API/read model and notification delivery |
| Approvals and budgets are enforced | Approval and retry/budget tests | Canonical authorization/tool gateway and durable budget ledger |
| History is reproducible | Exact version/pin replay fixture and eval | Persisted config blobs, runtime image/version evidence, retained object references |
| Lease recovery works | Concurrent claim and expired-lease test | `FOR UPDATE SKIP LOCKED`, worker heartbeat, startup reconciler |
| Webhooks resist replay | HMAC timing-safe signature, timestamp window, trigger dedupe tests | Secret manager, raw-body route, key rotation, ingress limits |
| Timezones survive DST | Chicago spring/fall tests | Production scheduler conformance across supported zones |

## Exact live integration needs

1. The canonical database owner must review the schema proposal, add admitted tables to the clean migration, implement tenant authorization, and supply atomic claim/outbox queries. The proposal is not executable migration history.
2. Mount authenticated automation REST/query endpoints and raw-body webhook routes in the app composition root. Store webhook secrets in the backend secret manager and define rotation/overlap windows.
3. Connect `AutomationRuntimePort` to the stable durable runtime command contract, including exact run version, cost ledger, cancellation, approval suspension, and recovery events.
4. Provision a scheduler that persists next-fire identity and sends a stable source event ID. Validate leader election and catch-up policy.
5. Scope the Composio project key and webhook secret, pin trigger schema versions, map provider account ownership to internal UUID/service principals, and stage schema changes.
6. Connect canonical tool policy/approval resolution and notification delivery. External providers must accept an idempotency key or expose reconciliation identifiers.
7. Add production service-principal lifecycle hooks for membership/offboarding and revoke organization connection grants when the principal is disabled.

## Commands

```powershell
cd packages/automation-engine
npm install
npm run typecheck
npm test
npm run eval
npm audit --omit=dev

cd ../../frontend
npm run test -- src/components/automations/AutomationWorkspace.test.tsx
npm run build
npm run lint
```

# Internal runtime gateway contract

These modules define the security boundary for future internal model and tool routes. They are intentionally not wired into FastAPI yet.

## Route contract

The control plane issues a separate, single-use capability token for each invocation. A future service adapter should expose only authenticated internal endpoints such as `POST /internal/runtime/model/invoke` and `POST /internal/runtime/tool/invoke`. The bearer token audience must exactly match `internal-model-gateway` or `internal-tool-gateway`; a token for one service is invalid at the other.

The request adapter constructs `GatewayInvocation` from the bearer token, operation name/version, arguments, requested response fields, `Idempotency-Key`, and conservative estimated cost. It must call `InternalGateway.validate` before retrieving provider credentials or making a provider call. Only the returned projection may cross the gateway boundary. Provider credentials are resolved inside the gateway service after validation and are never returned to a worker or sandbox.

The injected authoritative resolver must read current durable state and return run, organization, project, worker subject, attempt, lease, lease expiry, terminal/revoked state, current allowlisted capability definitions, and current budget use. Cached token claims are not authoritative. One invocation-claim adapter must atomically validate and claim `(organization_id, run_id, idempotency_key, request_digest, jti, expires_at)` in a single database transaction/RPC. It returns exactly `claimed`, `token_replayed`, or `idempotency_conflict`; it must never perform separate replay and idempotency writes. Database errors fail closed as `invocation_claim_unavailable`. Audit sinks must durably record every allow/deny outcome without raw arguments or credentials.

## Token and signing contract

Tokens are short-lived `RCP+JWT` values signed with HMAC-SHA256 and a required `kid`. Claims bind issuer, audience, worker subject, run, organization, project, attempt, lease, `iat`, `nbf`, `exp`, `jti`, capability digest, argument digest, idempotency key, call budget, and cost budget. The default maximum TTL is 300 seconds. Key rings accept retained verification keys so rotation does not require accepting tokens with an unknown key.

Production secret names (values must never be committed):

- `INTERNAL_GATEWAY_ACTIVE_SIGNING_KEY_ID`
- `INTERNAL_GATEWAY_SIGNING_KEY_<KEY_ID>` for the active key and retained rotation keys
- `INTERNAL_GATEWAY_TOKEN_ISSUER`

Secret loading and route wiring belong in deployment/config work. Signing keys must be random, independently scoped, stored in the platform secret manager, and unavailable to sandboxes. A production asymmetric/KMS-backed `SigningKeyRing` implementation may replace HMAC without changing gateway policy semantics.

## Mandatory integration behavior

- Deny unknown, duplicate, stale, revoked, terminal (including canonical `canceled`), expired-lease, zero/negative-attempt, or binding-mismatched requests.
- Project only explicitly allowlisted model/tool fields and versions.
- Bind canonical capability and argument digests before provider access.
- Enforce the lower of token and authoritative call/cost limits.
- Retrieve provider credentials only after validation, inside the trusted service; never include them in projections, audit data, runtime events, errors, or sandbox environment variables.
- Record provider usage/cost after execution through the durable runtime accounting path; validation only reserves permission to call.

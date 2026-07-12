# Phase 0–2 gate audit

Evidence captured: **2026-07-12 UTC**, against commit
**`cc23700f678173d87e635a8a205dfad80d432e88`**. This is a read-only gate assessment,
not authorization to mutate a provider. Provider identifiers and credential
names are recorded; credential values are not.

This capture supersedes the repository/CI/Modal facts in the earlier
`ced37a4`-scoped audit. Provider facts not recaptured remain historical and do
not silently inherit current status.

## Executive result

| Phase | Gate | Result |
| --- | --- | --- |
| Phase 0 — safe canonical baseline | Every Phase 0 gate condition in `plan.md` | **Fail** |
| Phase 1 — canonical contracts and spikes | Every Phase 1 gate condition in `plan.md` | **Fail** |
| Phase 2 — WorkOS and organization foundation | Every Phase 2 gate condition in `plan.md` | **Fail** |

Individual proof below may pass even when the phase gate fails. A phase closes
only when every conjunct in its gate is proven.

## Phase 0

| Gate condition | Result | Evidence / exact blocker |
| --- | --- | --- |
| Clean reproducible installs and CI green | **Pass for checked commit** | GitHub Actions run `29182125202` completed all seven jobs successfully for exact commit `cd6cc13`. This supersedes successful-but-older run `29181839190` at `a908491` and failed run `29173921184` at `ced37a4`; it does not certify later commits or working-tree changes. |
| Health checks green | **Pass** | Frontend `/` returned 200; frontend `/api/health` and backend `/api/health` returned 200 with the backend health payload. Runner unauthenticated POST `/api/run` returned 401. Runner GET now returns 404, so historical 405 guidance is obsolete. |
| Canonical repository baseline committed | **Pass for repository history** | The checkout HEAD is `cc23700f678173d87e635a8a205dfad80d432e88`; promoted migration history is verified through `20260712013100`, while tracked local-only `20260712013200` is explicitly pending review/apply. Uncommitted shared-checkout changes are outside this commit-scoped claim. |
| Active provider resources identity-verified | **Partial / fail** | Vercel, Supabase, WorkOS, GitHub, Stripe, Composio, and the Modal app/image/volume plane have recorded immutable IDs. Modal evidence is release `2026-07-11.4`, with routing disabled at 0%. Exa and Financial Datasets still expose credential acceptance without immutable account/project IDs, and narrow Modal service identity is unproven. |
| Supabase CLI and MCP agree | **Pass through promoted history** | Supabase CLI 2.109.0 authenticated on 2026-07-12: `projects list` identified linked, `ACTIVE_HEALTHY` Beyond Chat Production ref `vffndfwdykxqjlnntuuk` in organization `nwvyypcrdwhzwpurtonm`, agreeing with the project-scoped MCP. `migration list --linked` showed local=remote for all nine migrations from `20260711130000` through `20260712013100`. Local `20260712013200` is intentionally pending review/apply and is not claimed as remote. |
| Legacy schema reset; no customer data | **Pass with controlled auth records and pending migration caveat** | CLI proves nine local/remote migrations agree through `20260712013100`; the old 14-table chain is absent. One controlled profile, organization, and Owner membership exist; these are foundation records, not customer data. Local-only `20260712013200` remains unapplied pending deliberate review. |
| No unexplained security-advisor warnings | **Pass** | Project-scoped Supabase security advisor returned an empty lint list. Performance findings are only expected `unused_index` INFO notices on the empty database. |
| No committed secrets | **Pass for checked commit** | The tracked secret/credential-file scan job passed within the seven-job CI run `29182125202` for `cd6cc13`. This does not certify ignored env files, uncommitted files, stashes, or external transcripts. |
| Credential and provider-rate registers exist without values | **Pass** | `credential-register.md`, `secret-scope-matrix.md`, and `rate-register.csv` exist and record names/rates only. Contract-priced Composio and Financial Datasets inputs remain explicitly pending. |

## Phase 1

| Gate condition | Result | Evidence / exact blocker |
| --- | --- | --- |
| Canonical protocol without Pi/provider types | **Pass for the executable test client** | The dedicated CI job `Phase 1 contracts, Pi, runtime, sandbox, and fixtures` passed. Import-boundary checks keep Pi behind `PiRuntimeAdapter`; the local client exercises the Beyond command/event protocol. No separate production-browser proof was captured in this audit. |
| Production artifacts resolve to the recorded Beyond fork commit | **Fail** | Fork/source commit `19fe0e01c5eca791c9da0372b49256845555a783` is recorded and provenance-checked, but no promoted immutable runtime image digest/production runtime artifact was evidenced. Current Vercel deployments are the frontend, API, and temporary runner, not the target Pi runtime image. |
| Replay recreates state; cancellation/recovery tests pass | **Pass for the Phase 1 spike** | The dedicated Phase 1 CI job passed the SQLite journal, replay, duplicate-delivery, cancellation, restart, checkpoint, and resume tests and fixtures. This is local spike evidence, not the later production durability gate. |
| Upstream-update rehearsal passes fork gates | **Fail exact gate** | `initial-import-rehearsal.json` passed with candidate equal to baseline commit. It proves the rehearsal mechanism, but it is not an update to a different upstream commit and retains documented Windows test exclusions. |
| Architecture review accepts boundaries | **Pass as repository decision evidence** | ADR-001 is `accepted`; runtime-spike and Pi boundary documents define the adapter and provider boundaries. |

## Phase 2

| Gate condition | Result | Evidence / exact blocker |
| --- | --- | --- |
| Old chain absent; canonical history replays and matches remote | **Pass through promoted history; pending local change** | Supabase CLI 2.109.0 proves exact local/remote agreement for nine migrations from `20260711130000` through `20260712013100`; CI run `29182125202` passes all seven jobs at `cd6cc13`. Local-only `20260712013200` is intentionally unapplied pending review and is not included in this agreement claim. |
| Cross-organization denial through API, PostgREST, Storage, Realtime, and guessed IDs | **Fail exact gate** | Deterministic database/backend tests cover two-organization and guessed-ID cases, but production currently has only one controlled organization and no live two-organization end-to-end evidence across all five surfaces was captured. |
| Invitation, switch, and revocation flows work | **Fail production gate** | Production login now works for one controlled profile/organization/Owner, and local route tests exist. Production invitation, organization-switch, and revocation journeys have not all been evidenced. |
| All protected routes use WorkOS | **Fail exact gate** | Production WorkOS authentication now works for one controlled profile/organization/Owner. The repository still documents transitional Supabase-auth middleware and a legacy frontend login surface for existing product routes, so the all-protected-routes condition is not proven. |

## Provider identity and deployment evidence

- Git remote: `https://github.com/KushagraBharti/Beyond-Chat.git`.
- Vercel team: `team_zZPyc4iWczMNMcU7ReWg3dGc`.
- Frontend: `prj_oq31gdbP117PJBxU3A0v87ewWqdr`, repository root, latest production `dpl_EnUdxdDNPtCpBQAu6NjJdJqovh3c`, READY.
- Backend: `prj_LVvFbBJ4ksVdgGTkBwJdZ82mAIZu`, root `backend`, latest production `dpl_BQmXT5NnU84YwYfa1T2yehtQXyQw`, READY.
- Temporary runner: `prj_C0NH6PmkehZKvrVbWjijd6G9l18k`, root `backend/sandbox-runner`, latest production `dpl_9bczVKyB5C6RgC3xBv2MrAnfqV2s`, READY.
- All three Vercel projects are linked to GitHub repository ID `1160284020`, owner ID `65621922`, production branch `main`.
- Supabase: linked, `ACTIVE_HEALTHY` project `vffndfwdykxqjlnntuuk` in organization `nwvyypcrdwhzwpurtonm`; CLI local=remote for nine migrations through `20260712013100`; local-only `20260712013200` is pending review/apply. The prior all-empty row snapshot is superseded by one controlled profile/organization/Owner foundation.
- WorkOS canonical environment/app/client: `environment_01KX84DX4GA5XMSN4D4FK9DFND` / `app_01KX84DXGTP1ZKASV4PBVSASM6` / `client_01KX84DX9XT83ZSTCBM0T2XC8G`.
- Modal production provider plane: app `ap-FbZZRj50uSQRtGe2nwvlYH`, release `2026-07-11.4`, four immutable image IDs and three volume IDs recorded in `provider-identity-register.md`; routing remains disabled at 0%.

## Required next evidence

1. Review local migration `20260712013200`; apply it only through the authorized migration workflow, then recapture CLI local/remote agreement.
2. Exercise controlled two-organization invitation/switch/revocation/isolation journeys and migrate every remaining protected route; one successful production login is not the full auth gate.
3. Promote a digest-addressed Pi runtime artifact and run a genuine different-commit upstream upgrade rehearsal through the recorded fork gates.
4. Rotate transcript/session-exposed credentials before external access; exercise the narrow Composio key through shipped runtime code and revoke the legacy full-access key.
5. Keep live Stripe blocked until the intended account is activated and an account-matched key, product, price, webhook, and controlled charge/refund are verified.

# Selected Pi packages and Phase 1 adapter surface

## Selection rule

Select the smallest surface that provides the general-purpose loop, provider-neutral streaming, and the code-mediated file/process abilities needed for document and analytical work. Do not adopt Pi’s terminal UI, local-user tenancy, Git-centric product assumptions, or orchestration as Beyond product contracts.

All imports below are allowed only inside `packages/pi-runtime-adapter`. Exact names are upstream APIs at Pi `0.80.6`; the adapter must translate them immediately into Beyond-owned types.

## Runtime-selected packages

### `@earendil-works/pi-ai`

Purpose: provider-neutral model/message/streaming primitives.

Initial adapter allowlist:

- types: `Model`, `Context`, `Message`, `AssistantMessage`, `Tool`, `ToolResultMessage`, `SimpleStreamOptions`;
- event-stream and validation types needed to consume a provider stream;
- a deliberately chosen provider factory or `streamSimple`-compatible function injected through the Beyond `ModelGateway`.

Do not let Pi own provider credentials or model policy. The adapter receives a run-scoped model capability from `ModelGateway`; it must not scan user-global credential files or select an unrestricted provider by itself.

### `@earendil-works/pi-agent-core`

Purpose: agent loop, lifecycle events, tool execution, state, cancellation, steering/follow-up semantics, and optional harness primitives.

Initial adapter allowlist:

- `Agent`;
- types `AgentOptions`, `AgentState`, `AgentEvent`, `AgentMessage`, `AgentTool`, `AgentToolResult`, and `AgentContext`;
- loop/harness primitives only when they are needed to prove cancellation, compaction, or serialized recovery;
- compaction helpers only behind Beyond’s checkpoint policy.

Recommended Phase 1 spike entry point: instantiate `Agent` with an injected model and an explicit tool allowlist, subscribe to `AgentEvent`, and normalize every event before persistence. Use `AgentHarness` only if its session/retry/compaction behavior is accepted explicitly; its repositories are not the production system of record.

### Selected modules from `@earendil-works/pi-coding-agent`

Purpose: reuse proven headless file/process tools, skill parsing/loading, diff generation, and compaction/session utilities where they reduce risk.

Candidate allowlist, subject to adapter tests:

- tools: `createReadTool`, `createWriteTool`, `createEditTool`, `createBashTool`, `createCodingTools`, `createReadOnlyTools`;
- skills: `loadSkills`, `loadSkillsFromDir`, `formatSkillsForPrompt`;
- review: `generateUnifiedPatch`, `generateDiffString`;
- session/compaction helpers only if they can be fully mapped to Beyond checkpoints without becoming the source of truth.

Prohibited imports include `main`, `InteractiveMode`, themes/components, terminal configuration selectors, global auth storage, package installation UI, and CLI argument parsing.

## TUI coupling discovered at the pinned revision

At `0.80.6`, `@earendil-works/pi-coding-agent` declares `@earendil-works/pi-tui` as a production dependency, its root `index.ts` re-exports interactive modules, and its build needs TUI declarations. Therefore:

1. `pi-tui` is built as a compile-only prerequisite in `scripts/pi/build-selected.mjs`.
2. Product code may not import `pi-tui`.
3. The browser never renders Pi TUI output.
4. Phase 1 may use the coding-agent root only for an isolated spike where the full dependency is present and no Pi type escapes.
5. Production promotion requires one of:
   - an upstream headless subpath export;
   - a minimal, reviewable Beyond fork patch adding a headless subpath;
   - direct use of `pi-agent-core` plus Beyond-owned tools, with coding-agent omitted from the runtime artifact.
6. The final runtime bundle/lock inspection must prove that interactive TUI code is absent if the third option is chosen, or consciously accepted only as an inert dependency if legal/security/size gates approve it.

This is an explicit gate, not an undocumented assumption.

## Excluded packages

- `@earendil-works/pi-orchestrator`: Beyond owns delegation, policy, tenancy, budgets, durable commands, and recovery.
- `@earendil-works/pi-tui`: compile-only at this revision; never the product interface.
- Pi CLI/RPC entry points and global config discovery: the Beyond app server owns transport and configuration.

## Build order

The reproducible selected build uses npm and the vendored lockfile:

1. `@earendil-works/pi-tui` (compile-only prerequisite);
2. `@earendil-works/pi-ai`;
3. `@earendil-works/pi-agent-core`;
4. `@earendil-works/pi-coding-agent`.

Pi’s upstream `pi-ai` build script refreshes generated model catalogs from live third-party APIs. That behavior makes a historical commit’s build depend on mutable network responses. Beyond therefore compiles the generated catalog sources already pinned in the Git tree with `tsgo` and does not run `generate-models` or `generate-image-models` during a production/reproducibility build. Catalog refreshes are separate, reviewed fork updates with their own source diff and cost/provider-policy review.

Run:

```powershell
node scripts/pi/build-selected.mjs
```

The script performs `npm ci --ignore-scripts`, compiles in this order using the pinned catalog sources, verifies expected outputs, and rechecks source provenance. It does not publish packages.

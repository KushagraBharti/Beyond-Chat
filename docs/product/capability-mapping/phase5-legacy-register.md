# Phase 5 legacy capability and retirement register

This register began as the Phase 5A product-model boundary and now records the integrated Phase 5 shell disposition. Canonical navigation routes to Home, Chat, Work, Projects, Agents, Knowledge & Apps, Automations, Settings, and authorized Admin. Legacy studio URLs remain compatibility routes with an explicit explanation and canonical destination; they are not silently deleted or presented as active studios.

| Existing surface | Current evidence | Target product model | Disposition | Required preservation / retirement condition |
| --- | --- | --- | --- | --- |
| Dashboard (`/dashboard`, `/home`) | Workspace landing and navigation | Home | Retain, merge | Reframe as recents, approvals, assigned work, saved agents, notices. |
| Chat (`/chat`) | Fast conversation and attached context | Chat, with Work promotion | Retain, merge | Preserve messages and selected context when a user explicitly promotes to Work. |
| Writing (`/writing`, `/writing/:documentId`) | Drafting/editor flow | Research agent + document outputs | Merge | Writing is a Research capability/template; the editor becomes an output canvas/review surface. |
| Research (`/research`) | Brief, sources, structured output | Research agent + Work + cited outputs | Merge | Preserve source visibility, citations, and failure states; no standalone studio navigation. |
| Image (`/image`) | Image generation/reference imagery | Image output capability | Hide as primary nav | Keep `/image` output intent and generated-image output lifecycle; do not market it as a studio. |
| Data (`/data`) | File upload, tabular analysis, charts | General data capability + Finance data/analysis pack | Merge | General retains safe analysis; finance-specific modeling belongs to Finance. |
| Finance (`/finance`) | Dexter prompt, tools, NDJSON traces, sources, memo | Finance agent + Work + finance output templates | Retain behind migration boundary | Preserve Dexter prompts/tools/source extraction/budgeting/compaction tests/traces through legacy adapter until Pi parity gate passes. |
| Artifacts (`/artifacts`) | Saved work, filters, exports/bundles | Outputs inside Work, Projects, search, recents | Hide as primary nav | Retain listing/export/versions as output discovery; artifacts are not a top-level product silo. |
| Documents as a primary concept | Writing and artifact flows | Output templates/canvas | Retire as primary navigation | Documents remain durable outputs with review/versioning, not a separate product area. |
| Studio switch links in Chat/Research/Finance | Cross-studio suggestions | Agent/capability routing | Retire | Replace only after typed discovery and automatic-but-visible selection are integrated. |
| Design routes (`/designs/*`) | Visual prototype variants | None | Deliberately retire | Keep as internal reference only; never expose as canonical navigation. |
| Settings (`/settings`) | Account/workspace settings | Settings and Admin | Retain, split | Personal settings remain Settings; organization policy, roles, apps, usage, billing move to Admin where authorized. |

## Explicit exclusions

- No legacy route is declared safe to remove solely because an equivalent label exists.
- Image, artifacts, and documents remain supported capabilities/outputs, never invented as unavailable mock connections.
- Data is not deleted: it is split into the General safe-analysis boundary and the Finance data/finance capability pack.

# Phase 5A product catalog integration API

The future unified shell and Pi runtime adapter consume `@beyond/product-catalog` as configuration and pure discovery only. The package has no network, provider, credential, database, browser, or execution dependency.

```ts
import {
  PRODUCT_CATALOG,
  BUILT_IN_AGENTS,
  builtInDiscoveryItems,
  queryDiscovery,
  parseInvocation,
  serializeDiscovery,
} from "@beyond/product-catalog";
```

`PRODUCT_CATALOG` provides versioned navigation concepts, reference kinds, output templates, and capability packs. `BUILT_IN_AGENTS` provides immutable published General, Research, and Finance definitions. The shell augments `builtInDiscoveryItems()` with scoped project, file, source, app, MCP, skill, and model entries supplied by the control plane, including truthful state (`ready`, `disabled`, `disconnected`, `approval_required`, or `permission_denied`).

`queryDiscovery()` is the incremental, deterministic result API. It exposes keyboard metadata but does not bypass authorization: non-ready entries are non-selectable. `parseInvocation()` resolves slash and mention syntax into typed inert intents. It never executes tools or connects apps. The caller must render the result as removable reference chips and send it through the future command/policy boundary.

## Phase 5B work still required

- Integrate the catalog into the unified shell, Chat composer, Work promotion, routes, and output canvas.
- Persist immutable agent manifests and resolved typed chips against canonical command/run contracts.
- Replace static discovery augmentation with control-plane registries for skills, apps, MCP, projects, files, sources, and allowed models.
- Route typed intents through policy, approval, knowledge ACL, model routing, and Pi adapter commands.
- Build Finance Pi parity alongside the legacy Dexter adapter, using the frozen fixtures as one input to broader runtime evals.
- Migrate retained artifact/run data to Work/Project outputs and remove legacy studio marketing only after canonical journeys pass end to end.

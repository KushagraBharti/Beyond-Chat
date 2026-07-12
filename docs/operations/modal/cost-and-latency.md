# Cost, Latency, and Unit Economics

## Planning rates

The control plane records these dated Modal planning rates:

- CPU: `$0.00003942` per requested physical core-second.
- Memory: `$0.00000672` per requested GiB-second.

GPU is not used by this execution-plane release. Storage, snapshot retention, network, model, tool, object storage, database, and shared platform costs are not included in the simple sandbox estimate.

The estimate is:

```text
cpu_cost = requested_cpu * duration_seconds * cpu_rate
memory_cost = requested_memory_gib * duration_seconds * memory_rate
sandbox_compute_floor = cpu_cost + memory_cost
```

Modal billing can use the greater of requested or actual billable resources, so requested resource policy is economically significant. The product must reconcile provider billing/usage rather than treating a wall-clock estimate as final COGS.

## Measured provider-plane evidence

The final v2 extended smoke completed in `49.672` seconds and passed all lifecycle/output/recovery checks. Its one-CPU/one-GiB floor was:

| Component | Cost |
|---|---:|
| CPU | `$0.00195807` |
| Memory | `$0.00033380` |
| Total compute floor | `$0.00229187` |

That number is a normalized single-sandbox floor over total suite wall time. The suite actually creates several serial sandboxes and image probes, so it is not the provider invoice for the test run.

The provider billing capture for app `ap-FbZZRj50uSQRtGe2nwvlYH` on the current provider day, including image builds, probes, and multiple development smoke iterations, was:

| Resource | Cost |
|---|---:|
| CPU | `$0.02603439` |
| Memory | `$0.00115805` |
| GPU | `$0.00000000` |
| Total | `$0.02719244` |

Billing is time-scoped dashboard evidence and can update after capture. See `fixtures/phase4/modal-provider-state.json` for timestamp and exact decimal values.

## Illustrative run floors

At the recorded rates, excluding all non-sandbox costs:

| Profile | CPU | Memory | Duration | Compute floor |
|---|---:|---:|---:|---:|
| Small task | 1 | 1 GiB | 60 s | `$0.0027684` |
| Standard task | 1 | 1 GiB | 5 min | `$0.0138420` |
| Document task | 2 | 4 GiB | 10 min | `$0.0634320` |
| Heavy bounded task | 4 | 8 GiB | 15 min | `$0.1902960` |

These are planning calculations, not price promises. They omit cold image transfer, snapshots/Volumes, object storage, model tokens, search/data APIs, Composio/provider tool fees, collaboration, database, observability, payment fees, and retries.

## Complete run COGS model

Phase 4B usage finalization should persist at least:

```text
run_cogs = model_cost
          + tool_and_connector_cost
          + sandbox_cpu_cost
          + sandbox_memory_cost
          + sandbox_storage_and_snapshot_cost
          + artifact_storage_and_egress_cost
          + render_cost
          + allocated_database_realtime_observability_cost
```

Every sandbox attempt needs requested resources, provider sandbox ID, image ID, started/ready/terminated timestamps, exit reason, snapshot operations, output byte counts, and provider-reconciled cost. Retried attempts remain separate rows; the run aggregate must not hide retry waste.

## Seat economics guardrail

At the current `$30/user/month` planning price, expected all-in provider COGS should remain below roughly 20–30% of recognized seat revenue under the expected workload distribution. This is a portfolio guardrail, not a per-user hard promise and not permission to degrade output quality silently.

The production model requires cohorts:

- light knowledge/chat user;
- expected mixed user;
- document/research-heavy user;
- finance/data-heavy user;
- adversarial maximum-budget user;
- organization with bursty automation.

For each cohort, measure task count, accepted-output rate, model/tool/sandbox retry rate, p50/p95 duration, compute, tokens, external API fees, artifact bytes, and gross margin. Cost per successful accepted output is more useful than cost per attempted run.

## Latency targets and missing instrumentation

The smoke records full-suite elapsed time but does not yet split:

- provider create request;
- image cold start;
- sidecar readiness;
- working-set materialization;
- first event;
- first model token;
- tool latency;
- semantic output upload;
- checkpoint duration;
- termination confirmation.

Phase 4B should capture these spans with a shared run/attempt correlation ID and report p50/p95/p99 by image kind and cold/warm state. Establish a warm pool only if measured demand and latency justify idle cost. The initial design intentionally has no paid idle pool.

## Cost controls

- Resolve resource classes through versioned policy; never accept arbitrary model-authored CPU/memory/wall time.
- Reserve budget before create and release it on every terminal path.
- Stop compute during long approval waits after a durable checkpoint.
- Cancel child processes and terminate the sandbox promptly.
- Reuse pinned images and caches without sharing writable run state.
- Avoid installing dependencies per request.
- Set retry and checkpoint budgets independently from model retries.
- Alert on orphan sandboxes, unusually long readiness, output-validation loops, and provider-billing drift.
- Compare requested-versus-observed percentiles before raising limits.

# T3 Code reference record

This directory contains metadata and the upstream license only. T3 Code is not a production dependency and no T3 Code source is copied here.

Pinned reference: [`pingdotgg/t3code@f61fa9499d96fee825492aba204593c37b27e0cb`](https://github.com/pingdotgg/t3code/tree/f61fa9499d96fee825492aba204593c37b27e0cb), MIT.

Beyond may borrow architectural concepts, not implementation code:

- separate provider-runtime ingestion from product-owned orchestration events;
- normalize provider-specific receipts before projection;
- append commands/events before deriving browser state;
- keep shared browser/server contracts schema-only;
- isolate provider command reactors from the event store and projections;
- rebuild UI state from authoritative projections after reconnect;
- checkpoint projections without treating a cache as the source of truth;
- surface runtime errors and recovery as first-class user-visible states.

The pinned paths and content hashes in `PROVENANCE.json` identify the exact material reviewed. Beyond’s protocol and implementation must be independently designed around its own identity, authorization, durability, and runtime requirements.

Any future code reuse requires a separate legal review, preserved MIT notices, and an explicit provenance update.

# Final Submission Contents

This folder contains the primary final-submission artifacts for Beyond Chat.

- `Beyond Chat Final Report .pdf` - final written report with a supplemental operations section appended.
- `spec.md` - product scope, UX contract, and implementation expectations.
- `system-architecture.md` - architecture diagram and runtime notes.
- `MOMs.md` - meeting notes.
- `weeklyUpdates/` - weekly progress reports retained as historical evidence.

## Additional Current Docs

The repository also keeps detailed supporting docs in `old-docs/`. Despite the folder name, several files there remain useful evidence:

- `old-docs/docs__api-spec.md`
- `old-docs/docs__api-contracts.md`
- `old-docs/manual.md`
- `old-docs/completed.md`
- `old-docs/blocker.md`

## Topics Covered

The final submission now explicitly covers:

- Scalability through stateless backend design, Vercel-managed routing/serverless scaling, Supabase managed storage/database, and provider-aware failure handling.
- Rate-limit and usage strategy through provider error handling plus the `usage_events` billing model, with full application-level enforcement identified as a hardening point where not implemented.
- CI/CD through the checked-in GitHub Actions workflow at `.github/workflows/ci.yml` and Vercel Git deployments.
- Why Beyond Chat is not an aggregator: studios produce durable artifacts, preserve provenance, and reuse retrieved context across workflows.
- RAG/context reuse through the Context Builder and artifact retrieval model.
- Authentication through Supabase Auth, backend JWT validation, profile-scoped ownership, and Postgres RLS.
- Minimum-cost prompting through bounded context, dataset profiling, targeted edits, model comparison only when needed, and usage visibility.
- Inline chat/workflow actions through save, compare, continue-in-studio, and targeted-edit flows.

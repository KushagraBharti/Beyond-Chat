# KUSHAGRA BHARTI

## Weekly Summary
- Week 8 was focused on production hardening across the core chat, image, and deployment paths.
- I centralized model metadata into a single curated catalog so Chat, Compare, and Writing all read from the same source of truth.
- I updated the default model to GPT-5.4 Nano, added markdown rendering and streaming support in Chat, and expanded the image workflow to support multiple models with per-model failure handling.
- In parallel, I cleaned up the local-versus-production API resolution and Vercel configuration so the frontend and backend stay aligned in both dev and deployed environments.

## Work Completed
- Reworked `frontend/src/lib/modelCatalog.ts` into a centralized curated catalog with provider, lab, tier, tag, and enabled/default metadata.
- Updated the default chat and compare model selection to GPT-5.4 Nano, and propagated the new model defaults through backend env examples and config.
- Added markdown rendering to `ChatPage.tsx` with `react-markdown` and `remark-gfm` so assistant responses preserve structure and formatting.
- Implemented streaming chat delivery with optimistic user/assistant message placeholders, incremental assistant text updates, and post-stream reconciliation once the final response arrives.
- Refactored `backend/src/workflows.py` image generation to accept multiple selected models, generate in parallel, and continue returning the successful outputs even if one model fails.
- Added per-model error tracking and variant metadata to the image workflow so the frontend can report partial success instead of treating the whole run as failed.
- Updated `ImagePage.tsx` to support selecting multiple image models, render grouped results by model, and show clearer status messages when some models fail.
- Tightened API base URL resolution in `frontend/src/lib/api.ts` so local development still uses the configured backend while production avoids accidentally pointing at localhost.
- Simplified CORS and Vercel deployment settings in `backend/src/main.py`, `backend/src/config.py`, `backend/vercel.json`, and `frontend/vercel.json` to match the current local and hosted runtime assumptions.
- Cleaned up the deployment docs and environment examples so the required OpenRouter, Supabase, and Vercel settings are consistent.

## Research / Technical Findings
- Centralizing model metadata reduced drift across studios and made it easier to switch defaults without touching each feature independently.
- Streaming chat works best when the UI renders optimistic placeholders first and then reconciles them with the final server payload after the stream ends.
- Letting image generation continue per model is a better failure mode than aborting the entire run when one provider or model returns an error.
- Production and local API resolution need different rules; the frontend should not carry localhost defaults into deployed builds.
- Keeping Vercel rewrites and backend CORS aligned with the actual hostnames prevents avoidable deployment regressions.

## Blockers / Risks
- Model availability and naming on OpenRouter can still change, so the curated catalog will need ongoing maintenance.
- Multi-model image generation increases latency and makes partial failures more common, so the UI will need to keep reporting those outcomes clearly.
- Streaming chat is more sensitive to network interruption, which makes retry behavior and error recovery important for future polish.
- The deployment surface now depends on several environment variables across frontend and backend, so config drift remains a risk if future changes are not kept in sync.

## Hours Worked
- Total estimated time: 12 hours

- 

# YUVRAJ

## Weekly Summary
- Week 8 was focused on final debugging, fixing deployment issues, and stabilizing the system so it could reliably run in production.
- I spent most of the time resolving frontend build failures, backend deployment crashes, and mismatches between local and deployed environments.
- The goal was to ensure the entire stack — frontend, backend, and database — worked cleanly together in a deployed setting without breaking.

## Work Completed
- Debugged and fixed frontend TypeScript build errors that were blocking Vercel deployment, including component prop typing issues and unused variables.
- Updated shared UI components to support proper typing (e.g., adding style support to reusable components) without breaking design consistency.
- Fixed Compare Page issues that were preventing the frontend from compiling and deploying successfully.
- Worked through backend deployment errors caused by incorrect runtime behavior and environment differences between local and Vercel.
- Diagnosed and resolved issues related to SQLite usage in a serverless environment, ensuring the backend no longer crashes on startup.
- Fixed repository/deployment mismatches by aligning the correct GitHub fork with the Vercel project so the latest code could actually be deployed.
- Reconfigured deployment pipeline to ensure Vercel was building from the correct branch and commit history.
- Ran multiple redeploy cycles and validated that fixes were reflected in production builds.
- Performed end-to-end testing across deployed environments to confirm that authentication, model execution, and artifact flows were functioning correctly.
- Helped stabilize the development workflow by reducing discrepancies between local builds and production deployments.

## Research / Technical Findings
- Serverless environments like Vercel impose strict filesystem constraints (read-only), making local database approaches like SQLite unreliable without lazy initialization.
- Deployment failures are often caused by mismatches between repository state and the version being deployed, not just code bugs.
- Strict TypeScript enforcement in production builds surfaces issues that may not appear during local development.
- Properly typed reusable components are critical for maintaining scalability in a growing frontend codebase.

## Blockers / Risks
- Future deployment issues may arise if environment variables or project configurations drift between team members.
- Serverless constraints continue to limit certain backend patterns and require careful handling of state and storage.
- As complexity increases, debugging across frontend, backend, and infra layers can become more time-intensive.

## Startup / Execution Notes
- This week was heavily focused on making the product stable and deployable rather than adding new features.
- Fixing deployment and build issues significantly improved the team’s ability to iterate quickly and confidently.

## Hours Worked
- Total estimated time: 23 hours

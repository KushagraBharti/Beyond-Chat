# KUSHAGRA

## Weekly Summary
- Week 4 was a major execution week focused on turning Beyond Chat into a much more complete local-first product.
- The goal was to replace partial scaffolding with real routes, real backend contracts, real documentation, and a much clearer production handoff path.
- The biggest outcome was that the project now feels much more concrete: most of the remaining work is manual setup, provider configuration, or quality improvements rather than missing product structure.

## Work Completed
- Expanded the protected app into a real workspace with Home, Chat, Writing, Research, Image, Data, Finance, Artifacts, and Settings.
- Kept Compare inside Chat and improved the overall protected product flow.
- Improved the Writing flow with separate library/editor views and stronger editor scaffolding.
- Built out Research, Image, Data, Finance, Artifact Library, and Settings into more complete product surfaces.
- Expanded the FastAPI backend with broader API coverage for auth bootstrap, workspace data, chat, runs, artifacts, exports, provider status, and integrations.
- Added stronger JWT/request-context handling and improved the local-first auth path.
- Wrote and cleaned up the Supabase SQL handoff files for schemas, RLS, and storage setup.
- Added or finalized major documentation:
  - `spec.md`
  - API contracts/spec docs
  - architecture diagram
  - sprint planning doc
  - `completed.md`
  - `manual.md`
  - `blocker.md`
- Added backend test coverage and ran backend validation successfully.
- Used Playwright to do real browser QA across login, dashboard, chat compare, writing, artifacts, research states, and settings.
- Updated Linear so the repo-complete tickets are marked done and the remaining manual storage work stays in progress.

## Research / Product Findings
- Local-first development was the right approach because it let the app become much more complete without waiting on every external credential.
- Provider-disconnected states are essential because they keep the product usable even before final setup is complete.
- The project is now much less blocked by missing architecture decisions and much more focused on final integrations and polish.

## Blockers / Risks
- Supabase SQL still needs to be executed manually in the real project.
- Storage bucket setup, Google OAuth, and live provider credentials still need manual completion.
- Bun validation on this OneDrive-backed workspace had local package-entry issues, so the backend validation was cleaner than the frontend rerun path.

## Startup / Execution Notes
- This week felt like a startup execution sprint: reduce ambiguity, ship real infrastructure, and make the remaining work concrete.
- The app is now in a much better state for iteration, demos, and assigning the next round of work.

## Hours Worked
- Total estimated time: 21 hours


# YUVRAJ

## Weekly Summary
- Week 4 focused on strengthening the backend infrastructure and connecting more of the system pieces so the product could move closer to a fully functional MVP.
- My work this week was centered around setting up the Supabase project environment, preparing the database structure, and improving the backend services that support runs, artifacts, and model execution.
- The goal was to ensure the system could reliably support studio workflows and persist outputs across sessions while keeping the development environment stable for the team.

## Work Completed
- Created and configured the Supabase development project for the team and recorded the required project credentials.
- Enabled Supabase Auth and began testing email/password authentication flows with the frontend.
- Set up the initial storage bucket for user file uploads and artifact-related assets.
- Worked on connecting the backend services to Supabase so artifact data and run results could be persisted.
- Continued refining the FastAPI endpoints responsible for executing runs, retrieving artifacts, and exporting outputs.
- Improved the OpenRouter integration so model responses could be captured more consistently and returned through the API layer.
- Helped test multi-model execution paths to support the model comparison functionality.
- Ran backend tests and local development checks to confirm the API service and database connections were working correctly.
- Reviewed teammate changes and ensured the backend contracts remained compatible with the evolving frontend routes and studio flows.

## Research / Technical Findings
- Supabase simplified several infrastructure concerns by combining authentication, database management, and file storage into one platform.
- Separating artifact storage from run execution makes it easier to support reusable outputs across multiple studios.
- Using a single execution layer for model calls makes the system easier to extend to additional providers without rewriting studio logic.

## Blockers / Risks
- Some database policies and workspace membership rules still need refinement to ensure proper access control.
- Storage and file upload flows require additional testing once more studios begin generating artifacts.
- Model execution paths need more testing across different prompt types to ensure consistent responses.

## Startup / Execution Notes
- This week focused on strengthening the backend foundation so that the product features being developed on the frontend could interact with stable APIs and persistent storage.
- With the Supabase environment and backend services becoming more stable, the next phase will focus more on feature completion and workflow refinement.

## Hours Worked
- Total estimated time: 17 hours

# NISHANT

## Weekly Summary
- This week focused on setting up Supabase Storage and connecting backend infrastructure to support artifact management and workspace file access.
- Work was centered around configuring the storage bucket, establishing proper access control policies, and ensuring the backend environment variable matched the bucket configuration.
- The goal was to ensure files and artifacts could be reliably stored and retrieved by the correct workspace members.

## Work Completed
- Created the `artifacts` bucket in Supabase Storage Dashboard with private access configuration.
- Configured upload path convention to follow `workspace_id/artifact_id/file-name.ext` for consistent file organization.
- Added Row Level Security (RLS) policies so only workspace members can access their own files.
- Executed `008_storage_setup.sql` to complete the storage backend setup.
- Confirmed the `SUPABASE_STORAGE_BUCKET` environment variable matches the bucket name exactly.

## Research / Technical Findings
- Learned how Supabase Storage works, including bucket creation, access controls, and path conventions for organizing files by workspace and artifact.
- RLS policies in Supabase are the critical layer for ensuring users can only access files scoped to their own workspace folder.
- Structuring storage paths by `workspace_id/artifact_id` makes it easier to scope access control and retrieve artifacts cleanly across the backend.

## Blockers / Risks
- RLS policy queries may need adjustment depending on the exact schema table and column names once tested end-to-end.
- Storage and file upload flows require additional testing once more workspaces begin generating artifacts at scale.

## Startup / Execution Notes
- With the storage bucket and RLS policies in place, the next phase will focus on testing real upload flows and validating that workspace-scoped access control holds up under different user scenarios.

## Hours Worked
- Total estimated time: 8 hours

 Weekly Summary

## Overview
This week focused on improving the frontend routing experience, resolving several React code quality issues, and polishing backend services to ensure the application remains stable as development progresses.

My work centered on implementing authentication-related frontend routes, improving navigation between studio pages, fixing React hook violations and state synchronization issues, and improving backend code quality. I also verified the OpenRouter integration to ensure the system could successfully communicate with external model APIs.

The goal was to improve overall application stability, maintain clean code standards across the frontend and backend, and ensure the development environment remained free of build or linting errors.

---

## Diya 

## Work Completed

- Implemented authentication-related routing by creating and wiring up a **SignUpPage** and fixing the **LoginPage** navigation to correctly redirect users to the dashboard.
- Updated the **LandingPage Bento grid navigation**, making the studio tiles clickable and routing them correctly to pages such as `/writing` and `/research`.
- Added the latest **atelier-plus UI mockups** for the landing page, pricing page, and sign-up page.

- Resolved a **React Hook violation** where `useTransform()` was being called inside a `.map()` loop on the LandingPage by extracting the mapped element into a separate `ManifestoWord` component.
- Fixed a **synchronous state update issue** inside the `AuthContext` provider caused by calling `setState` improperly inside a `useEffect`.
- Corrected a broken dependency array (`[workspaceId]`) inside `ChatPage.tsx` to prevent React warnings.
- Suppressed safe type-check warnings for raw UI mockup variants to achieve a **clean `bun run lint` result with zero build errors**.

- Improved backend code quality by running:
  - `uvx ruff format .`
  - `uvx ruff check .`
  
  across the `backend/src` directory to enforce consistent formatting and remove unused imports.

- Tested the **OpenRouter integration** and verified successful API connectivity for model requests.

---

## Research / Technical Findings

- React Hook rules require hooks to be called consistently outside loops or conditional blocks, which is why extracting components like `ManifestoWord` improves code reliability.
- Maintaining strict linting and formatting checks ensures the project remains easier to maintain as the codebase grows.
- Integrating OpenRouter through a centralized API layer makes it easier to manage model requests and expand to additional providers in the future.

---

## Blockers / Risks

- Some UI mockup variants required linter suppression due to incomplete type definitions.
- Navigation and studio routes will require further testing as additional features are connected to them.

---

## Startup / Execution Notes

This week focused on stabilizing both the frontend and backend foundations of the application. Ensuring proper routing, eliminating React warnings, and maintaining clean backend code helps prevent future integration issues as more features are implemented.

With these improvements in place, development can continue toward refining studio workflows and expanding the system’s AI-powered functionality.

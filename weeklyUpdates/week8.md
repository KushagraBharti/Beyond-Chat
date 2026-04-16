# NISHANT

## Weekly Summary
- Week 7 focused on auditing the Image Studio against its original Linear acceptance criteria and closing the remaining gaps to bring the feature to a fully complete state.
- I reviewed the three Linear issues tied to the Image Studio (BEY-48, BEY-40, BEY-32) and traced each acceptance criterion through the codebase to confirm what was implemented and what was missing.
- The one gap identified was that clicking a generated image was supposed to open it full-size in a modal - this behavior was specified in BEY-48 but had not been implemented. I built and shipped the lightbox modal this week.

## Work Completed
- Pulled and reviewed all three Image Studio Linear issues (BEY-48, BEY-40, BEY-32) to systematically check acceptance criteria against the current implementation.
- Confirmed BEY-40 (backend workflow) and BEY-32 (Supabase Storage) were fully implemented - prompt enhancement, image generation, upload pipeline, and signed URL delivery were all working correctly.
- Identified the missing feature from BEY-48: clicking a generated image should open it full-size in a modal, which was not yet implemented.
- Added `modalUrl` state to `ImagePage.tsx` to track which image is currently open in the lightbox.
- Added `onClick` and `onKeyDown` handlers to all image preview elements in both the fresh outputs section and the saved gallery section.
- Built the lightbox overlay - a fixed full-screen backdrop that dismisses on click, rendering the selected image at up to 90vw/90vh with `object-fit: contain`.
- Added `image-gallery-preview--clickable` CSS class with a zoom-in cursor to communicate interactivity on hoverable images.
- Added `.image-lightbox-overlay` and `.image-lightbox-img` CSS rules to `index.css` to style the modal and prevent image clicks from closing it unintentionally.
- Pushed the changes to `main` and verified the commit included only the intended files.

## Research / Technical Findings
- A fixed-position overlay with `inset: 0` is the simplest reliable approach for a full-screen lightbox without pulling in a modal library.
- Using `e.stopPropagation()` on the inner image element prevents the backdrop click-to-close from firing when the user clicks directly on the image.
- Keyboard accessibility for the lightbox required both `role="button"` and `onKeyDown` on the clickable preview divs since they are `<div>` elements rather than native buttons.
- Saved gallery images conditionally get the clickable class only when a `previewImage` URL is present, which prevents giving a zoom cursor to placeholder tiles that have no image to show.

## Blockers / Risks
- Signed URL expiration from week 6 remains an open issue - images in the saved gallery will eventually return broken `<img>` tags as their 24-hour URLs expire. A URL refresh mechanism or longer-lived signed URLs are needed before production.
- The lightbox does not currently have a close button, relying entirely on backdrop click and keyboard dismiss - a visible close affordance may be needed for mobile users.

## Hours Worked
- Total estimated time: 10 hours

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

# Diya

## Weekly Summary

**Week 7** focused on refining the overall user experience of the workspace by polishing the core navigation system and completing the full integration of the Compare Studio feature. A significant portion of this week was dedicated to improving the responsiveness and visual stability of the sidebar, ensuring that transitions between expanded and collapsed states felt smooth, intentional, and free of disruptive layout shifts.

In addition to resolving UI inconsistencies in the navigation layer, I also worked on elevating the Model Compare page to align with the design standards established across the rest of the application. This involved replacing temporary UI elements with the standardized component system, improving both the visual consistency and maintainability of the codebase. Overall, the goal for the week was to move the product closer to a cohesive, production-ready interface by eliminating rough edges and ensuring all major features are properly integrated into the workspace.

---

## Work Completed

- Conducted a detailed audit of the sidebar behavior within the `DashboardLayout` component to identify the root cause of abrupt layout snapping during expansion and collapse interactions. Implemented smoother transitions by introducing cubic-bezier CSS transition rules to both the `.app-sidebar` width and `.app-main` margin, resulting in a significantly improved and more polished animation experience.

- Resolved persistent text clipping issues affecting the "Workspace" and "Library" section labels in the collapsed sidebar state. This was achieved by applying `overflow: hidden` and combining it with a controlled opacity transition, ensuring that text fades out cleanly instead of being abruptly cut off, which improves both readability and perceived quality.

- Investigated a horizontal overflow issue in the compact sidebar configuration and identified the `AppBrand` component as the source. The issue stemmed from the "Beyond Chat" text remaining rendered even in compact mode. Updated `protectedUi.tsx` to conditionally unmount the text when the `compact={true}` prop is passed, eliminating overflow and restoring proper layout constraints.

- Finalized the integration of the Compare Studio feature into the main user workflow by adding a dedicated shortcut tile on the dashboard (`HomePage.tsx`). This ensures that the feature is easily discoverable and accessible, improving overall usability and feature visibility.

- Performed a comprehensive UI refactor of `ComparePage.tsx`, replacing raw HTML elements such as `<textarea>` and `<button>` with standardized design system components including `<PageSection>`, `<MotionCard>`, `<TextArea>`, and `<PrimaryButton>`. This change enhances consistency across the application, improves accessibility, and aligns the page with the established visual language of the workspace.

- Organized and committed all changes into two clean, well-scoped commits - one focused on sidebar and navigation fixes, and the other dedicated to Compare Studio integration and UI improvements - ensuring clear version control history and maintainability.

---

## Research / Technical Findings

- Determined that leveraging native CSS transition properties for layout changes (specifically sidebar width adjustments) is significantly more performant than relying on heavier animation libraries for this use case. By combining `white-space: nowrap` with `overflow: hidden`, it is possible to achieve smooth and visually stable transitions without introducing unnecessary rendering overhead.

- Discovered that the `MotionCard` component enforces design constraints by stripping inline style objects, which prevents ad hoc layout styling. As a result, layout-specific rules such as grid and flexbox configurations must be applied through wrapper elements or predefined class names (e.g., `.compare-card`). This reinforces consistency but requires more deliberate structural planning during implementation.

- Validated the reliability of the OpenRouter integration through end-to-end API testing using `curl`. These tests confirmed that multi-model comparison requests are successfully processed and returned as structured JSON payloads, which are then safely transformed and consumed by the frontend via the `lib/api.ts` mapping layer.

---

## Blockers / Risks

- The Image Studio feature remains partially blocked due to limitations in the OpenRouter API, which does not currently provide support for a native `/images/generations` endpoint. To enable image generation functionality, an alternative solution must be implemented, such as integrating directly with the OpenAI API or configuring a third-party provider like Stability AI through environment variables in the `.env` file.

- The current error handling strategy within the `ComparePage` is heavily dependent on textual error output. In scenarios where the `comparePrompt` API call fails due to parsing issues or model provider timeouts, the user experience may degrade. A more robust fallback mechanism, such as a visual empty state or loading/error illustration, should be considered to improve resilience and usability under failure conditions.

---

## Hours Worked

**Total estimated time:** 8 hours

## HARSH KOTHARI

Weekly Summary

- Focused on building and shipping the Model Compare Studio - the side-by-side LLM comparison feature that lets users send the same prompt to multiple models and see responses together.
- Resolved merge conflicts and integration issues to get the feature merged into main and deployed to Vercel.
- Fixed backend auth flow for local development and configured environment secrets (Supabase JWT, OpenRouter).

Work Completed

- Built ComparePage.tsx - full UI with prompt input, toggleable model selector (GPT-4o, Claude Sonnet, Gemini Flash), compare button, and side-by-side results panel with loading animations and latency metadata.
- Wired the Compare Studio into the existing app routing as a lazy-loaded /compare route and added it to the sidebar navigation.
- Resolved merge conflicts between the feature branch and main (which had evolved significantly with new routing, API layer, and lazy loading patterns).
- Adapted the Compare page to use main's existing comparePrompt() API and theme tokens instead of standalone implementations.
- Configured backend .env with Supabase JWT secret and OpenRouter API key.
- Fixed backend auth middleware to prioritize local dev bypass over JWT verification, unblocking local testing.
- Deployed frontend changes to Vercel via push to main.

Research / Technical Findings

- Main branch already had a /api/chat/compare backend endpoint and comparePrompt() API helper - only the frontend UI was missing.
- Supabase JWT secret (from Dashboard > API > JWT Settings) is different from the secret API key - needed the correct one for backend token verification.
- Backend auth middleware was blocking local dev when a Supabase session token was present but JWT verification wasn't configured - moving the dev bypass check earlier in the flow fixed this.

Blockers / Risks

- OpenRouter API key has no credits - need to purchase credits before the Compare Studio can be fully tested end-to-end.
- Backend is not deployed yet (only frontend on Vercel), so the Compare Studio only works locally for now.

Hours Worked

- Total estimated time: ~5 hours


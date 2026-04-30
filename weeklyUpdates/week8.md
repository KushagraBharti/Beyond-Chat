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


## Hours Worked
- Total estimated time: 23 hours





  # HARSH KOTHARI                                                               
                                                                                
  ## Weekly Summary                                                             
  - Week 8 focused on finishing the Model Compare Studio — getting it merged    
  into main, deployed, testable end-to-end, and significantly improved with a   
  synthesis feature that combines multiple model outputs into a single best     
  answer.                                                   
  - The week was split between three phases: resolving the merge conflicts that 
  had accumulated while the feature branch was open, untangling local/deployment
   configuration issues that blocked testing, and building the synthesis agent  
  on top of the comparison UI.                              
  - By end of week the Compare Studio works locally end-to-end, produces        
  synthesized answers with markdown rendering, and the synthesis prompt has been
   tuned to reduce false-confidence errors.                                     
                                                            
  ## Work Completed                                                             
  - Rebased the `feat/model-compare-studio` branch against main and resolved
  conflicts across `backend/pyproject.toml`, `backend/src/main.py`,             
  `backend/uv.lock`, `frontend/src/App.tsx`, and `frontend/src/lib/api.ts`.     
  - Discovered that main had evolved significantly while the feature branch was
  open — it already had a full `/api/chat/compare` backend endpoint and a       
  comprehensive `api.ts` with a `comparePrompt()` helper. Redesigned the merge
  approach to keep only the unique contribution (the `ComparePage.tsx` UI       
  component) and adapted it to use main's existing API layer.                   
  - Adapted `ComparePage.tsx` to match main's lazy-loading pattern, flat route
  structure, and design token system (`theme.ts`, `headingFont`, `bodyFont`).   
  - Added a lazy-loaded `/compare` route to `App.tsx` and a "Compare" entry to
  the primary sidebar nav in `DashboardLayout.tsx`.
  - Committed cleanly to main and pushed — Vercel auto-deploy triggered.        
  - Debugged Vercel deployment — identified that the connected Vercel project
  was pointed at a personal fork (`harsh34342/beyondchat`) with only an initial 
  commit, not at `KushagraBharti/Beyond-Chat` where the actual code lived.
  Synced the fork by force-pushing the main history, unblocking the deployment  
  pipeline.                                                                     
  - Fixed Vercel's commit-author validation block — corrected the local git     
  config email to match the GitHub account (`harshwardhankothari@gmail.com`) and
   amended the author on the Compare Studio commit so future deploys would pass
  validation.
  - Got the stack running locally for testing — killed stale processes on port  
  8000, ran the FastAPI backend with `uv run uvicorn` and the Vite frontend with
   `bun run dev`.                                                               
  - Fixed backend auth middleware (`backend/src/auth.py`) — moved the local dev
  bypass check before the JWT verification flow, so a logged-in Supabase session
   wouldn't block requests when the backend doesn't have the JWT secret
  configured. Removed the now-duplicate bypass block lower in the function.     
  - Configured Supabase JWT secret and quoted the value in `.env` to handle the 
  `+` and `==` characters correctly.          
  - Diagnosed and explained the OpenRouter 402 error (account had zero credits) 
  and walked through which account owned the `sk-or-v1-f2a...b8c` key using the
  `/api/v1/auth/key` endpoint.                                                  
  - Built the **Synthesize Best Answer** feature — added an `openrouterChat()`
  helper to `frontend/src/lib/api.ts` hitting the existing                      
  `/api/openrouter/chat` endpoint, and added a purple-highlighted synthesis
  panel to `ComparePage.tsx` that appears below the comparison cards.           
  - Wrote the first version of the synthesis prompt (GPT-4o, temperature 0.3)   
  that asks the model to combine the strongest insights, correct inaccuracies,
  and produce a single best answer.                                             
  - Reviewed the first synthesized output (a Greek painting history response)
  and identified a systemic problem — the synthesizer inherited confident but   
  incorrect claims that appeared in the majority of source responses (e.g.
  labeling Minoan Knossos frescoes as "Ancient Greek").                         
  - Tuned the synthesis prompt with seven explicit rules: correct errors even if
   repeated by the majority, flag disputed claims with hedges, note
  disagreements between source responses, don't fabricate gaps, prioritize      
  precision over confident-sounding prose.                  
  - Verified the improved prompt produced a meaningfully better answer — Minoan 
  error removed, claims properly qualified, scope discipline improved.
  - Added a minimal inline markdown renderer to `ComparePage.tsx` to handle     
  `**bold**`, `### headings`, numbered lists, and bulleted lists without pulling
   in a `react-markdown` dependency — fixed the issue where the synthesis panel
  was rendering raw asterisks as literal characters.
  - Applied the same markdown rendering to the individual model response cards  
  so formatting is consistent across comparison and synthesis outputs.
                                                                                
  ## Research / Technical Findings                          
  - When a feature branch sits open for a long time while main evolves, the     
  right integration strategy isn't "merge and resolve" — it's "identify what's
  actually unique on the branch and port only that forward." The rest was       
  already solved on main.                                   
  - Vercel's commit-author validation blocks deploys when the local machine's   
  git email doesn't match the committer's GitHub account email — this surfaces
  quietly and is easy to miss if you're not reading the full deployment error   
  panel.                                                    
  - Vercel projects track a specific git repo, not a filesystem path — if a     
  developer forks a repo and connects Vercel to the fork, pushes to the upstream
   don't trigger deploys until the fork is synced.                              
  - FastAPI auth middleware order matters — dev bypass checks should run before
  JWT verification, otherwise a logged-in user with a valid session gets blocked
   in local environments that don't have JWT secrets configured.
  - Environment variables with base64-like values containing `+` or `==` need to
   be quoted in `.env` files for `python-dotenv` to parse them correctly.       
  - Naive synthesis of multiple LLM outputs tends to inherit shared errors — if
  two out of three models make the same factual mistake, the synthesizer treats 
  it as consensus and repeats it. Explicit instructions to flag contested claims
   and correct majority errors meaningfully reduce this failure mode.
  - A small hand-written markdown renderer (handling bold, headings, lists) is  
  often better than adding a dependency when the content surface is narrow and
  known.                                                                        
                                                            
  ## Blockers / Risks                         
  - Backend is still not deployed to any hosting platform — the Compare Studio
  only works locally since Vercel only serves the frontend. Cloud deployment of
  the FastAPI service is the next blocker.                                      
  - The Vercel project on my account is tied to a personal fork, not the main
  team repo — this works but adds a sync step before every production deploy.   
  Ideally the team's Vercel project would be connected directly to
  `KushagraBharti/Beyond-Chat`.                                                 
  - The synthesis feature adds a 4th model call per comparison, which roughly   
  doubles the OpenRouter cost of a typical compare session. Worth monitoring if
  the studio sees real usage.                                                   
  - The inline markdown renderer handles the common cases but doesn't cover
  everything (no tables, no nested lists beyond one level) — if model outputs   
  start relying on richer markdown, swapping to `react-markdown` will be needed.
                                                                                
  ## Hours Worked                                                               
  - Total estimated time: ~10 hours
- Fixing deployment and build issues significantly improved the team’s ability to iterate quickly and confidently.



## Hours Worked  
- Total estimated time: 14 hours  

---

# DIYA  

## Weekly Summary  
- Week 8 focused on refining the user experience in the Studio and improving overall UI consistency across the application.  
- I spent most of my time enhancing frontend components, polishing layout behavior, and assisting with smaller debugging tasks to improve usability.  
- The goal was to make the interface more intuitive and visually consistent while ensuring core features worked smoothly for users.  

## Work Completed  
- Improved the Studio UI by refining layout structure, spacing, and component alignment to create a more cohesive user experience.  
- Enhanced reusable UI components to better support flexibility across different pages (e.g., improved props handling and styling consistency).  
- Assisted in polishing the Compare Studio interface to ensure outputs display clearly and consistently across different models.  
- Fixed minor frontend bugs related to rendering issues, incorrect component states, and UI inconsistencies.  
- Helped debug issues where certain UI elements were not updating properly after user interactions.  
- Improved navigation flow between pages to make transitions smoother and more intuitive.  
- Collaborated with teammates to identify UI pain points and implemented small fixes to improve usability.  
- Tested various user flows (Studio usage, model comparison, login navigation) to ensure a smooth and predictable experience.  

## Research / Technical Findings  
- Consistent component design significantly reduces UI bugs and improves maintainability across the application.  
- Small UI inconsistencies (spacing, alignment, state updates) can have a large impact on perceived product quality.  
- Proper state handling in React components is critical for ensuring UI updates correctly after user actions.  
- Iterative UI testing helps catch edge cases that are not obvious during initial development.  

## Blockers / Risks  
- UI inconsistencies may reappear if shared components are modified without maintaining design standards.  
- As new features are added, maintaining a consistent design system will become increasingly important.  
- Some frontend bugs are tied to backend response timing, which can make debugging more complex.  

## Startup / Execution Notes  
- This week emphasized improving usability and polish rather than introducing new functionality.  
- UI refinements and small bug fixes helped make the product feel more stable and user-friendly.  
- These improvements will make future feature development easier by building on a more consistent frontend foundation.

## Time worked: 
- 6 hours 

# NISHANT BHAGAT

## Weekly Summary
- Week 8 was focused on building out the Image Studio from the ground up — getting prompt controls, model selection, and Supabase-backed image storage working end-to-end.
- I spent most of my time designing the frontend upload and display flow, wiring the image generation backend to Supabase Storage, and making sure generated images persist across sessions.
- A secondary focus was making the studio resilient when one model fails — showing partial results instead of blocking the entire run.

## Work Completed
- Built the initial `ImagePage.tsx` with prompt input, model selection controls, aspect ratio and style options, and a results grid.
- Integrated the image generation run flow with the backend `/api/runs` endpoint using the `image` studio type.
- Wired Supabase Storage upload into the image workflow so generated images are saved to the `artifacts` bucket under a workspace-scoped path.
- Added signed URL generation so image results render from Supabase Storage rather than relying on transient model API URLs.
- Implemented per-model result rendering so the UI groups outputs by model and clearly shows which models succeeded and which failed.
- Added loading states and error badges for individual model slots so partial success is communicated clearly without hiding results that did come back.
- Tested the end-to-end flow locally across multiple image models to confirm storage paths, signed URLs, and run records were all writing correctly.
- Coordinated with Kushagra on the parallel generation changes in `backend/src/workflows.py` to make sure the frontend contract matched the new multi-model output shape.

## Research / Technical Findings
- Supabase Storage signed URLs have a configurable expiry — for image results we default to 1 hour, which is enough for active sessions but means bookmarked URLs will expire. Long-term artifact links need a refresh mechanism.
- Grouping image results by model requires the backend to return per-model status alongside the output so the frontend can differentiate success, failure, and pending.
- Aspect ratio and style options vary significantly across image models — treating them as optional metadata passed through the run options dict is more flexible than hardcoding per-model controls.

## Blockers / Risks
- Signed URL expiry means shared image links stop working after an hour — a longer-lived access pattern (e.g. RLS-based public reads or on-demand re-signing) will be needed before image artifacts are truly durable.
- Image generation latency is high enough that users may think the studio is broken during the wait — better progress indicators are needed.

## Hours Worked
- Total estimated time: 11 hours

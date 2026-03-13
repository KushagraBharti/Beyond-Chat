Diya: Created frontend framework for the diff. studios, added ImageStudio.tsx + FinanceStudio.tsx, did not push to main yet 

Nishant: 
Frontend Work:

    Setting up React Router v6 for all planned pages (Landing, Pricing, Studios, etc.).

    Building the "Protected Route" wrapper to redirect unauthenticated users to /login.

Backend Work:

    Enabling Row Level Security (RLS) on all core tables (workspaces, artifacts, runs, etc.).

    Implementing draft policies so users can only access data within their own workspaces.

Blockers:

    Finalizing the logic for workspace membership checks to ensure RLS doesn't block legitimate access.

    Testing session persistence across the new protected routes before pushing the scaffold.

Status: Currently in progress; changes are local and have not been pushed to main yet.

# KUSHAGRA

## Weekly Summary
- Week 3 was the first real MVP rescue sprint where I focused on making the app actually usable instead of letting it stay half-broken or blocked by incomplete setup.
- The main theme was speed and stability: get the product rendering, reduce auth friction, wire the first real model integration, and ship the first usable studio flow.
- A lot of this week was less about perfect architecture and more about forcing the project into a demoable baseline.

## Work Completed
- Fixed the app so it actually renders again even when env/auth is not fully set up.
- Added a login bypass for MVP testing so the team could enter the dashboard without constantly getting blocked by incomplete auth.
- Cleaned up dashboard routing so the protected app structure worked more reliably.
- Wired OpenRouter into the stack for basic model interaction and testing.
- Built the first usable Writing Studio MVP.
- Started with a richer editor direction, hit instability, and intentionally simplified the editor path so the feature could keep moving.
- Added an `@assistant`-style flow so prompts could operate against document context.
- Patched teammate-side breakage, including route gaps, null refs, dependency issues, and build blockers.
- Re-ran builds and health checks to keep the frontend/backend/proxy path working.

## Research / Product Findings
- Rich text was more difficult than expected because LLM outputs naturally fit markdown better than structured editor state.
- “Simple first, fancy later” was the right call for the writing flow at this stage.
- A fast MVP bypass path was necessary because otherwise too much time was lost babysitting auth during development.
- OpenRouter integration helped force a more realistic product contract between frontend and backend.

## Blockers / Risks
- Auth was still incomplete, so defensive fallbacks were necessary.
- Rich text remained a real blocker for a more polished Google Docs-like experience.
- Overlapping teammate changes created cleanup overhead.

## Startup / Execution Notes
- This week felt like an MVP rescue sprint: stabilize the app, make it testable, and choose practical tradeoffs so the project actually moves.
- It was the point where the app started feeling closer to a real product instead of a partially connected scaffold.

## Hours Worked
- Total estimated time: 15 hours

HARSH 
Completed
1. Backend Dependency Fix
Added missing python-dotenv and supabase packages to backend/pyproject.toml
These were imported in src/main.py but never declared, causing runtime crashes
Ran uv sync to install all 55 backend packages successfully
2. Dashboard Shell (Frontend)
DashboardLayout — Fixed sidebar with logo, navigation links for all 6 studios, user avatar, and sign-out button
HomePage — Replaced placeholder "Welcome back" card with a studio cards grid featuring:
Time-aware greeting (morning/afternoon/evening)
6 clickable studio cards (Writing, Research, Image, Data, Finance, Model Compare)
Staggered entrance animations and hover effects using Framer Motion
StudioPage — Placeholder page for each studio with header bar, "coming soon" state, and back navigation
Routing — Added /studio/:studioId route with protected access via DashboardLayout wrapper
3. Vercel Deployment
Deployed frontend to Vercel (via GitHub integration)
Configured root directory to frontend/
Added vercel.json with SPA rewrite rule for client-side routing
Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY as Vercel environment variables
Updated Supabase Site URL to point to Vercel deployment instead of localhost
4. Housekeeping
Added api-credentials.txt to .gitignore to prevent accidental secret commits
Files Changed
File	Action
backend/pyproject.toml	Modified — added python-dotenv, supabase deps
backend/uv.lock	Updated — lockfile regenerated
frontend/src/components/DashboardLayout.tsx	Created — sidebar layout component
frontend/src/pages/protected/HomePage.tsx	Rewritten — studio cards grid
frontend/src/pages/protected/StudioPage.tsx	Created — studio placeholder page
frontend/src/App.tsx	Modified — added dashboard layout and studio routes
frontend/vercel.json	Created — SPA rewrite for Vercel
.gitignore	Modified — added api-credentials.txt
Commits
5eaefcd — fix: add vercel.json SPA rewrite for client-side routing
e7d4dbb — feat: add dashboard layout with sidebar, studio cards grid, and studio placeholder pages
01ffb57 — feat: implement Supabase auth – login and session management
8158fad — wire Supabase auth login/signup
Next Steps
Fix pre-existing TypeScript build issue (lib.es2023.d.ts missing)
Build out first functional studio (Writing Studio recommended)
Add backend API endpoints for studio interactions (LLM integration)
Set up Supabase database schema for artifacts and workspace data

ran builds and health checks to make sure frontend/backend/proxy path all still work
tldr: i focused on getting us to a shippable MVP baseline fast, even if some stuff is intentionally “simple first, fancy later.”




# YUVRAJ

## Weekly Summary
- Week 3 was the first week where I focused primarily on moving from planning into real backend and integration work.
- The goal was to make sure the backend pieces that power the studios and artifact system could start functioning with the frontend work that was being built.
- I spent most of the time working on API structure, model integration planning, and connecting the system components so that studio actions could eventually trigger real AI runs instead of just UI placeholders.

## Work Completed
- Continued setting up and refining the backend service structure using FastAPI so the system could support multiple studio workflows.
- Worked on defining the core API endpoints for executing runs, saving artifacts, and retrieving stored results.
- Started integrating OpenRouter into the backend so model calls could be triggered through a consistent execution layer.
- Implemented initial logic for sending prompts to OpenRouter and returning responses to the frontend.
- Began testing multi-model request handling so the system could support the model comparison feature planned in the product.
- Worked on connecting backend run execution with artifact creation so generated outputs could be saved and reused.
- Ran local builds and health checks across the frontend, backend, and proxy paths to ensure the development environment remained stable.
- Helped review teammate changes and checked that routing and API contracts stayed consistent between the frontend and backend layers.

## Research / Technical Findings
- Using a centralized execution layer for model requests makes it easier to support multiple LLM providers without changing the studio logic.
- Separating run execution from artifact storage helps maintain a clear history of workflows while still allowing outputs to be reused later.
- Keeping the backend endpoints simple early on allows the team to iterate quickly while the product features are still evolving.

## Blockers / Risks
- Some backend endpoints depend on final database schema decisions, which are still being refined.
- Model execution logic still needs more testing to ensure consistent behavior across different model responses.
- The integration between frontend studio actions and backend runs still needs further wiring as more studios become functional.

## Startup / Execution Notes
- This week focused on making sure the system could begin supporting real AI execution instead of just static UI flows.
- The goal was to create a stable backend foundation so that additional studio features could be implemented more quickly in the coming weeks.

## Hours Worked
- Total estimated time: 16 hours
# Harsh Kothari

  ## Week 3 — Dashboard, Studios & Vercel Deployment

  Built out the entire authenticated dashboard experience — a polished sidebar
  layout, navigation for all 6 studios, a dynamic home page with a time-aware
  greeting and animated studio card grid using Framer Motion. Added protected
  routing with `/studio/:studioId` and placeholder studio pages. Then took the
  app live — deployed the frontend to Vercel with GitHub integration, configured
   SPA rewrites and environment variables, and pointed Supabase to the
  production URL. Also fixed backend stability by adding missing `python-dotenv`
   and `supabase` dependencies that were causing crashes.

  **Time spent: ~12 hours**
 # HARSH KOTHARI
                                                                                
  ## Weekly Summary
  - Week 3 was the biggest week yet — focused on building the authenticated
  dashboard experience, implementing studio navigation, and deploying the       
  frontend to Vercel for the first time.
  - I spent most of the time creating the post-login experience from scratch and
   then getting the app live on the internet.                                   
  - By the end of the week, the app went from a localhost-only project to a
  fully deployed platform with a working dashboard, animated UI, and all six    
  studio routes wired up.
                                                                                
  ## Work Completed
  - Built the DashboardLayout component with a fixed sidebar featuring logo,
  navigation links for all 6 studios, user avatar, and sign-out button.         
  - Redesigned the HomePage with a time-aware greeting
  (morning/afternoon/evening) and a studio cards grid with staggered entrance   
  animations using Framer Motion.
  - Created the StudioPage placeholder component with header bar, coming soon
  state, and back navigation.                                                   
  - Added protected routing for /studio/:studioId wrapped in the
  DashboardLayout.                                                              
  - Deployed the frontend to Vercel via GitHub integration with automatic builds
   on push.
  - Configured vercel.json with SPA rewrite rules for client-side routing
  support.                                                                      
  - Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY as Vercel environment 
  variables.                                                                    
  - Updated Supabase Site URL to point to the Vercel deployment instead of 
  localhost.                                                                    
  - Fixed backend dependency crashes by adding missing python-dotenv and 
  supabase packages to backend/pyproject.toml.                                  
  - Ran uv sync to install all 55 backend packages successfully.

  ## Research / Technical Findings
  - Vercel requires an explicit SPA rewrite rule in vercel.json to prevent 404s 
  on direct navigation to client-side routes.                                   
  - Framer Motion's staggerChildren property creates polished sequential 
  entrance animations with minimal configuration.                               
  - Backend dependencies that are imported but not declared in pyproject.toml 
  cause silent runtime crashes that are easy to miss during development.        
   
  ## Blockers / Risks                                                           
  - Pre-existing TypeScript build issue with lib.es2023.d.ts needs investigation
   — does not block development but causes build warnings.                      
                  
  ## Hours Worked                                                               
  - Total estimated time: 12 hours

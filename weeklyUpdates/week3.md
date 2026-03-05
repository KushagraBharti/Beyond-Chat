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

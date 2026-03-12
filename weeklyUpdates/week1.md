# KUSHAGRA

## Weekly Summary
- Week 1 was the planning week. After the idea was chosen, I focused on turning it into something buildable through research, architecture thinking, and early design direction.
- A lot of the work this week was about narrowing the stack, defining the product structure, and making sure the system would make sense before deeper implementation started.
- This was also the beginning of the UI exploration work, where I started mocking possible directions for the product experience.

## Work Completed
- Helped translate the product idea into a more concrete implementation plan.
- Did research around how the frontend, backend, auth, storage, and model integrations should fit together.
- Helped define the core entities for the app: users, workspaces, artifacts, runs, run steps, and studio flows.
- Worked through the route and page structure for public pages, protected pages, and studio entry points.
- Started drafting the API and workflow expectations so frontend and backend could eventually move in parallel.
- Began creating early UI mockups to test different product directions and layouts.
- Explored visual approaches for the workspace, studios, and navigation so the product would feel consistent rather than improvised.

## Research / Product Findings
- Supabase made sense as the base platform because it could cover auth, database, and storage with less custom infrastructure.
- FastAPI looked like the right backend choice because it is explicit, fast to scaffold, and easy to extend.
- A local-first development path would be useful because it would let the project move even if production credentials and external integrations were not ready yet.
- UI direction mattered early because the product depends a lot on clarity and structure, not just backend logic.

## Blockers / Risks
- Much of the work was still planning-heavy, so visible output was lower than the time spent.
- There was still a risk of overthinking architecture instead of building.
- The visual direction was not fully finalized yet, so mock exploration still needed more iteration.

## Startup / Execution Notes
- This week felt like an early startup planning sprint: reduce ambiguity, choose the right defaults, and make the project easier to execute later.
- Some of the early UI mock work started here, but the goal was still mostly alignment and structure.

## Hours Worked
- Total estimated time: 10 hours




# YUVRAJ

## Weekly Summary
- Week 1 focused on translating the initial product idea into a clearer technical direction and beginning the foundational setup work needed for development.
- I spent time helping refine the system architecture and thinking through how the different parts of the platform (studios, artifacts, runs, and model interactions) would interact at the backend level.
- This week also included early setup work for the development environment and planning the structure of the API layer that will support the studios and artifact workflows.

## Work Completed
- Participated in planning discussions to refine the overall system architecture and how data would flow through the application.
- Helped outline how artifacts, runs, and run steps should be represented in the backend so that studio workflows could save structured outputs.
- Worked through how the backend API should handle model execution requests, artifact storage, and workspace isolation.
- Began preparing the backend structure for the project, including planning the FastAPI service layout and endpoint structure.
- Evaluated how OpenRouter would be integrated to support multi-model execution and comparison features.
- Assisted with initial repository setup tasks and development environment preparation so the team could start implementation in later phases.
- Helped review and refine parts of the proposal and architecture planning to make sure the system design matched the product goals.

## Research / Technical Findings
- Using Supabase for authentication, database, and storage simplifies the infrastructure and reduces the amount of custom backend work required.
- FastAPI provides a clean way to structure API endpoints for studio runs, artifact storage, and model execution workflows.
- Separating “runs” from “artifacts” in the data model makes it easier to track execution history while still allowing outputs to be reused across different studios.
- Integrating OpenRouter allows the system to support multiple models without tightly coupling the backend to a single provider.

## Blockers / Risks
- The system architecture was still evolving during this week, so some decisions were provisional and might require adjustment during implementation.
- Model integration details still depended on confirming how OpenRouter responses would be handled across different studio workflows.
- The backend structure needed to remain flexible enough to support multiple studio types without becoming overly complex.

## Startup / Execution Notes
- This week focused on laying down the technical structure so that development work in later weeks would be easier to execute.
- The goal was to reduce ambiguity in how the system would work internally before large amounts of code were written.

## Hours Worked
- Total estimated time: 7 hours

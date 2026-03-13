# KUSHAGRA

## Weekly Summary
- Week 2 was focused on UI exploration, mock design, and locking the final product direction more confidently.
- I spent a lot of time creating and comparing interface concepts so the team would not be building blind.
- This was the week where the visual identity became much more intentional and the final UI direction started to solidify.

## Work Completed
- Created a large set of mock interfaces in `frontend-mock/` to explore different ways the product could look and flow.
- Built 15 total mock UIs across different page types and layout ideas.
- Used those mockups to compare structure, hierarchy, navigation patterns, and overall visual quality.
- Continued refining the design direction across workspace pages, studio layouts, and supporting flows.
- Narrowed the mock set down to the strongest options and helped finalize one core UI direction for the product.
- Took the strongest mock concepts and iterated on them further so the final direction felt more polished and usable.
- Continued research around how studios should differ from each other while still feeling like one coherent product.

## Research / Product Findings
- Mocking multiple UI directions early was worth the time because it made it easier to see what actually felt product-quality and what did not.
- The product works best when all pages share one consistent visual language but still allow each studio to feel purpose-built.
- The final UI direction became stronger once the focus shifted from “interesting layouts” to “clear workflows and reusable patterns.”

## Blockers / Risks
- Design iteration took significant time because there were many possible directions and not all of them felt equally strong.
- There was still some risk of spending too long in design if the mock work did not eventually translate into the real app.
- The UI could only be finalized to a point before more implementation feedback existed.

## Startup / Execution Notes
- This week was heavily design-driven, but it was productive because it reduced uncertainty for later implementation.
- The mock UI work gave the project a much stronger product identity and made the later build phase more straightforward.

## Hours Worked
- Total estimated time: 14 hours



# YUVRAJ

## Weekly Summary
- Week 2 focused on continuing the technical planning and starting the groundwork needed for the real implementation phase.
- While the UI direction was being explored, I spent most of the time thinking through how the backend systems and studio workflows would actually operate once the interface was connected to them.
- The goal for the week was to make sure the core technical pieces — artifacts, runs, and model execution — would support the product structure the team was converging on.

## Work Completed
- Continued refining the backend architecture so it could support multiple studios while still sharing a common execution pipeline.
- Worked on defining the structure for how runs and run steps would be recorded so the system could track multi-step workflows and agent-style tasks.
- Helped design how artifacts would be created, saved, and retrieved from the database so outputs from different studios could be reused later.
- Explored how OpenRouter model calls should be abstracted inside the backend so different models could be executed through a single interface.
- Helped think through how model comparison requests would work and how outputs should be stored for later selection or export.
- Began outlining the FastAPI endpoint structure for core actions such as running a workflow, saving artifacts, and retrieving stored results.
- Reviewed parts of the UI mock work and provided feedback from a backend perspective to make sure proposed features would be technically feasible.

## Research / Technical Findings
- Separating execution runs from artifacts makes it easier to track both the process and the final outputs of a workflow.
- A unified model execution layer will make it easier to support multiple LLM providers without changing studio logic.
- Structuring runs as a sequence of steps allows the system to support more complex agent-style workflows in the research and finance studios.

## Blockers / Risks
- The final API structure still depended on how the studios would ultimately interact with the backend.
- Some features such as multi-model comparison and workflow timelines required careful planning so they would not complicate the data model too much.
- Without a working implementation yet, some design assumptions still needed to be validated during development.

## Startup / Execution Notes
- This week was focused on making sure the system architecture could support the product features the team was designing.
- The goal was to reduce friction for the upcoming implementation phase by clarifying how key components like runs, artifacts, and model calls should work.

## Hours Worked
- Total estimated time: 13 hours
# Harsh Kothari

  ## Week 2 — Supabase Auth & Session Management

  Implemented full Supabase authentication — login, signup, and persistent
  session management across the app. This was the critical security layer that
  turned the frontend from a static site into a real authenticated platform.
  Without this, nothing downstream (dashboard, studios, user data) would have
  been possible.

  **Time spent: ~4 hours**

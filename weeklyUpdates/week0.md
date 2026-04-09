# KUSHAGRA

## Weekly Summary
- Week 0 was the ideation week. The main focus was figuring out what the project should actually be before locking into a bad idea too early.
- I spent most of the time discussing different possible directions, evaluating which ones felt strongest, and helping shape the final concept that became Beyond Chat.
- By the end of the week, the vague idea of “an AI app” turned into a much clearer studio-based AI workspace with artifacts, workflows, and reusable outputs as the core identity.

## Work Completed
- Explored multiple possible project directions before settling on the final one.
- Helped define the core problem: normal AI chat apps become messy when users try to do real work over time.
- Pushed the idea toward a studio-based structure instead of a single endless chat interface.
- Helped identify artifacts, saved outputs, and structured workflows as the parts that would make the project feel meaningfully different.
- Contributed to the first complete proposal-level framing of the app, including the initial studio list and the general product scope.

## Research / Product Findings
- Generic chat is good for quick prompts, but it breaks down for writing, research, image generation, data work, and multi-step projects.
- The strongest version of the idea was not “another chatbot,” but a modular workspace with dedicated surfaces for different kinds of work.
- Saved artifacts felt like a real differentiator because they create continuity between sessions and make outputs reusable.

## Blockers / Risks
- Scope was still very open at this stage.
- There was a risk of picking something too broad or too unrealistic for the semester timeline.
- The technical approach was not locked yet, so everything still depended on choosing the right direction early.

## Startup / Execution Notes
- This week was mostly about finding the right idea rather than shipping visible implementation.
- It was still important work because it gave the team a much clearer product to build around instead of a loose concept.

## Hours Worked
- Total estimated time: 6 hours





# YUVRAJ

## Weekly Summary
- Week 0 focused on shaping the technical and product direction of the project before committing to implementation.
- I spent most of the week helping evaluate different project ideas, discussing feasibility, and thinking through how an AI-based system could realistically be built within a semester timeline.
- During discussions around the Beyond Chat concept, I focused on how the system would actually work from a technical standpoint, including how artifacts would be stored, how model requests would be executed, and how different studios could share context.
- By the end of the week, the concept had evolved from a general AI tool idea into a more structured architecture built around workspaces, studios, and reusable artifacts.

## Work Completed
- Participated in multiple project ideation and planning discussions with the team.
- Helped evaluate potential technical approaches and eliminate ideas that would be unrealistic to implement in a semester.
- Contributed to defining the system architecture at a high level, including the separation between frontend studios and backend AI workflows.
- Helped think through how artifacts (notes, reports, prompts, images, tables) could be stored and reused across sessions.
- Discussed possible technology stack options for the project and evaluated tradeoffs between different frameworks and backend approaches.
- Helped outline the general interaction flow between the UI, backend API, and external AI models.

## Research / Technical Findings
- Most existing AI chat interfaces break down when users try to manage long-term projects because outputs disappear inside long chat threads.
- Structuring the application around artifacts and dedicated workspaces makes it easier to organize outputs and iterate on them over time.
- A modular “studio” approach allows different workflows (writing, research, image generation, data analysis) to share infrastructure while still having specialized interfaces.

## Blockers / Risks
- At this stage the architecture was still conceptual, so there was uncertainty around the exact backend implementation.
- There was a risk of the idea becoming too large if the number of studios or features grew too quickly.
- The technical stack and deployment strategy had not yet been finalized, which meant some early assumptions might change.

## Startup / Execution Notes
- Even though there was little visible implementation this week, the planning discussions helped ensure the project had a clear direction before development started.
- Establishing the architecture and product structure early should make implementation more organized during later phases.

## Hours Worked
- Total estimated time: 5 hours




# NISHANT

## Weekly Summary
- Week 0 was focused on ideation and evaluating which product direction would actually be buildable and valuable within the semester timeline.
- I participated in team discussions around different project concepts and helped push toward a direction that had real technical substance rather than just surface-level AI features.
- By the end of the week, the team had aligned on the studio-based workspace concept, and I had a clearer sense of what the frontend routing structure and data flow would eventually need to look like.

## Work Completed
- Participated in project ideation discussions and helped evaluate different concepts before the team committed to Beyond Chat.
- Contributed to thinking through how a studio-based architecture would differ from a standard chat interface.
- Helped frame what the data model might look like at a high level, including the relationship between users, workspaces, and saved outputs.
- Discussed how artifacts could be structured to be reusable across different studio types rather than locked to a single workflow.
- Contributed to defining the scope of the project and identifying which features would be feasible within the semester timeline.

## Research / Technical Findings
- Standard AI chat interfaces do not preserve outputs well across sessions, which creates real friction for users trying to do multi-step work.
- A studio-based model with explicit artifact saving makes outputs more organized and usable over time.
- The project would need a clear separation between frontend studio surfaces and backend AI workflows to stay maintainable as it grew.

## Blockers / Risks
- The project scope was still wide open at the end of the week, so the risk of overbuilding or underscoping was real.
- No technical direction had been committed to yet, so early architectural assumptions might need to change once the stack was chosen.

## Startup / Execution Notes
- This week was primarily about alignment and direction-setting before any implementation started.
- Getting team consensus on the product concept early was important for making the development phase more focused.

## Hours Worked
- Total estimated time: 5 hours




HARSH KOTHARI   
  Weekly Summary                                                                
  This week focused on researching and finalizing the technology stack for the
  Beyond Chat platform, evaluating architecture options, and contributing to    
  early product scoping.
                                                                                
  Work was centered around comparing frontend frameworks, backend options, and  
  database/auth providers to determine the best fit for a multi-studio AI
  platform. The goal was to establish a clear technical direction before any    
  code was written.

  Work Completed
  Researched and evaluated React + TypeScript + Vite as the frontend stack,
  comparing it against Next.js and SvelteKit for our use case.                  
  Evaluated FastAPI as the backend framework and confirmed it as the best fit
  for async LLM request handling.                                               
  Helped finalize Supabase as the auth and database provider after comparing it
  with Firebase and Auth0.                                                      
  Evaluated hosting options including Vercel, Netlify, and Railway — settled on
  Vercel for frontend deployment.                                               
  Contributed to brainstorming sessions around the studio-based UX concept,
  helping define the six core studios: Writing, Research, Image, Data, Finance, 
  and Model Compare.
  Helped define the MVP product scope and feature prioritization for the first  
  development cycle.                                                            
   
  Research / Technical Findings                                                 
  Supabase offers a strong combination of Postgres, built-in auth, and storage
  that reduces the number of external services needed.                          
  Vite provides significantly faster dev server startup and HMR compared to CRA,
   making it the clear choice for React projects.                               
  FastAPI's native async support and automatic OpenAPI docs make it ideal for an
   LLM-backed API layer.                                                        
                  
  Blockers / Risks                                                              
  No major blockers — the team needed alignment on scope before committing to
  implementation.                                                               
   
  Hours Worked                                                                  
  Total estimated time: 5 hours




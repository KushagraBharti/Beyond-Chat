# NISHANT

## Weekly Summary
- Week 5 focused on completing the frontend routing and auth scaffolding that had been in progress since week 3, and beginning the groundwork for the Image Studio backend implementation.
- The protected route layer was fully tested and stabilized this week, and I started reviewing what would be needed to wire up real image generation through OpenRouter in the following sprint.
- The goal was to close out the routing and RLS work so the app's auth layer was solid, and to prepare technically for the Image Studio backend build.

## Work Completed
- Finalized and pushed the React Router v6 setup for all protected app pages after completing local session persistence testing.
- Verified the Protected Route wrapper was correctly handling unauthenticated redirects across all studio routes under different browser conditions including direct URL navigation and page refresh.
- Finalized the RLS policies on core tables and validated that workspace membership checks were correctly scoping access without blocking legitimate requests.
- Began researching OpenRouter's image generation API to understand how it differed from the chat completions endpoint and what integration work would be required.
- Reviewed the Image Studio frontend placeholder to understand the data contract the backend would need to fulfill.
- Started planning the three-step image generation workflow — prompt enhancement, model call, and storage upload — that would be implemented in week 6.
- Ran local builds and checked compatibility between the newly stabilized routing layer and the rest of the frontend codebase.

## Research / Technical Findings
- OpenRouter's image generation endpoint follows the OpenAI `/v1/images/generations` contract but requires careful handling because models can return responses as either `b64_json` or a hosted URL depending on the provider.
- Supabase Storage signed URLs are the right approach for image delivery in the MVP since they avoid public bucket exposure while still being shareable.
- Mapping frontend aspect ratio options to backend pixel dimensions requires an explicit size table since not all model providers use the same resolution naming conventions.

## Blockers / Risks
- Not all OpenRouter image models support every size option, so the aspect ratio mapping would need to be tested per model before the feature could be considered stable.
- The RLS policies still needed end-to-end testing in a real deployed environment to confirm they behaved correctly under production conditions.

## Startup / Execution Notes
- Finishing the routing and auth work this week cleared the path for more focused backend feature work in week 6.
- The research done on the image generation API this week meant the actual implementation could move faster without spending time on API discovery during the build sprint.

## Hours Worked
- Total estimated time: 10 hours

## Diya: 

- **Authentication Routes**
  - Created and wired up a new **SignUpPage**.
  - Fixed the **LoginPage** navigation to correctly push users to the dashboard
- **Tested OpenRouter**
  - Got openrouter working locally 
# HARSH KOTHARI 
                                                                                
  ## Weekly Summary
  - Week 5 was focused on integrating OpenRouter into the backend to enable     
  multi-LLM support and building the Model Compare Studio for side-by-side model
   evaluation.
  - I spent most of the time connecting the backend to the OpenRouter API,      
  implementing streaming responses from multiple providers, and building the    
  comparison UI.
  - By the end of the week, Beyond Chat went from a single-model tool to a      
  genuine multi-LLM platform where users can evaluate models head-to-head in    
  real time.
                                                                                
  ## Work Completed
  - Integrated OpenRouter into the backend to route prompts across multiple LLM
  providers from a single unified API.                                          
  - Built the Model Compare Studio frontend — users can send the same prompt to
  different models and view responses side-by-side.                             
  - Implemented streaming responses so model outputs populate in real time
  rather than waiting for full completion.                                      
  - Added model selection dropdowns supporting GPT-4o, Claude, Gemini, Llama,
  Mistral, and other providers available through OpenRouter.                    
  - Built latency and token usage tracking so users can see performance metrics
  alongside each model's response.                                              
  - Added cost-per-query estimates based on OpenRouter's pricing data for each
  model.
  - Implemented a simple ranking system so users can mark which model performed
  best for their specific use case.                                             
   
  ## Research / Technical Findings                                              
  - OpenRouter provides a unified API that abstracts away provider-specific
  differences, making it straightforward to add new models without backend
  changes.
  - Server-Sent Events (SSE) are the most reliable approach for streaming LLM
  responses to the frontend, with better browser support than WebSockets for    
  this use case.
  - Token counting and cost estimation require model-specific tokenizer         
  awareness — OpenRouter returns usage metadata that simplifies this            
  significantly.
  - Latency varies dramatically between providers and models, making real-time  
  comparison genuinely valuable for users optimizing for speed vs quality.      
   
  ## Blockers / Risks                                                           
  - OpenRouter rate limits may become a concern if multiple users run
  comparisons across many models simultaneously.
  - Cost tracking is based on OpenRouter's published pricing and may drift if
  providers change rates without notice.                                        
   
  ## Hours Worked                                                               
  - Total estimated time: 14 hours



# YUVRAJ

## Weekly Summary
- Week 5 focused on improving the backend integration for multi-model execution and making the system more reliable for real end-to-end workflows.
- My work this week was centered around refining the OpenRouter integration, improving how model responses are handled, and connecting backend execution more cleanly with frontend studio flows.
- The goal was to make the system feel like a cohesive multi-LLM platform rather than a set of partially connected features.

## Work Completed
- Improved the backend OpenRouter integration to better handle multiple model requests and normalize responses across different providers.
- Worked on refining the API layer so model execution requests from the frontend could be handled more consistently.
- Helped structure how responses from different models are stored and associated with runs and artifacts for later retrieval.
- Tested multi-model execution flows locally to ensure prompts could be sent to different providers without breaking the pipeline.
- Assisted with debugging issues related to authentication flow and ensuring backend endpoints correctly handled authenticated requests.
- Helped review and validate the Model Compare workflow from a backend perspective to ensure compatibility with frontend implementation.
- Ran local testing and validation to ensure the backend, model execution layer, and frontend interactions were working together reliably.

## Research / Technical Findings
- Different LLM providers return slightly different response formats, so normalizing outputs at the backend layer simplifies frontend logic significantly.
- A consistent execution pipeline for model requests is critical when supporting multi-model comparison features.
- Storing model outputs alongside run metadata enables better tracking, debugging, and future evaluation of model performance.

## Blockers / Risks
- Model response consistency still requires additional validation across edge cases and different prompt types.
- Authentication and session handling still need further refinement to ensure all backend routes behave correctly under protected access.
- Multi-model execution increases complexity in error handling, especially when one provider fails while others succeed.

## Hours Worked
- Total estimated time: 21 hours

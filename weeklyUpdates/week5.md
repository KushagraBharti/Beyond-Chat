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

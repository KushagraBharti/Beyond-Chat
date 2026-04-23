# KUSHAGRA BHARTI

## Weekly Summary
- Week 9 was dominated by building Dexter from scratch inside Beyond Chat and turning the finance studio into a Dexter-first agent workspace.
- The main focus was assembling the agentic tooling one by one, getting finance runs to work locally, and then wiring the same event model toward the Vercel Sandbox path for production.
- A second major theme was making the finance studio feel like a real operator console by adding run logging, live step updates, polling-based refresh, and clearer failure reporting.

## Work Completed
- Built the Dexter finance agent from the ground up inside Beyond Chat and made finance studio route exclusively through Dexter.
- Assembled the agentic stack piece by piece: finance data tools, Exa search, filing/web fetch helpers, filesystem/scratchpad support, model selection, and structured tool traces.
- Removed Tavily from the finance path and standardized all web search on Exa.
- Simplified environment setup so only actual credentials remain in `.env` files, while runtime defaults live in code.
- Added a local Dexter execution path for Windows by replacing `asyncio.create_subprocess_exec` with `subprocess.run` inside `asyncio.to_thread`, then upgraded the local path to streamed `subprocess.Popen` execution with JSONL parsing.
- Fixed the local Windows encoding issue by forcing UTF-8 subprocess capture, which stopped Dexter stdout from being lost.
- Added backend logging for run lifecycle events, Dexter launch details, stderr tails, and traceback-rich failure reporting.
- Changed finance runs to start immediately as `running`, then complete in the background while the frontend polls for status updates.
- Persisted Dexter tool events into run steps as they arrive, including `tool_start`, `tool_progress`, `tool_end`, and `tool_error`.
- Updated the frontend finance studio so it shows live run state, refreshed tool timelines, and detailed failures instead of a blank error badge.
- Added a sandbox-runner NDJSON mode so the Vercel Sandbox path can stream the same event shape as local Dexter execution.
- Kept the Vercel Sandbox branch as the production path while preserving local direct execution for development.

## Research / Technical Findings
- Dexter is most useful when the agent loop, finance tools, and audit trail are all exposed together instead of only returning a final answer.
- Local Windows support is easiest when the backend owns the process boundary and parses JSONL output from Dexter itself.
- Polling the run state is the least risky MVP for live updates because it works for both local execution and sandbox execution.
- The same event format can drive both UI updates and run-step persistence, which keeps local and production behavior aligned.
- The sandbox runner can stream command output without changing the frontend contract if the backend normalizes both local and sandbox events.
- Building the agent from scratch made it possible to control the tool surface, logging, and execution model instead of inheriting a generic chat abstraction.

## Blockers / Risks
- Vercel Sandbox streaming still needs deployment-side verification before it can be treated as fully proven.
- The finance studio now depends on run polling, so server restarts and client refresh behavior matter more than before.
- The Dexter tool surface is broader now, so future tool additions need to keep the JSONL event shape stable.

## Hours Worked
- Total estimated time: 26 hours

# YUVRAJ KASHYAP

## Weekly Summary
- Week 9 also included cleanup and integration support around the Dexter build, with emphasis on keeping the rest of the app stable while finance behavior changed.
- The work focused on making sure existing studio flows, tests, and UI contracts still behaved correctly after the finance studio became agent-driven.

## Work Completed
- Updated and validated the finance run expectations so the UI and tests accept the new `running` state at creation time.
- Adjusted finance workflow tests to account for Dexter event callbacks and the new live run completion model.
- Confirmed the backend and frontend stayed healthy after the finance studio changes by validating the API, build, and run contracts.
- Supported the sandbox runner integration by keeping the runner contract compatible with the backend event model and response parsing.
- Helped ensure the broader application did not regress while Dexter-specific changes were being introduced.
- Assisted with the agent rollout by checking that the new finance execution model still fit the rest of Beyond Chat’s studios and artifact flow.

## Research / Technical Findings
- A finance run that starts as `running` is the right shape for live agent execution, but downstream tests and UI code must be updated to expect that contract.
- Event callbacks are the cleanest way to unify local execution, backend persistence, and future sandbox streaming.
- Keeping the rest of the app stable while changing the finance engine is mostly a contract management problem, not just an implementation problem.
- Once the agent emits the same JSONL event shape in both local and sandbox modes, the rest of the app can stay mostly agnostic to where Dexter ran.

## Blockers / Risks
- The background finance flow depends on polling working reliably in the browser.
- Any mismatch between the Dexter event schema and the backend parser will surface immediately in the run timeline.

## Hours Worked
- Total estimated time: 16 hours





#



HARSH KOTHARI                                                                 
                                                                                
  Weekly Summary                                                                
                                                                                
  - Week 9 focused on fixing the Data Studio end-to-end — the model was never   
  seeing real data, only a one-line text summary, which made every analysis     
  output meaningless.                                                           
  - The fix required changes across the full stack: a new backend endpoint with 
  pandas-based CSV parsing, a Supabase Storage download method, a frontend      
  upload flow wired to the file input, and a complete rewrite of the DataPage   
  rendering logic.                                                              
  - In parallel, I shipped two small but important Compare page fixes left over
  from week 8 — the route was broken in the new app shell and the synthesis     
  output was rendering raw asterisks instead of formatted markdown.
                                                                                
  Work Completed                                            

  - Diagnosed the root cause of the Data Studio bug — DataPage.tsx was reading  
  the CSV locally with file.text() and only passing a string like "sales.csv: 
  200 rows x 8 columns" to the backend. The model had no access to actual column
   names, values, or distributions.                         
  - Added pandas>=2.0.0 and tabulate>=0.9.0 to backend/pyproject.toml and ran uv
   sync to install them.                                                        
  - Added download_artifact_file(path, access_token) to
  backend/src/supabase_service.py — calls storage.from_(bucket).download(path)  
  and returns raw bytes, using the user's access token so Supabase RLS is
  respected.                                                                    
  - Added POST /api/data/analyze to backend/src/main.py with a
  DataAnalyzeRequest model (storage_path, prompt, model). The endpoint:         
  validates the storage path belongs to the active workspace, downloads the CSV
  bytes, parses with pandas, builds a prompt containing real column names with  
  dtypes, first 10 rows as a markdown table, and full describe() stats, calls
  OpenRouter at temperature 0.2, extracts the JSON response with a regex
  fallback for cases where the model wraps output in a markdown fence, saves a
  run and two run steps (download, analyze) to the database, and returns {
  result, run_id }.
  - Added uploadArtifactFile(file) to frontend/src/lib/api.ts — multipart POST
  to /api/storage/artifacts/upload, deliberately omits Content-Type so the      
  browser sets the boundary correctly. Returns { artifactId, path, signedUrl }.
  - Added analyzeData({ storage_path, prompt, model }) to                       
  frontend/src/lib/api.ts and the DataAnalysisResult TypeScript interface with  
  fields insight, chart_type, chart_data, and table.
  - Updated buildDataArtifactInput in frontend/src/lib/artifactDrafts.ts —      
  replaced the RunRecord-based signature with { fileName, prompt,               
  analysisResult, runId }. Now stores the full structured result as content_json
   and the insight paragraph as content.                                        
  - Rewrote DataPage.tsx entirely: file select now triggers an immediate upload
  with a ✓/✗ status indicator; Analyze button is disabled until upload          
  completes; handleRun calls /api/data/analyze with the real storage_path; the
  secondary column renders an insight text card, an inline SVG bar chart (no    
  library dependency), and a results table with proper <thead> headers.
  - Implemented the inline SVG bar chart as a self-contained component —
  normalized values, y-axis gridlines with labels, truncated x-axis labels, no  
  external dependency required.
  - Fixed Compare page route — the lazy-loaded /compare route was not wired into
   the new AppShell routing tree after the shell refactor, causing a 404 on     
  direct navigation.
  - Fixed Compare page sidebar link — the "Compare" nav entry was missing from  
  DashboardLayout after the shell rewrite.                                      
  - Fixed markdown rendering in the Compare page synthesis panel — raw **bold**
  and ### headings were displaying as literal characters. Applied the existing  
  inline markdown renderer to both the synthesis panel and individual model
  cards.                                                                        
                                                            
  Research / Technical Findings                                                 
  
  - Multipart file uploads require the Content-Type header to be absent from the
   fetch call — setting it manually, even to multipart/form-data, breaks the
  boundary parameter and causes a 422 on the backend. Let the browser set it    
  automatically.                                            
  - LLMs sometimes wrap JSON responses in markdown code fences even when
  explicitly told not to. A re.search(r'\{[\s\S]+\}', raw) regex extraction is  
  more robust than assuming the response is bare JSON.
  - pandas df.describe(include="all") surfaces useful stats for both numeric and
   categorical columns in one call. Passing this alongside the actual row data  
  gives the model enough context to produce meaningful insights rather than
  generic summaries.                                                            
  - A hand-written SVG bar chart is small, fast, and zero-dependency for this
  use case. The chart_data shape returned by the model (labels,                 
  datasets[0].data) maps directly to SVG rect coordinates with simple
  normalization against the column max.                                         
  - Storage path validation (startswith(workspace_id + "/")) is the minimal
  guard needed to prevent one user from reading another workspace's files —     
  Supabase RLS handles the rest at the storage layer.
                                                                                
  Blockers / Risks                                          

  - The backend is still not deployed to Vercel — /api/data/analyze only works  
  locally. The frontend/vercel.json already proxies /api/* to
  https://beyond-chat-backend.vercel.app but that deployment does not exist yet.
   Data Studio analyze will silently fail in production until the backend is
  deployed.
  - The analyze endpoint downloads the full CSV file on every request. For large
   files this will be slow and could hit memory limits in a serverless          
  environment — worth adding a file size cap on upload.
  - The SVG chart only handles the bar case well. If the model returns          
  chart_type: "pie" or "scatter", it still renders as a bar chart. This is fine 
  for now but should be addressed before user testing.
                                                                                
  Hours Worked                                              

  - Total estimated time: ~8 hours

### DIYA MEHTA  

### Weekly Summary  
- Focused on researching and planning how to scale the BeyondChat application for higher user load  
- Analyzed current architecture to identify performance bottlenecks and inefficiencies  
- Designed potential solutions to improve responsiveness, reliability, and scalability without implementing changes yet  

### Work Completed  
- Audited current system flow (frontend → backend → database) to identify scaling limitations  
- Identified key bottlenecks such as repeated CSV processing, synchronous analysis, and redundant API calls  
- Designed a caching strategy for analysis results and frequently accessed artifact data  
- Planned approach to store preprocessed dataset summaries to avoid repeated heavy computations  

### Research / Technical Findings  
- Eliminating redundant computation has a larger impact than micro-optimizations  
- Caching frequently accessed or expensive results significantly improves performance  
- Asynchronous processing is important for maintaining responsiveness under heavy workloads  
- Database query efficiency becomes critical as data and users scale  
- Frontend request patterns directly influence backend load and overall system performance  
- Early planning for scalability helps prevent major refactors later  

### Blockers / Risks  
- No implementation completed yet, so improvements are not validated  
- Asynchronous architecture introduces additional complexity in state management  
- Caching strategies need careful design to avoid stale or inconsistent data  
- Scaling assumptions may change once real user traffic is observed  

### Hours Worked  
- Total estimated time: ~7–8 hours

### DIYA MEHTA  

### Weekly Summary  
- Focused on researching scalability improvements for the BeyondChat application  
- Identified performance bottlenecks across the current system architecture and designed potential solutions  
- Continued development and planning work on the Image Studio feature  
- Prioritized long-term system reliability, efficiency, and ability to handle increasing user load  

### Work Completed  
- Analyzed end-to-end architecture (frontend, backend, database) to identify scaling limitations  
- Identified major inefficiencies such as repeated CSV processing, synchronous analysis calls, and redundant API requests  
- Designed a caching approach for storing and reusing expensive analysis results and artifact data  
- Planned a system to store preprocessed dataset summaries to reduce repeated computation overhead  
- Explored moving heavy analysis workloads to asynchronous/background processing for better responsiveness  
- Researched database scaling techniques including indexing, pagination, and query optimization  
- Evaluated frontend improvements to minimize duplicate API calls and improve request handling efficiency  
- Reviewed rate-limiting approaches to protect high-cost endpoints from excessive usage  
- Worked on Image Studio feature improvements, focusing on structure, integration flow, and alignment with existing system architecture  
- Considered trade-offs between simplicity and scalability in system design decisions  

### Research / Technical Findings  
- Eliminating redundant computation and API calls has a major impact on system performance  
- Caching is most effective when applied to expensive and frequently repeated operations  
- Asynchronous processing is essential for maintaining responsiveness under load  
- Database performance becomes a key bottleneck as data and user volume increases  
- Frontend request patterns can significantly amplify backend load if not controlled  
- Early architectural planning reduces the need for large refactors later  

### Blockers / Risks  
- No implementation has been done yet, so proposed improvements are unvalidated  
- Asynchronous workflows introduce additional system complexity and state management challenges  
- Caching mechanisms must be carefully designed to avoid stale or inconsistent data  
- Real-world usage patterns may require adjustments to current assumptions  

### Hours Worked  
- Total estimated time: ~7–8 hours   

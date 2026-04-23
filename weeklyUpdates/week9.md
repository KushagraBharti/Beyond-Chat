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

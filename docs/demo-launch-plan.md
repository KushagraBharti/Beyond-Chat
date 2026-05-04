# Beyond Chat Investor Demo Plan

## Current Product Direction

This document remains a useful acceptance story, but it is no longer the implementation target by itself. The product target is broader and is defined in `agentic-artifact-workspace-plan.md`.

Important constraints:

- Build general product completeness, not Starbucks-only demo hardcoding.
- Use live providers only: OpenRouter, Exa, Supabase, and the real image path.
- Do not add deterministic demo fallbacks or fake successful outputs.
- Do not seed Starbucks artifacts into Supabase automatically as a shortcut.
- Artifacts should be scoped to the authenticated user profile, not workspace collaboration.
- Compare is a model-output comparison layer available inside studios, not primarily an artifact comparison feature.

## Demo Thesis

Beyond Chat is the workspace where a team launches a product from scattered company knowledge, market research, financial context, creative direction, and final artifacts.

The investor should understand the value in one sentence:

> "Instead of jumping between Notion, spreadsheets, calendar, research tabs, image tools, and chat threads, the whole product launch moves through one artifact-first workspace."

## Final Demo Scenario

### Company Frame

Use a public-company-style demo so Finance Studio can feel materially stronger.

- Company: Starbucks Innovation Team
- Ticker context: SBUX
- Workspace name: Starbucks Seasonal Launch Room
- User: Maya Chen, Director of Beverage Innovation
- Product: Cinder Orange Cold Brew
- Launch window: Summer 2026
- Core question: Should Starbucks pilot a citrus-forward cold brew across 400 stores?

This keeps the story instantly understandable while letting Finance Studio talk about public-company market context, category risk, pricing, margin, and operational implications.

### Product Concept

- Name: Cinder Orange Cold Brew
- Tagline: Bright citrus cold brew for warmer mornings.
- Format: ready-to-drink bottle plus in-store handcrafted variation
- Target buyer: morning commuters, Gen Z coffee buyers, seasonal beverage customers
- Business goal: validate a seasonal beverage that increases cold coffee attachment without cannibalizing core cold brew

## Demo Arc

### 1. Dashboard

The app opens into a live workspace, not an empty prompt box.

What to show:

- Calendar preview with launch-critical meetings
- Reminders for pricing lock, packaging review, and pilot decision
- Provider status for Supabase, OpenRouter, Exa, Dexter, Notion, Calendar, Drive, and Slack
- Quick links into each studio
- A prominent launch workspace card: Cinder Orange Cold Brew

Magic moment:

- "Before I ask the model anything, Beyond Chat already knows what workspace I am in, what is due, which sources are connected, and which launch artifacts exist."

Needed features:

- Dashboard launch/project card
- Calendar agenda card where real integration exists
- Integration/provider status tiles that reflect real configured providers
- Dashboard artifact activity is backed by the authenticated user's real saved artifacts and per-studio counts; it does not seed or fabricate demo artifacts.

### 2. Chat

Chat is the command center and thinking surface.

User prompt:

```text
We are evaluating Cinder Orange Cold Brew for a summer pilot. Pull in our company notes, prior cold beverage artifacts, and any launch constraints. Help me decide what to research, analyze, and produce.
```

What to show:

- Context Builder can attach:
- Notion pages
- saved artifacts
- uploaded files
- previous launch notes
- calendar constraints
- Chat summarizes the product, unknowns, and next best studios
- Chat creates or suggests a launch plan artifact
- Chat includes a button or action: `Create Launch Plan`

Magic moment:

- "The model is not starting cold. It sees company knowledge, prior work, and durable artifacts."

Needed features:

- Context Builder source tabs: Artifacts, Notion, Files, Calendar, Slack. Non-artifact tabs currently show real not-configured/unavailable states until their connectors exist.
- One-click add suggested context
- Chat action button: Create Launch Plan, implemented as a composer quick action that uses live chat generation.
- Save chat-derived plan as artifact
- Button to continue the same context into Research Studio
- Assistant chat outputs can continue directly into Research, Writing, or Compare using the generated content.

### 3. Research Studio

Research Studio handles external context: category trends, competitors, pricing, messaging, and source-backed launch risk.

Research prompt:

```text
Research the market for citrus-forward cold brew and seasonal ready-to-drink coffee. Compare competitor positioning, likely buyer motivations, and risks for a Starbucks pilot.
```

What to show:

- Visible research steps
- Exa-backed source cards
- Competitor grid
- Customer language patterns
- Opportunity/risk matrix
- Save report as artifact

Magic moment:

- "Research becomes a structured artifact with sources, not a disappearing browser tab."

Needed features:

- Better source cards
- Competitor matrix output
- Research-to-artifact save polish
- Suggested follow-up: continue to Data Studio
- Research output actions can continue the generated report into Data, Finance, Writing, or Compare.

### 4. Data Studio

Data Studio should feel like a real data agent, not just a CSV summarizer.

Data story:

- Starbucks has prior seasonal beverage pilot data.
- The team wants to understand where a citrus cold brew is likely to work.
- The user uploads or selects a preloaded dataset.

Dataset:

- `starbucks_seasonal_beverage_pilots.csv`
- Stores, regions, units sold, revenue, gross margin, repeat rate, attach rate, cannibalization index, weather index, and customer segment

Data prompt:

```text
Analyze prior seasonal beverage pilots and estimate where Cinder Orange Cold Brew has the strongest pilot fit. Surface channel, region, margin, and cannibalization patterns.
```

What to show:

- Dataset preview
- Summary metrics
- Region/channel performance chart
- Margin vs repeat-rate chart
- Anomaly or risk callout
- Recommended pilot store profile
- Save insight artifact

Magic moment:

- "The app sees the company data and turns it into a decision, not just a chart."

Needed features:

- Demo dataset picker
- More complete data output schema
- Charts beyond one bar chart
- Data analysis step timeline
- Save chart/table/insight as artifact
- Suggested follow-up: continue to Finance Studio
- Data output actions can continue the generated analysis into Finance, Writing, or Compare.

### 5. Finance Studio

Finance Studio gives the launch a business case.

Finance prompt:

```text
Using SBUX public-company context, our pilot assumptions, and public competitor context, assess whether Cinder Orange Cold Brew is financially credible. Compare Starbucks against relevant beverage and coffee peers, then include price, gross margin, break-even units, cannibalization risk, and what management would need to believe.
```

What to show:

- Dexter/tool timeline
- Public company context
- Competitor research across public beverage and coffee companies
- Peer comparison table
- Unit economics
- Pilot P&L
- Break-even units
- sensitivity table
- financial risks
- recommendation memo

Magic moment:

- "This is not generic product copy. It can reason through a public-company launch with financial assumptions and tool traces."

Needed features:

- Demo finance prompt preset
- SBUX ticker context preset
- Competitor ticker basket preset
- Peer comparison card
- Finance research source cards
- Cleaner Dexter output rendering
- Sensitivity table artifact
- Finance-to-writing handoff
- Finance output actions can continue Dexter's memo into Writing or Compare.

Public-company competitor basket:

- SBUX: Starbucks, core company context
- BROS: Dutch Bros, high-growth beverage chain peer
- DNUT: Krispy Kreme, consumer food/beverage retail comp
- MCD: McDonald's, beverage and breakfast traffic benchmark
- KO: Coca-Cola, RTD beverage scale and brand distribution benchmark
- PEP: PepsiCo, bottled beverage and retail distribution benchmark
- MNST: Monster Beverage, premium functional beverage margin benchmark

Finance Studio should not imply these are perfect comps. The demo should explicitly frame them as useful public reference points for pricing power, beverage demand, gross margin expectations, and channel strategy.

### 6. Writing Studio

Writing Studio turns all collected context into launch materials.

Writing prompt:

```text
Draft the Cinder Orange Cold Brew launch kit using the research report, data analysis, finance memo, and Notion brand notes. Create an executive brief, retail pilot summary, product FAQ, launch email, and landing page copy.
```

What to show:

- Context Builder attaches Research, Data, Finance, and Notion brand notes
- Drafted launch brief
- Drafted retailer pitch
- Drafted landing page copy
- Drafted email copy
- Save each output as artifact

Magic moment:

- "Writing is no longer a blank page. It is grounded in everything the workspace has learned."

Needed features:

- Writing templates for launch brief, retailer pitch, landing page, email
- Context attachments in Writing Studio
- Save assistant suggestions as writing artifacts
- Artifact handoffs into Writing prefill the editor, attach the source artifact, and seed the assistant instruction.
- Multi-output writing run produces executive brief, retail pilot summary, landing page copy, and launch email from one live run.
- Save multiple documents from one generation as separate artifacts.

### 7. Image Studio

Image Studio creates launch visuals from the same strategy context.

Image prompts:

```text
Create a premium product mockup for Cinder Orange Cold Brew with Starbucks-inspired retail realism, citrus color accents, cold condensation, and summer morning lighting.
```

```text
Create a social ad visual for Cinder Orange Cold Brew aimed at commuters, with orange peel, cold brew, glass bottle, and bright morning energy.
```

What to show:

- Brand direction presets
- Multiple model outputs
- Packaging mockups
- Social creative
- Save visual artifacts

Magic moment:

- "The same workspace that analyzed the numbers also produces the creative."

Needed features:

- Demo prompt presets
- Context-aware image prompt enhancement
- Artifact handoffs into Image attach the source artifact and prefill the generation prompt.
- Better gallery labels
- Launch creative artifact bundle

### 8. Compare Panel

Compare is an LLM comparison layer, not a positioning-only feature.

Where to embed:

- Chat: compare launch strategy recommendations across models
- Research: compare market synthesis across models
- Writing: compare executive brief drafts across models

Demo compare prompt:

```text
Given the attached research, data, and finance artifacts, recommend whether Starbucks should pilot Cinder Orange Cold Brew. Be concise, executive-ready, and explicit about risks.
```

What to show:

- 3-4 LLM outputs side by side
- latency/status per model
- model disagreement
- save the best result as an artifact

Magic moment:

- "Beyond Chat lets the operator compare model judgment at the point of work, with the same context attached."

Needed features:

- Open Compare from Chat, Research, and Writing with context attached
- Save selected compare result
- Add a "Use this answer" action where relevant

### 9. Artifacts

Artifacts are the proof that this is a workspace.

Final launch kit:

- Launch Plan
- Notion Brand Notes
- Category Research Report
- Competitive Positioning Matrix
- Seasonal Pilot Data Analysis
- Finance Memo
- Executive Launch Brief
- Retail Pilot Summary
- Landing Page Copy
- Launch Email
- Packaging Mockups
- Social Ad Concepts
- Model Compare Result

Magic moment:

- "Every output survives. The team is not trapped in chat history."

Needed features:

- Artifact collections or bundles
- Launch kit detail view
- Export bundle
- Artifact provenance: source studio, model, context used, source run

Current implementation note:

- Artifacts includes a Cinder Orange Launch Kit matcher, multi-artifact selection, and Markdown bundle export using saved user artifacts. Empty kit slots remain visible until the corresponding live studio output is saved.
- Artifact detail actions can continue an artifact into Chat, Research, Finance, Writing, or Compare with the selected artifact attached as context.

## Integration Plan

### Notion

Purpose:

- Company knowledge
- brand guidelines
- customer interview notes
- launch constraints
- previous launch retrospectives

Demo pages:

- Starbucks Brand Voice Notes
- Cold Beverage Launch Retrospective
- Summer 2026 Beverage Pipeline
- Retail Pilot Requirements
- Customer Interview Highlights

Initial implementation:

- Prefer real Notion OAuth/search when implemented.
- Do not fake Notion success as a deterministic product fallback.

### Calendar

Purpose:

- Show launch deadlines
- Check whether the user is free
- Offer schedule-aware next steps

Demo events:

- Pricing lock
- Packaging review
- Retail pilot readout
- Creative approval
- Executive decision meeting

Initial implementation:

- Dashboard agenda card when real calendar data is available.
- "Find time for review" action only when backed by a real provider path.

### Google Drive

Purpose:

- Pull briefs, docs, decks, and CSVs

Demo files:

- Retail Pilot One-Pager
- Beverage Pipeline Spreadsheet
- Customer Notes Export
- Prior Launch Review Deck

Initial implementation:

- Use uploaded files and real file/provider integrations.
- Do not fake Drive data as a deterministic product fallback.

### Slack

Purpose:

- Capture scattered team discussion

Demo channels:

- `#beverage-innovation`
- `#retail-pilot`
- `#creative-review`

Initial implementation:

- Use real Slack ingestion only when connected.
- Do not fake Slack data as a deterministic product fallback.

### Data Sources

Purpose:

- Provide numbers that make the launch decision meaningful

Demo sources:

- prior seasonal launch data
- store cluster data
- margin assumptions
- customer segment data

Initial implementation:

- Uploaded CSV and Excel drag/drop.
- Later: Sheets and warehouse connectors.

## Two-Week Build Plan

### Week 1: Make The Product Flow Work End To End

- Audit Finance/Dexter and extract reusable agent/tool/run/artifact patterns.
- Add dashboard launch card, calendar card, and integration tiles.
- Expand Context Builder to show source tabs.
- Add real Artifact and uploaded-file context items.
- Add Chat planning actions that save artifacts.
- Add CSV and Excel upload/preview to Data Studio.
- Improve Data Studio output UI: metrics, charts, insight, table, risks.
- Add finance prompt presets for SBUX/public-company context.
- Add writing templates for launch kit deliverables.
- Add image prompt presets for packaging and campaign creative.

### Week 2: Make It Feel Complete

- Add artifact collections for `Cinder Orange Launch Kit`.
- Add cross-studio "Continue in..." actions.
- Add context provenance to saved artifacts.
- Add compare "Use this answer" and "Save best result" actions.
- Add bundle export or launch kit preview.
- Add richer source cards in Research Studio.
- Add chart/table save from Data Studio.
- Polish Dexter Finance output with sections and sensitivity table.
- Keep all model/research behavior on live provider paths.
- Show clear provider errors/statuses instead of fake fallback success.

## Feature Priority

### P0 Demo Critical

- Demo workspace seed
- Context Builder source tabs
- Demo Notion/company knowledge
- Demo calendar agenda
- Demo launch dataset picker
- Strong Data Studio output
- SBUX finance prompt preset
- Research citrus-cold-brew and competitor/risk prompt presets
- Writing launch templates for executive brief, retail pilot summary, landing page copy, and launch email
- Image prompt presets for product mockup, commuter ad, and retail shelf creative
- Artifact launch kit collection

### P1 Strong Differentiators

- Cross-studio handoff actions
- Provenance on artifacts
- Compare result save/use actions
- Research competitor matrix
- Finance sensitivity table
- Public-company competitor comparison in Finance Studio
- Dashboard integration hub

### P2 After Investor Demo

- Real Notion OAuth/search
- Real Google Drive picker
- Real Slack ingestion
- Calendar availability scheduling
- Sheets/warehouse connectors
- Team sharing and permissions

## Demo Script

### Opening

"Imagine you are on Starbucks' beverage innovation team. You are evaluating a new summer product, Cinder Orange Cold Brew. The data is in spreadsheets, the brand notes are in Notion, the team discussion is in Slack, the decision meeting is on the calendar, and every AI answer normally disappears into a chat thread."

### Core Line

"Beyond Chat turns that scattered launch into one workspace."

### Close

"At the end, we do not have a chat transcript. We have a launch kit: research, data, finance, copy, creative, and model comparisons, all saved as reusable artifacts."

## Definition Of Done

- Demo starts from Dashboard and never feels empty.
- Every studio participates in the same launch.
- Context appears to travel across the product.
- Artifacts accumulate naturally.
- Compare is shown as LLM judgment comparison.
- The final launch kit is visible in Artifacts.
- Live provider failures are surfaced clearly without pretending the run succeeded.

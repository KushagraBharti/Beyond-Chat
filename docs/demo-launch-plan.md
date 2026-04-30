# Beyond Chat Investor Demo Plan

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

- Dashboard launch workspace card
- Calendar agenda card
- Integration tiles for Notion, Drive, Slack, Calendar
- Demo-mode provider statuses for not-yet-live integrations

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

- Context Builder source tabs: Artifacts, Notion, Files, Calendar, Slack
- One-click add suggested context
- Chat action button: Create Launch Plan
- Save chat-derived plan as artifact
- Button to continue the same context into Research Studio

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

### 5. Finance Studio

Finance Studio gives the launch a business case.

Finance prompt:

```text
Using SBUX public-company context and our pilot assumptions, assess whether Cinder Orange Cold Brew is financially credible. Include price, gross margin, break-even units, cannibalization risk, and what management would need to believe.
```

What to show:

- Dexter/tool timeline
- Public company context
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
- Cleaner Dexter output rendering
- Sensitivity table artifact
- Finance-to-writing handoff

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
- Multi-output writing run
- Save multiple documents from one generation

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

- Demo-mode Notion source in Context Builder
- Later: real Notion OAuth/search

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

- Dashboard agenda card
- "Find time for review" action
- Later: real Google Calendar availability

### Google Drive

Purpose:

- Pull briefs, docs, decks, and CSVs

Demo files:

- Retail Pilot One-Pager
- Beverage Pipeline Spreadsheet
- Customer Notes Export
- Prior Launch Review Deck

Initial implementation:

- Demo file source in Context Builder
- Later: real Drive picker/search

### Slack

Purpose:

- Capture scattered team discussion

Demo channels:

- `#beverage-innovation`
- `#retail-pilot`
- `#creative-review`

Initial implementation:

- Demo Slack digest source
- Later: real Slack channel/thread ingestion

### Data Sources

Purpose:

- Provide numbers that make the launch decision meaningful

Demo sources:

- prior seasonal launch data
- store cluster data
- margin assumptions
- customer segment data

Initial implementation:

- Built-in demo dataset picker
- Later: Sheets, uploaded CSV, warehouse connectors

## Two-Week Build Plan

### Week 1: Make the Demo Work End to End

- Add demo mode flag and launch workspace seed.
- Add dashboard launch card, calendar card, and integration tiles.
- Expand Context Builder to show source tabs.
- Add demo Notion, Drive, Slack, Calendar, and Artifact context items.
- Add a Chat launch prompt preset and `Create Launch Plan` action.
- Add demo dataset picker to Data Studio.
- Improve Data Studio output UI: metrics, charts, insight, table, risks.
- Add finance prompt presets for SBUX/public-company context.
- Add writing templates for launch kit deliverables.
- Add image prompt presets for packaging and campaign creative.

### Week 2: Make It Feel Like Magic

- Add artifact collections for `Cinder Orange Launch Kit`.
- Add cross-studio "Continue in..." actions.
- Add context provenance to saved artifacts.
- Add compare "Use this answer" and "Save best result" actions.
- Add bundle export or launch kit preview.
- Add richer source cards in Research Studio.
- Add chart/table save from Data Studio.
- Polish Dexter Finance output with sections and sensitivity table.
- Make demo data deterministic so the investor flow never depends on live provider success.
- Keep live provider paths available when keys are configured.

## Feature Priority

### P0 Demo Critical

- Demo workspace seed
- Context Builder source tabs
- Demo Notion/company knowledge
- Demo calendar agenda
- Demo launch dataset picker
- Strong Data Studio output
- SBUX finance prompt preset
- Writing launch templates
- Image prompt presets
- Artifact launch kit collection

### P1 Strong Differentiators

- Cross-studio handoff actions
- Provenance on artifacts
- Compare result save/use actions
- Research competitor matrix
- Finance sensitivity table
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
- If live providers fail, demo-mode data still completes the story.

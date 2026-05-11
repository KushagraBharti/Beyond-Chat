# Beyond Chat Final Demo Script

Status: final presentation script, May 11, 2026.

## Demo Goal

Show that Beyond Chat is not a generic chatbot. It is an artifact-first AI workspace where dedicated studios produce reusable outputs for writing, research, image, data, finance, comparison, and final handoff.

## Setup

- Open `https://beyond-chat-ivory.vercel.app/`.
- Use a pre-created demo account for authenticated studio flows.
- Keep `demo-data/starbucks-cinder-orange/` available for prompts, CSV data, and sample launch artifacts.
- Use the Starbucks Cinder Orange Cold Brew scenario as the narrative thread.

## Opening

"Beyond Chat is a studio-based AI workspace. Instead of losing work inside long chat threads, every meaningful output becomes an artifact that can be searched, reused, exported, and carried into the next studio."

## 1. Landing And Product Frame

Show:

- Landing page headline and studio overview
- Pricing page
- Login / signup entry point

Talking point:

"The public surface explains the core product idea: professionals need structured AI workspaces, not endless transcripts."

## 2. Dashboard

After login, show:

- Dashboard overview
- Studio navigation
- Provider/status cards
- Recent artifact activity
- Quick links into studios

Talking point:

"The dashboard is the workspace home. It shows where work lives, which providers are ready, and how to move into each studio."

## 3. Chat Studio

Prompt:

```text
We are evaluating Cinder Orange Cold Brew for a summer pilot. Pull in our launch context and help decide what to research, analyze, and produce.
```

Show:

- Prompt entry
- Context Builder
- Assistant response
- Save as artifact
- Continue into Research, Writing, or Compare

Talking point:

"Chat is still useful, but it is no longer the whole product. Chat becomes an entry point into structured work."

## 4. Research Studio

Prompt:

```text
Research the market for citrus-forward cold brew and seasonal ready-to-drink coffee. Compare competitor positioning, buyer motivations, and risks for a Starbucks pilot.
```

Show:

- Live-source research flow
- Run steps
- Source-backed report
- Competitor or landscape matrix
- Opportunity / risk matrix
- Save report artifact
- Continue into Data, Finance, Writing, or Compare

Talking point:

"Research outputs become cited artifacts that can be reused downstream instead of disappearing into a browser tab."

## 5. Data Studio

Use:

- `demo-data/starbucks-cinder-orange/data/starbucks_seasonal_beverage_pilots.csv`

Prompt:

```text
Analyze prior seasonal beverage pilots and estimate where Cinder Orange Cold Brew has the strongest pilot fit. Surface region, margin, repeat-rate, attach-rate, and cannibalization patterns.
```

Show:

- CSV upload
- Dataset preview
- Profile metadata
- Analysis output
- Chart/table output
- Separate save actions for report, chart, and table
- Continue into Finance, Writing, or Compare

Talking point:

"Data Studio turns uploaded business data into decision artifacts, not just a one-off chart."

## 6. Finance Studio

Prompt:

```text
Using SBUX public-company context, our pilot assumptions, and relevant beverage peers, assess whether Cinder Orange Cold Brew is financially credible. Include price, gross margin, break-even units, cannibalization risk, and what management would need to believe.
```

Show:

- Finance/Dexter run timeline
- Structured memo
- Peer or public-company framing
- Save memo artifact
- Continue into Writing or Compare

Talking point:

"Finance demonstrates the agentic pattern: visible steps, external data, and a final memo that becomes part of the launch kit."

## 7. Writing Studio

Prompt:

```text
Draft the Cinder Orange Cold Brew launch kit using the research report, data analysis, finance memo, and brand notes. Create an executive brief, retail pilot summary, product FAQ, launch email, and landing page copy.
```

Show:

- Writing templates
- Context attachments
- Multi-output generation
- Targeted edit mode
- Save each output as a writing artifact

Talking point:

"Writing is grounded in the work already done. The user does not have to copy and paste context between tools."

## 8. Image Studio

Prompt:

```text
Create a premium product mockup for Cinder Orange Cold Brew with retail realism, citrus accents, cold condensation, and summer morning lighting.
```

Show:

- Image prompt presets
- Context-aware prompt enhancement
- Generated image output
- Save visual artifact

Talking point:

"The same workspace that analyzed the product decision can also produce creative assets from the same strategy context."

## 9. Compare Panel

Prompt:

```text
Given the attached research, data, and finance artifacts, recommend whether Starbucks should pilot Cinder Orange Cold Brew. Be concise, executive-ready, and explicit about risks.
```

Show:

- Shared Compare panel from a studio
- Multiple model outputs
- Latency/status
- Save best result
- Use result in the originating workflow

Talking point:

"Compare is available at the point of work. It is not a separate destination; it is a shared model judgment tool."

## 10. Artifacts

Show:

- Artifact search/filter
- Detail view
- Handoff actions
- Markdown export
- Multi-artifact bundle export

Talking point:

"The final deliverable is not a chat transcript. It is a launch kit: research, data analysis, finance memo, writing deliverables, creative assets, and model comparisons."

## Close

"Beyond Chat replaces scattered AI sessions with a reusable workspace. Each studio does the job it is designed for, and every output can become durable context for the next step."

## Backup Plan

If a live provider is unavailable:

- Show the provider status in Settings or Dashboard.
- Explain that Beyond Chat intentionally surfaces provider failures instead of fabricating successful outputs.
- Use checked-in demo data and previously saved sample artifacts to continue the product walkthrough.

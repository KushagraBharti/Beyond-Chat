# 500-seat load and unit economics

The fixture models 500 memberships, 72% active seats, 7,200 monthly runs, 50 peak concurrent runs, and p95 160 events/run. These are synthetic planning inputs, not measurements.

Initial acceptance budgets for a production-shaped preview are: error rate ≤1%; p95 run acceptance ≤1s; p95 250-event replay ≤2s; zero duplicate external effects; zero cross-tenant reads. Also record saturation, database connections, queue age, event fanout, cancellation release, and cost. Tune only after collecting a baseline; do not translate these internal budgets into an SLA.

The economics model reports provider COGS per run, accepted output, active seat, and organization plus gross margin. It deliberately exposes light/expected/heavy sensitivity. Credits may reduce cash burn but not normalized COGS. Before commercial approval replace assumptions with actual pilot distributions and current dated rates, reconcile provider samples, include payment fees/refunds/support, and approve or revise the $30 price. A synthetic guardrail pass is not launch approval.

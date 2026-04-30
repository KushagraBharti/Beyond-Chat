export type DemoStudioKey =
  | "dashboard"
  | "chat"
  | "research"
  | "data"
  | "finance"
  | "writing"
  | "image"
  | "compare"
  | "artifacts";

export type DemoContextSource = "artifact" | "notion" | "calendar" | "drive" | "slack" | "dataset";

export const demoLaunchKit = {
  workspace: {
    name: "Starbucks Seasonal Launch Room",
    userName: "Maya Chen",
    role: "Director of Beverage Innovation",
    assistant: "Jordan Blake",
    company: "Starbucks",
    ticker: "SBUX",
    product: "Cinder Orange Cold Brew",
    tagline: "Bright citrus cold brew for warmer mornings.",
  },
  launch: {
    launchDate: "2026-06-02",
    decisionDate: "2026-05-10",
    pilotStores: 400,
    channelMix: ["in-store handcrafted beverage", "RTD bottle pilot", "app promotion", "licensed cafe test"],
    objective:
      "Decide whether Starbucks should pilot a citrus-forward cold brew concept with a credible financial case, clear positioning, and production-ready launch assets.",
    audience: [
      "morning commuters who already buy cold coffee",
      "Gen Z and millennial customers who engage with seasonal beverages",
      "retail and operations leaders who need clear margin and execution logic",
      "executives who need a concise pilot decision memo",
    ],
  },
  dashboard: {
    launchCardTitle: "Cinder Orange Cold Brew pilot",
    status: "Decision package in progress",
    nextBestAction: "Review data fit and finance memo before the executive pilot decision.",
    integrationLinks: [
      { source: "notion", label: "Brand notes", status: "connected" },
      { source: "calendar", label: "Launch calendar", status: "connected" },
      { source: "drive", label: "Pilot docs", status: "connected" },
      { source: "slack", label: "Team discussion", status: "connected" },
      { source: "artifact", label: "Saved launch kit", status: "connected" },
    ],
  },
  calendar: {
    events: [
      {
        id: "calendar-pricing-lock",
        title: "Pricing lock",
        startsAt: "2026-05-06T15:00:00Z",
        endsAt: "2026-05-06T15:30:00Z",
        location: "Starbucks HQ / Teams",
        note: "Final price ladder and margin assumptions for Cinder Orange.",
      },
      {
        id: "calendar-packaging-review",
        title: "Packaging and hero creative review",
        startsAt: "2026-05-07T18:00:00Z",
        endsAt: "2026-05-07T19:00:00Z",
        location: "Design Studio",
        note: "Review bottle, in-store menu board, and app tile concepts.",
      },
      {
        id: "calendar-pilot-readout",
        title: "Retail pilot readiness readout",
        startsAt: "2026-05-08T16:00:00Z",
        endsAt: "2026-05-08T16:45:00Z",
        location: "Launch Room",
        note: "Ops, supply, marketing, and finance sign-off.",
      },
      {
        id: "calendar-exec-decision",
        title: "Executive pilot decision",
        startsAt: "2026-05-10T14:00:00Z",
        endsAt: "2026-05-10T14:30:00Z",
        location: "Boardroom 3",
        note: "Decision on whether to proceed with 400-store summer pilot.",
      },
    ],
    availability: {
      suggestedSlot: "2026-05-09T17:00:00Z",
      label: "Maya is free tomorrow at 12:00 PM CT for final review.",
    },
  },
  contextSources: [
    {
      id: "notion-brand-voice",
      source: "notion" as DemoContextSource,
      title: "Starbucks Brand Voice Notes",
      summary: "Premium, human, sensory language. Lead with taste and ritual. Avoid clinical functional claims.",
      tags: ["brand", "voice", "notion"],
    },
    {
      id: "notion-cold-beverage-retro",
      source: "notion" as DemoContextSource,
      title: "Cold Beverage Launch Retrospective",
      summary: "Prior seasonal cold beverages worked best when app promotion, warm-weather timing, and visual contrast aligned.",
      tags: ["retrospective", "cold-beverage", "notion"],
    },
    {
      id: "notion-pipeline",
      source: "notion" as DemoContextSource,
      title: "Summer 2026 Beverage Pipeline",
      summary: "Cinder Orange is competing against tropical tea, lavender latte, and protein cold foam concepts.",
      tags: ["pipeline", "summer-2026", "notion"],
    },
    {
      id: "drive-retailer-one-pager",
      source: "drive" as DemoContextSource,
      title: "Retail Pilot One-Pager",
      summary: "Operational checklist for 400-store pilots, including training assets, store signage, and app launch dependencies.",
      tags: ["drive", "pilot", "ops"],
    },
    {
      id: "slack-creative-digest",
      source: "slack" as DemoContextSource,
      title: "#creative-review Digest",
      summary: "Team prefers orange peel, ember, and condensation motifs. Concern: avoid looking like soda.",
      tags: ["slack", "creative", "digest"],
    },
    {
      id: "artifact-cold-brew-prior",
      source: "artifact" as DemoContextSource,
      title: "Prior Cold Brew Launch Learnings",
      summary: "Highest repeat rates came from products with familiar coffee base plus one distinctive seasonal hook.",
      tags: ["artifact", "launch", "cold-brew"],
    },
  ],
  chat: {
    openingPrompt:
      "We are evaluating Cinder Orange Cold Brew for a summer pilot. Pull in our company notes, prior cold beverage artifacts, and launch constraints. Help me decide what to research, analyze, and produce.",
    suggestedFollowUps: [
      "Create a launch workplan using the attached context.",
      "Which context should I send to Research Studio?",
      "What data should we analyze before committing to the pilot?",
      "Prepare an executive-ready decision question.",
    ],
    launchPlanActions: [
      "Send market questions to Research Studio",
      "Open prior launch dataset in Data Studio",
      "Run SBUX launch economics in Finance Studio",
      "Draft launch kit in Writing Studio",
      "Generate packaging visuals in Image Studio",
    ],
  },
  research: {
    prompt:
      "Research the market for citrus-forward cold brew and seasonal ready-to-drink coffee. Compare competitor positioning, likely buyer motivations, and risks for a Starbucks pilot.",
    brief:
      "Citrus-forward coffee is a high-signal seasonal idea because it gives cold brew a warmer-weather flavor hook, but it needs careful positioning to avoid sounding like a soda or energy drink.",
    sources: [
      {
        title: "Ready-to-drink coffee growth and premiumization",
        url: "https://example.com/ready-to-drink-coffee-growth",
        note: "Premium cold coffee demand continues to be driven by convenience, flavor, and morning rituals.",
      },
      {
        title: "Seasonal beverage launch behavior",
        url: "https://example.com/seasonal-beverage-launches",
        note: "Limited-time beverage launches increase trial when the product has a clear visual and flavor story.",
      },
      {
        title: "Coffee flavor innovation report",
        url: "https://example.com/coffee-flavor-innovation",
        note: "Fruit and botanical notes are gaining attention, but customers still expect coffee-forward taste.",
      },
      {
        title: "Retail shelf positioning for premium beverages",
        url: "https://example.com/premium-beverage-positioning",
        note: "Packaging should communicate occasion, flavor, and value in a compact visual hierarchy.",
      },
    ],
    competitorGrid: [
      { brand: "Starbucks", product: "Oleato / seasonal cold beverages", angle: "premium ritual and menu innovation", price: "$5.95+" },
      { brand: "La Colombe", product: "Draft Latte", angle: "smooth, accessible, mass premium", price: "$4.29" },
      { brand: "Stumptown", product: "Cold Brew", angle: "craft, quality, coffee-first", price: "$4.99" },
      { brand: "High Brew", product: "RTD cold brew", angle: "energy and convenience", price: "$3.99" },
      { brand: "Chameleon", product: "Organic cold brew", angle: "clean-label and everyday", price: "$4.49" },
    ],
    opportunityMatrix: [
      { item: "Taste differentiation", upside: "High", risk: "Medium", note: "Citrus creates a clear hook but must stay coffee-forward." },
      { item: "App promotion", upside: "High", risk: "Low", note: "Strong visual product works well in app tiles and limited drops." },
      { item: "Retail bottle pilot", upside: "Medium", risk: "Medium", note: "Shelf packaging must avoid soda/juice confusion." },
      { item: "Operational complexity", upside: "Medium", risk: "High", note: "Fresh citrus cues may create training and supply friction." },
    ],
  },
  data: {
    fileName: "starbucks_seasonal_beverage_pilots.csv",
    prompt:
      "Analyze prior seasonal beverage pilots and estimate where Cinder Orange Cold Brew has the strongest pilot fit. Surface channel, region, margin, and cannibalization patterns.",
    columns: [
      "pilot",
      "region",
      "stores",
      "units",
      "revenue",
      "gross_margin",
      "repeat_rate",
      "attach_rate",
      "cannibalization_index",
      "weather_index",
      "segment",
    ],
    rows: [
      {
        pilot: "Summer Berry Refresher",
        region: "West",
        stores: 120,
        units: 188000,
        revenue: 1034000,
        grossMargin: 0.71,
        repeatRate: 0.31,
        attachRate: 0.18,
        cannibalizationIndex: 0.12,
        weatherIndex: 0.83,
        segment: "Gen Z afternoon",
      },
      {
        pilot: "Citrus Green Tea",
        region: "South",
        stores: 90,
        units: 121000,
        revenue: 604000,
        grossMargin: 0.68,
        repeatRate: 0.27,
        attachRate: 0.13,
        cannibalizationIndex: 0.08,
        weatherIndex: 0.91,
        segment: "warm-weather commuter",
      },
      {
        pilot: "Vanilla Cream Cold Brew",
        region: "Northeast",
        stores: 150,
        units: 216000,
        revenue: 1296000,
        grossMargin: 0.76,
        repeatRate: 0.34,
        attachRate: 0.21,
        cannibalizationIndex: 0.18,
        weatherIndex: 0.62,
        segment: "morning commuter",
      },
      {
        pilot: "Spiced Mocha Cold Brew",
        region: "Midwest",
        stores: 110,
        units: 98000,
        revenue: 568000,
        grossMargin: 0.73,
        repeatRate: 0.22,
        attachRate: 0.1,
        cannibalizationIndex: 0.21,
        weatherIndex: 0.55,
        segment: "seasonal coffee loyalist",
      },
      {
        pilot: "Blood Orange Espresso Tonic",
        region: "West",
        stores: 70,
        units: 76000,
        revenue: 494000,
        grossMargin: 0.7,
        repeatRate: 0.25,
        attachRate: 0.15,
        cannibalizationIndex: 0.09,
        weatherIndex: 0.88,
        segment: "trial seeker",
      },
    ],
    takeaways: [
      "Cold coffee products with a familiar base and distinctive seasonal flavor show stronger repeat than purely novel beverages.",
      "West and South pilots over-index when weather and app merchandising support the launch.",
      "Cannibalization risk rises when the flavor sits too close to existing core cold brew; citrus creates enough separation if positioned correctly.",
      "Margin remains attractive if premium price is maintained and citrus component complexity stays controlled.",
    ],
    charts: [
      { title: "Revenue by pilot", metric: "revenue" },
      { title: "Repeat rate by region", metric: "repeatRate" },
      { title: "Margin vs cannibalization", metric: "grossMargin" },
    ],
  },
  finance: {
    prompt:
      "Using SBUX public-company context, our pilot assumptions, and public competitor context, assess whether Cinder Orange Cold Brew is financially credible. Compare Starbucks against relevant beverage and coffee peers, then include price, gross margin, break-even units, cannibalization risk, and what management would need to believe.",
    ticker: "SBUX",
    competitorBasket: [
      {
        ticker: "SBUX",
        company: "Starbucks",
        role: "core company",
        whyItMatters: "Direct launch owner with cold beverage, app, store, and brand context.",
        watch: "Cold beverage mix, same-store sales, traffic, pricing power, margin commentary.",
      },
      {
        ticker: "BROS",
        company: "Dutch Bros",
        role: "high-growth beverage chain peer",
        whyItMatters: "Useful reference for flavored beverage demand and younger customer behavior.",
        watch: "Unit growth, beverage innovation, traffic trends, customer frequency.",
      },
      {
        ticker: "DNUT",
        company: "Krispy Kreme",
        role: "consumer food and beverage retail comp",
        whyItMatters: "Useful for indulgent seasonal product drops and retail partnership dynamics.",
        watch: "Seasonal launches, retail distribution, margin pressure, promotion intensity.",
      },
      {
        ticker: "MCD",
        company: "McDonald's",
        role: "breakfast and beverage traffic benchmark",
        whyItMatters: "McCafe and breakfast traffic are a practical benchmark for coffee occasion competition.",
        watch: "Breakfast daypart, beverage value pricing, traffic trends.",
      },
      {
        ticker: "KO",
        company: "Coca-Cola",
        role: "RTD beverage scale benchmark",
        whyItMatters: "Provides reference for bottled beverage distribution, brand scale, and retail execution.",
        watch: "RTD category strength, pricing, channel mix, product innovation.",
      },
      {
        ticker: "PEP",
        company: "PepsiCo",
        role: "retail beverage distribution benchmark",
        whyItMatters: "Useful comparison for retail channel strategy and beverage portfolio management.",
        watch: "Convenience channel, pricing, gross margin, innovation cadence.",
      },
      {
        ticker: "MNST",
        company: "Monster Beverage",
        role: "premium functional beverage margin benchmark",
        whyItMatters: "Shows economics of premium beverage positioning, high margin, and strong brand-led demand.",
        watch: "Gross margin, international growth, category resilience, premium price points.",
      },
    ],
    competitorInsights: [
      "Starbucks has the strongest owned-channel launch surface because store, app, loyalty, and beverage operations sit in one system.",
      "Dutch Bros is the clearest public peer for younger flavored beverage demand, but it is less useful for RTD retail distribution.",
      "Coca-Cola and PepsiCo are better distribution benchmarks than direct menu innovation comps.",
      "Monster is not a coffee comp, but it is useful for understanding premium beverage margin and functional positioning.",
      "McDonald's is the practical breakfast-occasion pressure test: if the product cannot defend a premium morning use case, value coffee wins.",
    ],
    assumptions: {
      pricePerCup: 5.95,
      variableCostPerCup: 1.42,
      contributionMarginPerCup: 4.53,
      launchBudget: 950000,
      pilotStores: 400,
      pilotWeeks: 8,
      breakEvenUnits: 209713,
    },
    scenarios: [
      { name: "Conservative", unitsPerStorePerWeek: 45, totalUnits: 144000, revenue: 856800, contribution: 652320 },
      { name: "Base", unitsPerStorePerWeek: 75, totalUnits: 240000, revenue: 1428000, contribution: 1087200 },
      { name: "Upside", unitsPerStorePerWeek: 110, totalUnits: 352000, revenue: 2094400, contribution: 1594560 },
    ],
    risks: [
      "Operational complexity from citrus prep or perceived acidity.",
      "Cannibalization of existing cold brew if positioned too close to core menu.",
      "RTD packaging confusion if visual identity reads more like juice than coffee.",
      "Margin pressure if premium price is discounted too early.",
    ],
  },
  writing: {
    prompt:
      "Draft the Cinder Orange Cold Brew launch kit using the research report, data analysis, finance memo, and Notion brand notes. Create an executive brief, retail pilot summary, product FAQ, launch email, and landing page copy.",
    deliverables: [
      {
        title: "Executive Launch Brief",
        type: "brief",
        summary: "Decision-ready memo for approving the 400-store pilot.",
      },
      {
        title: "Retail Pilot Summary",
        type: "one-pager",
        summary: "Operational and commercial summary for store, retail, and field teams.",
      },
      {
        title: "Product FAQ",
        type: "faq",
        summary: "Questions and answers for taste, ingredients, pricing, and availability.",
      },
      {
        title: "Launch Email",
        type: "email",
        summary: "Customer-facing announcement for Rewards members.",
      },
      {
        title: "Landing Page Copy",
        type: "landing-page",
        summary: "Headline, subhead, product story, and CTA copy.",
      },
    ],
    copy: {
      internalBriefTitle: "Cinder Orange Cold Brew Pilot Decision Brief",
      retailerOneLiner:
        "A citrus-forward seasonal cold brew designed to feel bright and premium while staying unmistakably coffee-first.",
      landingPageHeadline: "A brighter cold brew for summer mornings.",
      launchEmailSubject: "Meet Cinder Orange Cold Brew",
      internalNotes: [
        "Lead with sensory taste language before business rationale.",
        "Use financial assumptions only where they support the pilot decision.",
        "Avoid health or energy claims that sound regulatory or clinical.",
        "Make the in-store and bottled versions feel like one coherent launch.",
      ],
    },
  },
  image: {
    prompt:
      "Create a premium product mockup for Cinder Orange Cold Brew with Starbucks-inspired retail realism, citrus color accents, cold condensation, and summer morning lighting.",
    directions: [
      {
        name: "Premium Pack Shot",
        prompt:
          "Photorealistic ready-to-drink bottle mockup for Cinder Orange Cold Brew, premium coffee retail packaging, citrus color accent, condensation, warm summer morning light, clean shelf-ready composition.",
      },
      {
        name: "In-Store Menu Hero",
        prompt:
          "Starbucks-style in-store menu board hero image for Cinder Orange Cold Brew, glass cup with cold brew and orange peel garnish, bright polished retail beverage photography, premium summer campaign.",
      },
      {
        name: "Commuter Social Ad",
        prompt:
          "Morning commuter holding Cinder Orange Cold Brew outside a cafe, orange peel, cold coffee, urban summer morning, premium editorial beverage ad, high conversion social layout.",
      },
      {
        name: "Ingredient Flat Lay",
        prompt:
          "Flat lay of cold brew, orange peel, coffee beans, glass bottle, and clean typography space, premium seasonal beverage brand system, social ad creative.",
      },
    ],
  },
  compare: {
    prompt:
      "Given the attached research, data, and finance artifacts, recommend whether Starbucks should pilot Cinder Orange Cold Brew. Be concise, executive-ready, and explicit about risks.",
    models: ["openai/gpt-5.4-nano", "openai/gpt-5.4", "anthropic/claude-opus-4.6", "google/gemini-3.1-pro-preview"],
    expectedDifferences: [
      "One model emphasizes brand and customer upside.",
      "One model is more cautious about operational complexity.",
      "One model gives a sharper financial threshold.",
      "One model produces the best executive wording.",
    ],
  },
  artifacts: [
    "Launch Plan",
    "Starbucks Brand Voice Notes",
    "Category Research Report",
    "Competitive Positioning Matrix",
    "Seasonal Pilot Data Analysis",
    "Finance Memo",
    "Executive Launch Brief",
    "Retail Pilot Summary",
    "Product FAQ",
    "Landing Page Copy",
    "Launch Email",
    "Packaging Mockups",
    "Social Ad Concepts",
    "Model Compare Result",
  ],
} as const;

export const demoLaunchCsv = [
  demoLaunchKit.data.columns.join(","),
  ...demoLaunchKit.data.rows.map((row) =>
    [
      row.pilot,
      row.region,
      row.stores,
      row.units,
      row.revenue,
      row.grossMargin,
      row.repeatRate,
      row.attachRate,
      row.cannibalizationIndex,
      row.weatherIndex,
      row.segment,
    ].join(","),
  ),
].join("\n");

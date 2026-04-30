export type DemoStudioKey = "chat" | "research" | "data" | "finance" | "writing" | "image" | "compare" | "artifacts";

export const demoLaunchKit = {
  workspace: {
    name: "Northbound Coffee Launch Lab",
    userName: "Maya Chen",
    role: "Head of Product",
    assistant: "Jordan Blake",
    company: "Northbound Coffee",
    product: "Cinder Orange Cold Brew",
    tagline: "Bright citrus cold brew for commuter mornings.",
  },
  launch: {
    launchDate: "2026-05-18",
    channelMix: ["DTC", "Whole Foods", "Target test aisle", "independent cafes"],
    objective: "Launch a seasonal beverage with a clear margin story, crisp positioning, and sellable creative.",
    audience: [
      "commuters looking for a quick morning caffeine fix",
      "grocery buyers who like premium seasonal products",
      "retail buyers who need a differentiated shelf story",
    ],
  },
  chatPrompt: "Help me launch Cinder Orange Cold Brew. I need the market context, the numbers, the copy, the visuals, and a final launch kit.",
  reminders: [
    { title: "Retailer sell-in deck due", dueAt: "2026-05-06T09:00:00Z" },
    { title: "Packaging review with design", dueAt: "2026-05-07T15:00:00Z" },
    { title: "Pricing decision locked", dueAt: "2026-05-08T17:00:00Z" },
    { title: "Launch email ready for approval", dueAt: "2026-05-09T14:00:00Z" },
  ],
  research: {
    brief:
      "Consumers are leaning toward premium flavored cold brew, but the strongest products clearly communicate taste, function, and convenience in one sentence.",
    sources: [
      {
        title: "Premium ready-to-drink coffee trends",
        url: "https://example.com/ready-to-drink-coffee-trends",
        note: "Shows continued growth in flavored cold brew and seasonal limited editions.",
      },
      {
        title: "Seasonal beverage launch playbook",
        url: "https://example.com/seasonal-beverage-playbook",
        note: "Highlights why limited-time flavors improve trial and social buzz.",
      },
      {
        title: "Retail shelf positioning for beverages",
        url: "https://example.com/retail-shelf-positioning",
        note: "Summarizes how packaging, naming, and price laddering affect conversion.",
      },
    ],
    competitorGrid: [
      { brand: "Stumptown", product: "Orange Cold Brew", angle: "bright, craft, premium", price: "$4.99" },
      { brand: "La Colombe", product: "Vanilla Draft Latte", angle: "smooth, familiar, mass premium", price: "$4.29" },
      { brand: "High Brew", product: "Citrus Nitro", angle: "functional, energetic, convenience-led", price: "$3.99" },
      { brand: "Chameleon", product: "Mocha Cold Brew", angle: "clean-label, everyday cold brew", price: "$4.49" },
    ],
  },
  data: {
    rows: [
      { week: "W1", totalRevenue: 42000, units: 5400, returnRate: 0.021, repeatPurchase: 0.18 },
      { week: "W2", totalRevenue: 45500, units: 5800, returnRate: 0.019, repeatPurchase: 0.2 },
      { week: "W3", totalRevenue: 51200, units: 6400, returnRate: 0.017, repeatPurchase: 0.23 },
      { week: "W4", totalRevenue: 54800, units: 7100, returnRate: 0.016, repeatPurchase: 0.24 },
    ],
    takeaways: [
      "Flavor-led SKUs outperform plain cold brew in trial channels.",
      "Repeat purchase rises when the product has a clear occasion and packaging signal.",
      "Retail margin stays healthy if COGS stays under $1.12 per unit.",
    ],
  },
  finance: {
    pricePerUnit: 4.49,
    cogsPerUnit: 1.08,
    grossMargin: 0.759,
    launchBudget: 85000,
    breakEvenUnits: 18930,
    scenarios: [
      { name: "Conservative", units: 15000, revenue: 67350 },
      { name: "Base", units: 25000, revenue: 112250 },
      { name: "Upside", units: 40000, revenue: 179600 },
    ],
  },
  writing: {
    internalBriefTitle: "Cinder Orange Cold Brew Launch Brief",
    retailerOneLiner: "A bright, seasonal cold brew with enough citrus character to stand out on shelf without feeling gimmicky.",
    landingPageHeadline: "A sharper cold brew for warmer mornings.",
    launchEmailSubject: "Meet Cinder Orange Cold Brew, our boldest seasonal drop yet",
    internalNotes: [
      "Lead with taste first, then mention function.",
      "Avoid over-claiming health benefits.",
      "Keep the product copy premium, not playful to the point of confusion.",
    ],
  },
  image: {
    directions: [
      {
        name: "Premium Pack Shot",
        prompt: "Photorealistic retail packaging mockup for Cinder Orange Cold Brew, premium citrus palette, clean studio lighting, grocery shelf realism.",
      },
      {
        name: "Lifestyle Ad",
        prompt: "Morning commuter holding a can of Cinder Orange Cold Brew on a subway platform, warm sunrise light, premium editorial beverage campaign.",
      },
      {
        name: "Social Cutdown",
        prompt: "Flat lay of orange, coffee beans, and can packaging with modern typography, high contrast, seasonal beverage branding, Instagram-ready.",
      },
    ],
  },
  compare: {
    prompt: "Which positioning is stronger for Cinder Orange Cold Brew: 'premium citrus energy' or 'bright functional coffee'?",
    options: [
      "premium citrus energy",
      "bright functional coffee",
    ],
  },
  artifacts: [
    "Seasonal Launch Brief",
    "Category Research Memo",
    "Launch Economics Memo",
    "Retail Pitch Notes",
    "Landing Page Copy",
    "Launch Email Draft",
    "Social Ad Variants",
    "Packaging Concepts",
    "Compare Result: Positioning",
  ],
} as const;


import { formatIncomeStatements } from "../../backend/dexter/src/tools/finance/formatters.ts";

interface IncomeStatement {
  readonly report_period: string;
  readonly revenue: number;
  readonly operating_income: number;
  readonly net_income: number;
  readonly earnings_per_share: number;
}

export interface FinanceAnalysis {
  readonly markdown: string;
  readonly formatted_tool_result: string;
  readonly metrics: {
    readonly revenue_growth_percent: number;
    readonly operating_margin_2023_percent: number;
    readonly operating_margin_2024_percent: number;
    readonly operating_margin_change_bps: number;
  };
}

export function analyzeRecordedFinanceScenario(
  ticker: string,
  statements: readonly IncomeStatement[],
  sources: readonly string[],
): FinanceAnalysis {
  if (statements.length !== 2 || sources.length < 1) throw new Error("Finance fixture requires two statements and at least one source");
  const ordered = [...statements].sort((left, right) => left.report_period.localeCompare(right.report_period));
  const prior = ordered[0];
  const current = ordered[1];
  if (prior.revenue <= 0 || current.revenue <= 0) throw new Error("Finance fixture revenue must be positive");
  const revenueGrowth = ((current.revenue / prior.revenue) - 1) * 100;
  const priorMargin = (prior.operating_income / prior.revenue) * 100;
  const currentMargin = (current.operating_income / current.revenue) * 100;
  const marginChangeBps = (currentMargin - priorMargin) * 100;
  const formatted = formatIncomeStatements(ordered, { ticker });
  const markdown = [
    `# ${ticker} Finance Analysis`,
    "",
    "## Calculation",
    "",
    `- Revenue increased from $${(prior.revenue / 1e9).toFixed(3)}B to $${(current.revenue / 1e9).toFixed(3)}B, or **${revenueGrowth.toFixed(2)}%**.`,
    `- Operating margin moved from **${priorMargin.toFixed(2)}%** to **${currentMargin.toFixed(2)}%**, an expansion of **${Math.round(marginChangeBps)} bps**.`,
    "- Calculation: operating margin = operating income ÷ revenue.",
    "",
    "## Evidence",
    "",
    formatted,
    "",
    "## Sources",
    "",
    ...sources.map((source, index) => `${index + 1}. ${source}`),
    "",
  ].join("\n");
  return {
    markdown,
    formatted_tool_result: formatted,
    metrics: {
      revenue_growth_percent: revenueGrowth,
      operating_margin_2023_percent: priorMargin,
      operating_margin_2024_percent: currentMargin,
      operating_margin_change_bps: marginChangeBps,
    },
  };
}

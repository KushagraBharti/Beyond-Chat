export interface UnitEconomicsAssumptions { seats:number;runs_per_seat:number;acceptance_rate:number;seat_price_usd:number;fixed_provider_cogs_usd:number;variable_run_cogs_usd:number;payment_fee_rate:number;payment_fee_fixed_usd:number; }
export interface UnitEconomicsResult { runs:number;accepted_outputs:number;revenue_usd:number;provider_cogs_usd:number;payment_fees_usd:number;cogs_per_run_usd:number;cogs_per_accepted_output_usd:number;cogs_per_active_seat_usd:number;organization_gross_margin_rate:number; }
export function calculateUnitEconomics(a:UnitEconomicsAssumptions):UnitEconomicsResult {
  if(a.seats<=0||a.runs_per_seat<=0||a.acceptance_rate<=0||a.acceptance_rate>1)throw new Error("Invalid unit-economics assumptions.");
  const runs=a.seats*a.runs_per_seat,accepted_outputs=runs*a.acceptance_rate,revenue_usd=a.seats*a.seat_price_usd,provider_cogs_usd=a.fixed_provider_cogs_usd+runs*a.variable_run_cogs_usd,payment_fees_usd=a.seats*(a.seat_price_usd*a.payment_fee_rate+a.payment_fee_fixed_usd);
  return {runs,accepted_outputs,revenue_usd,provider_cogs_usd,payment_fees_usd,cogs_per_run_usd:provider_cogs_usd/runs,cogs_per_accepted_output_usd:provider_cogs_usd/accepted_outputs,cogs_per_active_seat_usd:provider_cogs_usd/a.seats,organization_gross_margin_rate:(revenue_usd-provider_cogs_usd-payment_fees_usd)/revenue_usd};
}

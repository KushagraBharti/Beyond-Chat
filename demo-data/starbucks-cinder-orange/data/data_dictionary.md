# Data Dictionary

File: `starbucks_seasonal_beverage_pilots.csv`

## Purpose

This large mock dataset powers the Data Studio demo. It represents prior seasonal beverage pilots and simulated Cinder Orange test rows across region, channel, store cluster, and customer segment.

## Important Fields

- `pilot_name`: prior or simulated product concept
- `region`: market region
- `channel`: in-store, mobile, drive-thru, delivery, or RTD retail
- `stores`: number of stores in the cluster
- `avg_temp_f`: average weekly temperature
- `weather_index`: normalized warm-weather fit score
- `units_sold`: units sold in the week
- `revenue`: simulated revenue
- `gross_margin_pct`: estimated gross margin
- `repeat_rate`: repeat-purchase proxy
- `attach_rate`: add-on or paired purchase proxy
- `cannibalization_index`: estimated substitution from existing beverages
- `promo_spend`: local promotion investment
- `app_impressions`: app merchandising impressions
- `conversion_rate`: app or promotion conversion proxy
- `ops_complexity_score`: store execution complexity
- `stockout_rate`: supply readiness warning signal
- `nps`: customer sentiment proxy

## Demo Questions

- Which regions should receive the first pilot?
- Does Cinder Orange perform more like cold brew or Refreshers?
- Which channel has the strongest margin-adjusted demand?
- Is cannibalization acceptable?
- What operational thresholds should trigger a no-go?


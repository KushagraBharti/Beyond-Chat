import { readFileSync } from "node:fs";
import { evaluateFrozenJourney, type FrozenJourney } from "../../packages/product-catalog/src/index.ts";

const fixture = JSON.parse(readFileSync(new URL("../../fixtures/phase5/frozen-journeys.json", import.meta.url), "utf8")) as { fixture_version: string; journeys: readonly FrozenJourney[] };
if (fixture.fixture_version !== "1.0.0") throw new Error(`Unsupported fixture version ${fixture.fixture_version}`);
const results = fixture.journeys.map(evaluateFrozenJourney);
for (const result of results) process.stdout.write(`${result.pass ? "PASS" : "FAIL"} ${result.id}: ${result.detail}\n`);
const failures = results.filter((result) => !result.pass);
if (failures.length > 0) process.exitCode = 1;

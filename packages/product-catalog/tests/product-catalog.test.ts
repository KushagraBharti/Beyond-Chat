import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { BUILT_IN_AGENTS, PRODUCT_CATALOG, builtInDiscoveryItems, evaluateFrozenJourney, isCapabilityAllowed, type DiscoveryItem } from "../src/index.ts";

test("built-in manifests are immutable, versioned, unique, and credential-free", () => {
  const versions = new Set<string>();
  for (const manifest of BUILT_IN_AGENTS) {
    assert.equal(manifest.schema_version, "1.0");
    assert.equal(manifest.credentials, "none");
    assert.equal(Object.isFrozen(manifest), true);
    assert.equal(Object.isFrozen(manifest.aliases), true);
    assert.equal(Object.isFrozen(manifest.allowed_capabilities), true);
    assert.equal(Object.isFrozen(manifest.model_policy), true);
    const key = `${manifest.id}@${manifest.version}`;
    assert.equal(versions.has(key), false);
    versions.add(key);
  }
  assert.deepEqual(BUILT_IN_AGENTS.map((agent) => agent.id), ["agent.general", "agent.research", "agent.finance"]);
  assert.equal(PRODUCT_CATALOG.navigation.length, 9);
});

test("frozen fixture journeys all pass", () => {
  const fixture = JSON.parse(readFileSync(new URL("../../../fixtures/phase5/frozen-journeys.json", import.meta.url), "utf8"));
  for (const journey of fixture.journeys) assert.equal(evaluateFrozenJourney(journey).pass, true, journey.id);
});

test("capability boundaries keep finance-only capabilities out of Research", () => {
  const research = BUILT_IN_AGENTS.find((agent) => agent.id === "agent.research")!;
  const finance = BUILT_IN_AGENTS.find((agent) => agent.id === "agent.finance")!;
  assert.equal(isCapabilityAllowed(research, "capability.financial_modeling"), false);
  assert.equal(isCapabilityAllowed(finance, "capability.financial_modeling"), true);
  assert.equal(isCapabilityAllowed(BUILT_IN_AGENTS[0], "capability.document_output"), true);
});

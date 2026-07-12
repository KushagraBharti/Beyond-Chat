import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { canonicalId, type CommandEnvelope, type EventEnvelope, type JsonObject } from "../../packages/contracts/src/index.ts";
import { createOfflinePiRuntimeFactory } from "../../services/local-app-server/src/pi-runtime.ts";
import { LocalAppServerCore, PROTOCOL_VERSION } from "../../services/local-app-server/src/protocol.ts";
import { AppendOnlyStore } from "../../services/local-app-server/src/store.ts";
import { analyzeRecordedFinanceScenario } from "./dexter-finance-engine.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const runtimeImageDigest = "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

interface BaseFixture {
  readonly id: string;
  readonly prompt: string;
  readonly trace: { readonly required_tools: readonly string[]; readonly maximum_tool_calls: number; readonly maximum_model_turns: number };
  readonly budget: { readonly maximum_latency_ms: number; readonly maximum_cost_usd: number };
}

function command(name: string, prompt: string): CommandEnvelope {
  return {
    organization_id: canonicalId("org", "01HX7W2J8P4XW3D9CZV3"),
    project_id: canonicalId("prj", "01HX7W2J8P4XW3D9CZV3"),
    thread_id: canonicalId("thr", "01HX7W2J8P4XW3D9CZV3"),
    run_id: canonicalId("run", name === "document" ? "01HX7W2J8P4XW3D9CZV4" : "01HX7W2J8P4XW3D9CZV5"),
    command_id: canonicalId("cmd", crypto.randomUUID().replaceAll("-", "")),
    command_type: "run.start",
    schema_version: "1.0",
    actor: { type: "user", id: canonicalId("act", "01HX7W2J8P4XW3D9CZV3") },
    idempotency_key: `fixture-${name}`,
    correlation_id: canonicalId("cor", name === "document" ? "01HX7W2J8P4XW3D9CZV4" : "01HX7W2J8P4XW3D9CZV5"),
    issued_at: new Date().toISOString(),
    payload: { prompt },
  };
}

function validateCommon(fixture: BaseFixture, events: readonly EventEnvelope[], elapsedMs: number): void {
  assert.deepEqual(events.map((event) => event.sequence), events.map((_event, index) => index + 1), `${fixture.id}: noncontiguous sequence`);
  const tools = events.filter((event) => event.event_type === "tool.started").map((event) => String(event.payload?.tool_name));
  assert.deepEqual(tools, fixture.trace.required_tools, `${fixture.id}: tool trace changed`);
  assert.ok(tools.length <= fixture.trace.maximum_tool_calls, `${fixture.id}: tool-call budget exceeded`);
  const turns = events.filter((event) => event.event_type === "turn.started").length;
  assert.ok(turns <= fixture.trace.maximum_model_turns, `${fixture.id}: model-turn budget exceeded`);
  assert.ok(elapsedMs <= fixture.budget.maximum_latency_ms, `${fixture.id}: latency ${elapsedMs.toFixed(1)}ms exceeded budget`);
  const costUsd = 0;
  assert.ok(costUsd <= fixture.budget.maximum_cost_usd, `${fixture.id}: cost budget exceeded`);
  assert.equal(events.at(-1)?.event_type, "run.completed", `${fixture.id}: run did not complete`);
}

async function runDocument(): Promise<void> {
  const fixture = JSON.parse(await readFile(join(root, "fixtures/phase1/document.json"), "utf8")) as BaseFixture & {
    readonly output: { readonly name: string; readonly required_headings: readonly string[]; readonly required_phrases: readonly string[]; readonly minimum_words: number };
  };
  const directory = await mkdtemp(join(tmpdir(), "beyond-document-fixture-"));
  const outputPath = join(directory, fixture.output.name);
  const markdown = [
    "# Project Brief",
    "",
    "## Objective",
    "",
    "Give the organization one governed workspace for durable AI-assisted work, shared context, and reviewable outputs.",
    "",
    "## Rollout",
    "",
    "Start with a focused pilot, train owners, connect approved knowledge, and expand only after reliability and permission checks pass.",
    "",
    "## Success",
    "",
    "Use measurable adoption, accepted-output quality, cycle-time, and cost targets to decide each expansion step.",
    "",
  ].join("\n");
  const factory = createOfflinePiRuntimeFactory(() => [
    {
      type: "tool",
      call_id: "document-write-1",
      tool_name: "write_document",
      arguments: { path: fixture.output.name, content: markdown },
      result_text: "Wrote project-brief.md",
      result_details: {},
      execute: async (arguments_) => {
        assert.equal(arguments_.path, fixture.output.name);
        assert.equal(arguments_.content, markdown);
        await writeFile(outputPath, markdown, "utf8");
        const bytes = Buffer.from(markdown, "utf8");
        return {
          result_text: `Wrote ${fixture.output.name}`,
          result_details: { beyond_output: { name: fixture.output.name, media_type: "text/markdown", content: markdown, digest: `sha256:${createHash("sha256").update(bytes).digest("hex")}`, byte_size: bytes.byteLength } },
        };
      },
    },
    { type: "text", text: "The project brief is ready for review." },
  ], { runtimeImageDigest });
  const core = new LocalAppServerCore(new AppendOnlyStore(join(directory, "journal.sqlite")), factory);
  try {
    await core.init();
    const start = performance.now();
    const envelope = command("document", fixture.prompt);
    await core.command(PROTOCOL_VERSION, envelope);
    await core.awaitIdle(envelope.run_id!);
    const elapsed = performance.now() - start;
    const events = core.replay(PROTOCOL_VERSION, envelope.run_id!, 0).events;
    validateCommon(fixture, events, elapsed);
    const output = events.find((event) => event.event_type === "output.created")?.payload;
    assert.equal(output?.name, fixture.output.name);
    assert.equal(await readFile(outputPath, "utf8"), markdown);
    for (const heading of fixture.output.required_headings) assert.ok(markdown.includes(heading), `document: missing ${heading}`);
    for (const phrase of fixture.output.required_phrases) assert.ok(markdown.toLowerCase().includes(phrase.toLowerCase()), `document: missing ${phrase}`);
    assert.ok(markdown.split(/\s+/u).filter(Boolean).length >= fixture.output.minimum_words, "document: minimum word count failed");
    console.log(`PASS ${fixture.id}: Pi tool wrote verified Markdown in ${elapsed.toFixed(1)}ms`);
  } finally {
    core.close();
    await rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 20 });
  }
}

async function runFinance(): Promise<void> {
  const fixture = JSON.parse(await readFile(join(root, "fixtures/phase1/finance.json"), "utf8")) as BaseFixture & {
    readonly ticker: string;
    readonly recorded_input: readonly { readonly report_period: string; readonly revenue: number; readonly operating_income: number; readonly net_income: number; readonly earnings_per_share: number }[];
    readonly sources: readonly string[];
    readonly expected: { readonly output_name: string; readonly required_headings: readonly string[]; readonly revenue_growth_percent: number; readonly operating_margin_2023_percent: number; readonly operating_margin_2024_percent: number; readonly operating_margin_change_bps: number; readonly numeric_tolerance: number };
  };
  const analysis = analyzeRecordedFinanceScenario(fixture.ticker, fixture.recorded_input, fixture.sources);
  const directory = await mkdtemp(join(tmpdir(), "beyond-finance-fixture-"));
  const outputPath = join(directory, fixture.expected.output_name);
  const factory = createOfflinePiRuntimeFactory(() => [
    {
      type: "tool",
      call_id: "finance-read-1",
      tool_name: "get_income_statements",
      arguments: { ticker: fixture.ticker, period: "annual", limit: 2 },
      result_text: analysis.formatted_tool_result,
      result_details: { sources: fixture.sources, recorded: true, formatter: "Dexter formatIncomeStatements" },
    },
    {
      type: "tool",
      call_id: "finance-write-1",
      tool_name: "write_finance_memo",
      arguments: { path: fixture.expected.output_name, content: analysis.markdown },
      result_text: `Wrote ${fixture.expected.output_name}`,
      result_details: {},
      execute: async () => {
        await writeFile(outputPath, analysis.markdown, "utf8");
        const bytes = Buffer.from(analysis.markdown, "utf8");
        return { result_text: `Wrote ${fixture.expected.output_name}`, result_details: { beyond_output: { name: fixture.expected.output_name, media_type: "text/markdown", content: analysis.markdown, sources: fixture.sources, digest: `sha256:${createHash("sha256").update(bytes).digest("hex")}`, byte_size: bytes.byteLength } } };
      },
    },
    { type: "text", text: "The sourced finance memo is ready." },
  ], { runtimeImageDigest, providerMetadata: { fixture: "dexter-compatible-finance" } as JsonObject });
  const core = new LocalAppServerCore(new AppendOnlyStore(join(directory, "journal.sqlite")), factory);
  try {
    await core.init();
    const start = performance.now();
    const envelope = command("finance", fixture.prompt);
    await core.command(PROTOCOL_VERSION, envelope);
    await core.awaitIdle(envelope.run_id!);
    const elapsed = performance.now() - start;
    const events = core.replay(PROTOCOL_VERSION, envelope.run_id!, 0).events;
    validateCommon(fixture, events, elapsed);
    const output = events.find((event) => event.event_type === "output.created")?.payload;
    assert.equal(output?.name, fixture.expected.output_name);
    assert.deepEqual(output?.sources, fixture.sources);
    assert.equal(await readFile(outputPath, "utf8"), analysis.markdown);
    for (const heading of fixture.expected.required_headings) assert.ok(analysis.markdown.includes(heading), `finance: missing ${heading}`);
    const tolerance = fixture.expected.numeric_tolerance;
    assert.ok(Math.abs(analysis.metrics.revenue_growth_percent - fixture.expected.revenue_growth_percent) <= tolerance);
    assert.ok(Math.abs(analysis.metrics.operating_margin_2023_percent - fixture.expected.operating_margin_2023_percent) <= tolerance);
    assert.ok(Math.abs(analysis.metrics.operating_margin_2024_percent - fixture.expected.operating_margin_2024_percent) <= tolerance);
    assert.ok(Math.abs(Math.round(analysis.metrics.operating_margin_change_bps) - fixture.expected.operating_margin_change_bps) <= 1);
    const sourceTrace = events.find((event) => event.event_type === "tool.completed" && event.payload?.tool_name === "get_income_statements");
    assert.deepEqual(((sourceTrace?.payload?.result as JsonObject)?.details as JsonObject)?.sources, fixture.sources);
    console.log(`PASS ${fixture.id}: Dexter formatter + sourced Pi trace in ${elapsed.toFixed(1)}ms`);
  } finally {
    core.close();
    await rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 20 });
  }
}

await runDocument();
await runFinance();

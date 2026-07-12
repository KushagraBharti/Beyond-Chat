#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const manifestPath = fileURLToPath(new URL("./environment-manifest.json", import.meta.url));
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

function usage(message) {
  if (message) console.error(message);
  console.error("Usage: node scripts/config/validate-environment.mjs --environment <local|preview|production> --surface <name> [--file <path>]... [--format text|json]");
  process.exit(message ? 2 : 0);
}

const args = process.argv.slice(2);
const options = { files: [], format: "text" };
for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  if (argument === "--help" || argument === "-h") usage();
  if (argument === "--file") {
    options.files.push(args[++index]);
  } else if (argument === "--environment") {
    options.environment = args[++index];
  } else if (argument === "--surface") {
    options.surface = args[++index];
  } else if (argument === "--format") {
    options.format = args[++index];
  } else {
    usage(`Unknown argument: ${argument}`);
  }
}

if (!manifest.environments.includes(options.environment)) usage("Invalid or missing --environment.");
if (!manifest.surfaces.includes(options.surface)) usage("Invalid or missing --surface.");
if (!["text", "json"].includes(options.format)) usage("Invalid --format.");

const sourcesByKey = new Map();
if (options.files.length) {
  for (const path of options.files) {
    const content = await readFile(path, "utf8");
    for (const line of content.split(/\r?\n/u)) {
      const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/u);
      if (!match) continue;
      const sources = sourcesByKey.get(match[1]) ?? [];
      sources.push(path);
      sourcesByKey.set(match[1], sources);
    }
  }
} else {
  for (const key of Object.keys(process.env)) sourcesByKey.set(key, ["process environment"]);
}

const declared = new Map(manifest.variables.map((variable) => [variable.name, variable]));
const present = [...sourcesByKey.keys()].sort();
const missing = [];
const unknown = [];
const conflicts = [];
const forbidden = [];

for (const variable of manifest.variables) {
  if (!variable.surfaces.includes(options.surface)) continue;
  const requirement = variable.environments[options.environment];
  const gateEnabled = variable.featureGate ? manifest.featureGates[variable.featureGate][options.environment] : true;
  const isRequired = requirement === "required" || (requirement === "conditional" && gateEnabled);
  if (isRequired && !sourcesByKey.has(variable.name) && !(variable.aliases ?? []).some((alias) => sourcesByKey.has(alias))) {
    missing.push(variable.name);
  }
  if (requirement === "forbidden" && sourcesByKey.has(variable.name)) forbidden.push(variable.name);
  if (variable.aliases?.some((alias) => sourcesByKey.has(variable.name) && sourcesByKey.has(alias))) {
    conflicts.push(`${variable.name} + ${variable.aliases.filter((alias) => sourcesByKey.has(alias)).join(" + ")}`);
  }
}

for (const [key, sources] of sourcesByKey) {
  const managed = manifest.providerManagedPatterns.some((pattern) => new RegExp(pattern, "u").test(key));
  if (!declared.has(key) && !managed) unknown.push(key);
  if (new Set(sources).size > 1) conflicts.push(`${key} assigned by multiple files`);
  const variable = declared.get(key);
  if (variable && !variable.surfaces.includes(options.surface)) conflicts.push(`${key} is not allowed on ${options.surface}`);
}

const result = {
  environment: options.environment,
  surface: options.surface,
  sources: options.files.length ? options.files : ["process environment"],
  summary: { present: present.length, missing: missing.length, unknown: unknown.length, conflicts: conflicts.length, forbidden: forbidden.length },
  present,
  missing: missing.sort(),
  unknown: unknown.sort(),
  conflicts: [...new Set(conflicts)].sort(),
  forbidden: forbidden.sort()
};

if (options.format === "json") {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Environment: ${result.environment}`);
  console.log(`Surface: ${result.surface}`);
  console.log(`Sources: ${result.sources.join(", ")}`);
  for (const category of ["present", "missing", "unknown", "conflicts", "forbidden"]) {
    console.log(`${category[0].toUpperCase()}${category.slice(1)} (${result[category].length}):${result[category].length ? ` ${result[category].join(", ")}` : " none"}`);
  }
}

process.exitCode = missing.length || unknown.length || conflicts.length || forbidden.length ? 1 : 0;

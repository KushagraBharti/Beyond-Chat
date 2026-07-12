import { readFile, readdir } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { REPOSITORY_ROOT, toPosixPath } from "./lib.mjs";

const SOURCE_EXTENSIONS = new Set([".cjs", ".cts", ".js", ".jsx", ".mjs", ".mts", ".py", ".ts", ".tsx"]);
const SKIP_DIRECTORIES = new Set([
	".git",
	".venv",
	"coverage",
	"demo-data",
	"dist",
	"docs",
	"final-submission",
	"frontend-mock",
	"node_modules",
	"old-docs",
	"reference",
	"scripts",
	"vendor",
]);
const ALLOWED_PREFIX = "packages/pi-runtime-adapter/";
const FORBIDDEN = /@earendil-works\/pi-(?:agent-core|ai|coding-agent|orchestrator|tui)|vendor[\\/]pi[\\/]upstream/u;
const violations = [];

async function visit(directory) {
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		if (entry.isDirectory() && SKIP_DIRECTORIES.has(entry.name)) continue;
		const absolute = resolve(directory, entry.name);
		const rel = toPosixPath(relative(REPOSITORY_ROOT, absolute));
		if (entry.isDirectory()) {
			await visit(absolute);
			continue;
		}
		if (!entry.isFile()) continue;
		const extension = entry.name.slice(entry.name.lastIndexOf("."));
		if (!SOURCE_EXTENSIONS.has(extension) || rel.startsWith(ALLOWED_PREFIX)) continue;
		const lines = (await readFile(absolute, "utf8")).split(/\r?\n/u);
		for (let index = 0; index < lines.length; index += 1) {
			if (FORBIDDEN.test(lines[index])) violations.push(`${rel}:${index + 1}`);
		}
	}
}

await visit(REPOSITORY_ROOT);
if (violations.length > 0) {
	throw new Error(
		`Pi imports must be isolated to ${ALLOWED_PREFIX}. Violations:\n${violations.map((item) => `- ${item}`).join("\n")}`,
	);
}
console.log(`Pi adapter import boundary is clean; only ${ALLOWED_PREFIX} may import Pi.`);

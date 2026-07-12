import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { PI_UPSTREAM, REPOSITORY_ROOT, run, SELECTED_BUILD_STEPS } from "./lib.mjs";

const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 19)) {
	throw new Error(`Pi requires Node >=22.19.0; found ${process.version}`);
}

run(process.execPath, [resolve(REPOSITORY_ROOT, "scripts/pi/verify-provenance.mjs")]);
run("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: PI_UPSTREAM });
for (const step of SELECTED_BUILD_STEPS) {
	console.log(`Building ${step.label}`);
	run("npm", step.args, { cwd: PI_UPSTREAM });
}

for (const output of [
	"packages/tui/dist/index.js",
	"packages/ai/dist/index.js",
	"packages/agent/dist/index.js",
	"packages/coding-agent/dist/index.js",
]) {
	await access(resolve(PI_UPSTREAM, output));
}
run(process.execPath, [resolve(REPOSITORY_ROOT, "scripts/pi/verify-provenance.mjs")]);
console.log("Selected Pi packages built successfully; pi-tui was a compile-only prerequisite.");

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

export const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const PI_ROOT = resolve(REPOSITORY_ROOT, "vendor/pi");
export const PI_UPSTREAM = resolve(PI_ROOT, "upstream");
export const PI_PROVENANCE = resolve(PI_ROOT, "PROVENANCE.json");
export const PI_MANIFEST = resolve(PI_ROOT, "UPSTREAM_FILES.sha256");
export const PI_SBOM = resolve(PI_ROOT, "SBOM.spdx.json");
export const PI_PATCH_SERIES = resolve(PI_ROOT, "patches/series.json");

export const SELECTED_RUNTIME_PACKAGES = [
	{
		name: "@earendil-works/pi-ai",
		path: "packages/ai",
		version: "0.80.6",
	},
	{
		name: "@earendil-works/pi-agent-core",
		path: "packages/agent",
		version: "0.80.6",
	},
	{
		name: "@earendil-works/pi-coding-agent",
		path: "packages/coding-agent",
		version: "0.80.6",
	},
];

// pi-coding-agent currently references pi-tui declarations. Build it so the
// selected headless modules can compile, but do not package or import it in the
// Beyond runtime.
export const COMPILE_ONLY_PACKAGES = [
	{
		name: "@earendil-works/pi-tui",
		path: "packages/tui",
		version: "0.80.6",
	},
];

export const SELECTED_BUILD_STEPS = [
	{
		label: "@earendil-works/pi-tui (compile-only)",
		args: ["run", "build", "--workspace", "@earendil-works/pi-tui"],
	},
	{
		label: "@earendil-works/pi-ai (offline, pinned generated catalogs)",
		args: ["exec", "--", "tsgo", "-p", "packages/ai/tsconfig.build.json"],
	},
	{
		label: "@earendil-works/pi-agent-core",
		args: ["run", "build", "--workspace", "@earendil-works/pi-agent-core"],
	},
	{
		label: "@earendil-works/pi-coding-agent",
		args: ["run", "build", "--workspace", "@earendil-works/pi-coding-agent"],
	},
];

export const WINDOWS_TEST_EXCEPTIONS = {
	"@earendil-works/pi-agent-core": [
		"test/harness/nodejs-env.test.ts",
		"test/harness/prompt-templates.test.ts",
		"test/harness/skills.test.ts",
	],
	"@earendil-works/pi-coding-agent": [
		"test/config.test.ts",
		"test/footer-width.test.ts",
		"test/interactive-mode-suspend.test.ts",
		"test/package-command-paths.test.ts",
		"test/package-manager.test.ts",
		"test/sdk-session-manager.test.ts",
		"test/tools.test.ts",
		"test/trust-manager.test.ts",
		"test/trust-selector.test.ts",
		"test/suite/regressions/2791-fswatch-error-crash.test.ts",
		"test/suite/regressions/3302-find-path-glob.test.ts",
	],
};

const TRANSIENT_SEGMENTS = new Set([
	".git",
	".cache",
	".turbo",
	"coverage",
	"dist",
	"node_modules",
]);

export function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

export function assertInside(parent, candidate, label = "path") {
	const normalizedParent = resolve(parent);
	const normalizedCandidate = resolve(candidate);
	const prefix = normalizedParent.endsWith(sep) ? normalizedParent : `${normalizedParent}${sep}`;
	assert(
		normalizedCandidate === normalizedParent || normalizedCandidate.startsWith(prefix),
		`${label} must stay inside ${normalizedParent}: ${normalizedCandidate}`,
	);
	return normalizedCandidate;
}

export async function readJson(path) {
	return JSON.parse(await readFile(path, "utf8"));
}

export async function sha256File(path) {
	const content = await readFile(path);
	return createHash("sha256").update(content).digest("hex");
}

export function sha256Text(value) {
	return createHash("sha256").update(value, "utf8").digest("hex");
}

export function toPosixPath(path) {
	return path.split(sep).join("/");
}

export function isTransientPath(relativePath) {
	return toPosixPath(relativePath)
		.split("/")
		.some((segment) => TRANSIENT_SEGMENTS.has(segment));
}

export async function listSourceFiles(root) {
	const files = [];

	async function visit(directory) {
		for (const entry of await readdir(directory, { withFileTypes: true })) {
			const absolute = resolve(directory, entry.name);
			const rel = toPosixPath(relative(root, absolute));
			if (isTransientPath(rel)) continue;
			if (entry.isDirectory()) {
				await visit(absolute);
			} else if (entry.isFile()) {
				files.push(rel);
			} else {
				throw new Error(`Unsupported filesystem entry in vendored source: ${rel}`);
			}
		}
	}

	await visit(root);
	return files.sort();
}

export async function createSourceManifest(root) {
	const paths = await listSourceFiles(root);
	const lines = [];
	for (const path of paths) {
		lines.push(`${await sha256File(resolve(root, path))}  ${path}`);
	}
	return `${lines.join("\n")}\n`;
}

export function parseManifest(value) {
	const records = new Map();
	for (const line of value.split(/\r?\n/u)) {
		if (!line) continue;
		assert(/^[a-f0-9]{64}  .+/u.test(line), `Malformed manifest line: ${line}`);
		const hash = line.slice(0, 64);
		const path = line.slice(66);
		assert(!records.has(path), `Duplicate manifest entry: ${path}`);
		records.set(path, hash);
	}
	return records;
}

export function run(name, args, options = {}) {
	let executable = name;
	let commandArgs = args;
	if (name === "npm") {
		const npmCli = resolve(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");
		if (existsSync(npmCli)) {
			executable = process.execPath;
			commandArgs = [npmCli, ...args];
		}
	}
	const result = spawnSync(executable, commandArgs, {
		cwd: options.cwd ?? REPOSITORY_ROOT,
		encoding: "utf8",
		stdio: options.capture ? "pipe" : "inherit",
		input: options.input,
		env: { ...process.env, ...options.env },
		maxBuffer: options.maxBuffer ?? 64 * 1024 * 1024,
	});
	if (result.error) throw result.error;
	if (result.status !== 0 && !options.allowFailure) {
		const details = options.capture ? `\n${result.stdout ?? ""}\n${result.stderr ?? ""}` : "";
		throw new Error(`${name} ${args.join(" ")} exited with ${result.status}${details}`);
	}
	return result;
}

export async function assertFile(path, label = path) {
	const info = await stat(path);
	assert(info.isFile(), `${label} must be a regular file`);
}

export function parseCliArgs(argv) {
	const parsed = { positional: [] };
	for (let index = 0; index < argv.length; index += 1) {
		const value = argv[index];
		if (!value.startsWith("--")) {
			parsed.positional.push(value);
			continue;
		}
		const [rawKey, inline] = value.slice(2).split("=", 2);
		if (inline !== undefined) {
			parsed[rawKey] = inline;
		} else if (argv[index + 1] && !argv[index + 1].startsWith("--")) {
			parsed[rawKey] = argv[index + 1];
			index += 1;
		} else {
			parsed[rawKey] = true;
		}
	}
	return parsed;
}

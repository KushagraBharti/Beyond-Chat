import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import {
	assert,
	createSourceManifest,
	parseManifest,
	parseCliArgs,
	PI_MANIFEST,
	PI_PROVENANCE,
	readJson,
	REPOSITORY_ROOT,
	run,
	SELECTED_BUILD_STEPS,
	SELECTED_RUNTIME_PACKAGES,
	sha256File,
	WINDOWS_TEST_EXCEPTIONS,
} from "./lib.mjs";

const args = parseCliArgs(process.argv.slice(2));
const provenance = await readJson(PI_PROVENANCE);
const candidate = args.candidate ?? provenance.source.commit;
assert(/^[a-f0-9]{40}$/u.test(candidate), "--candidate must be a full 40-character SHA");

const scratch = await mkdtemp(resolve(tmpdir(), "beyond-pi-rehearsal-"));
const candidateRoot = resolve(scratch, "candidate");
const startedAt = new Date().toISOString();
const evidence = {
	schemaVersion: 1,
	startedAt,
	baselineCommit: provenance.source.commit,
	candidateCommit: candidate,
	checks: {},
};

try {
	run(process.execPath, [
		resolve(REPOSITORY_ROOT, "scripts/pi/stage-upstream.mjs"),
		"--commit",
		candidate,
		"--destination",
		candidateRoot,
	]);
	evidence.checks.sourceStaged = true;

	const baselineManifest = parseManifest(await readFile(PI_MANIFEST, "utf8"));
	const candidateManifest = parseManifest(await createSourceManifest(candidateRoot));
	const added = [...candidateManifest.keys()].filter((path) => !baselineManifest.has(path));
	const removed = [...baselineManifest.keys()].filter((path) => !candidateManifest.has(path));
	const changed = [...candidateManifest.keys()].filter(
		(path) => baselineManifest.has(path) && baselineManifest.get(path) !== candidateManifest.get(path),
	);
	evidence.checks.sourceDiff = { added: added.length, removed: removed.length, changed: changed.length };
	evidence.checks.dependencyLock = {
		baselineSha256: await sha256File(resolve(REPOSITORY_ROOT, "vendor/pi/upstream/package-lock.json")),
		candidateSha256: await sha256File(resolve(candidateRoot, "package-lock.json")),
	};
	evidence.checks.dependencyLock.changed =
		evidence.checks.dependencyLock.baselineSha256 !== evidence.checks.dependencyLock.candidateSha256;

	const licenseHash = await sha256File(resolve(candidateRoot, "LICENSE"));
	evidence.checks.license = {
		spdx: "MIT",
		sha256: licenseHash,
		unchanged: licenseHash === provenance.license.sha256,
	};
	assert(evidence.checks.license.unchanged || args["allow-license-change"], "Candidate license changed; legal review required");

	evidence.packages = [];
	for (const expected of SELECTED_RUNTIME_PACKAGES) {
		const packageJson = await readJson(resolve(candidateRoot, expected.path, "package.json"));
		evidence.packages.push({ name: packageJson.name, version: packageJson.version, license: packageJson.license });
		assert(packageJson.name === expected.name, `Candidate omits ${expected.name}`);
		assert(packageJson.license === "MIT", `Candidate changes ${expected.name} license`);
	}

	run("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: candidateRoot });
	evidence.checks.cleanInstall = true;
	for (const step of SELECTED_BUILD_STEPS) {
		run("npm", step.args, { cwd: candidateRoot });
	}
	evidence.checks.selectedBuild = true;

	evidence.checks.selectedTests = {
		platform: process.platform,
		workspaces: [],
		platformExceptions: process.platform === "win32" ? WINDOWS_TEST_EXCEPTIONS : {},
		fullLinuxSuiteRequiredForPromotion: true,
	};
	for (const workspace of SELECTED_RUNTIME_PACKAGES.map((entry) => entry.name)) {
		const excluded = process.platform === "win32" ? (WINDOWS_TEST_EXCEPTIONS[workspace] ?? []) : [];
		const testArgs = ["test", "--workspace", workspace];
		if (excluded.length > 0) {
			testArgs.push("--");
			for (const path of excluded) testArgs.push("--exclude", path);
		}
		run("npm", testArgs, { cwd: candidateRoot });
		evidence.checks.selectedTests.workspaces.push({ workspace, excludedFiles: excluded.length });
	}
	evidence.checks.selectedTests.passed = true;

	const audit = run("npm", ["audit", "--omit", "dev", "--json"], {
		cwd: candidateRoot,
		capture: true,
		allowFailure: true,
	});
	const auditJson = JSON.parse(audit.stdout || "{}");
	evidence.checks.audit = {
		exitCode: audit.status,
		vulnerabilities: auditJson.metadata?.vulnerabilities ?? null,
	};
	const high = evidence.checks.audit.vulnerabilities?.high ?? 0;
	const critical = evidence.checks.audit.vulnerabilities?.critical ?? 0;
	assert(high === 0 && critical === 0, `Candidate has ${high} high and ${critical} critical production vulnerabilities`);

	evidence.completedAt = new Date().toISOString();
	evidence.result = "pass";
} catch (error) {
	evidence.completedAt = new Date().toISOString();
	evidence.result = "fail";
	evidence.error = error instanceof Error ? error.message : String(error);
	if (args.report) await writeFile(resolve(args.report), `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
	throw error;
} finally {
	await rm(scratch, { recursive: true, force: true });
}

if (args.report) {
	await writeFile(resolve(args.report), `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
}
console.log(JSON.stringify(evidence, null, 2));

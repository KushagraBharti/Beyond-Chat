import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
	assert,
	assertFile,
	COMPILE_ONLY_PACKAGES,
	createSourceManifest,
	PI_MANIFEST,
	PI_PATCH_SERIES,
	PI_PROVENANCE,
	PI_ROOT,
	PI_SBOM,
	PI_UPSTREAM,
	readJson,
	run,
	SELECTED_RUNTIME_PACKAGES,
	sha256File,
	sha256Text,
} from "./lib.mjs";

const provenance = await readJson(PI_PROVENANCE);
assert(provenance.schemaVersion === 1, "Unsupported Pi provenance schema");
assert(provenance.component === "pi", "Provenance component must be pi");
assert(provenance.source.repository === "https://github.com/earendil-works/pi", "Unexpected Pi repository");
assert(/^[a-f0-9]{40}$/u.test(provenance.source.commit), "Pi commit must be a full Git SHA-1");
assert(/^[a-f0-9]{40}$/u.test(provenance.source.tree), "Pi tree must be a full Git SHA-1");
assert(provenance.fork.baselineCommit === provenance.source.commit, "Initial fork baseline must equal upstream commit");
assert(provenance.fork.currentForkCommit === provenance.source.commit, "A zero-patch import must retain upstream commit identity");
assert(provenance.fork.remoteCreated === true, "A Beyond-controlled remote fork is required");
assert(provenance.fork.repository === "https://github.com/KushagraBharti/beyond-pi", "Unexpected Beyond fork repository");
assert(provenance.fork.parentRepository === provenance.source.repository, "Beyond fork parent must be canonical upstream");
assert(Number.isSafeInteger(provenance.fork.repositoryId), "Beyond fork repository ID must be immutable numeric metadata");
assert(provenance.license.spdx === "MIT", "Pi license must be recorded as MIT");
assert(!(await readdir(PI_UPSTREAM)).includes(".git"), "Vendored Pi must not contain nested Git metadata");

await assertFile(PI_MANIFEST, "Pi source manifest");
await assertFile(PI_SBOM, "Pi SPDX SBOM");
await assertFile(PI_PATCH_SERIES, "Pi patch series");

const generatedManifest = await createSourceManifest(PI_UPSTREAM);
const recordedManifest = await readFile(PI_MANIFEST, "utf8");
assert(generatedManifest === recordedManifest, "Vendored Pi tree does not match UPSTREAM_FILES.sha256");
const trackedPaths = recordedManifest
	.split(/\r?\n/u)
	.filter(Boolean)
	.map((line) => `vendor/pi/upstream/${line.slice(66)}`)
	.join("\n");
const ignoredSource = run("git", ["check-ignore", "--stdin"], {
	capture: true,
	allowFailure: true,
	input: `${trackedPaths}\n`,
});
assert(!ignoredSource.stdout.trim(), `Vendored source is hidden by .gitignore:\n${ignoredSource.stdout.trim()}`);
assert(
	sha256Text(recordedManifest) === provenance.integrity.manifestSha256,
	"UPSTREAM_FILES.sha256 digest differs from PROVENANCE.json",
);
assert(
	recordedManifest.split(/\r?\n/u).filter(Boolean).length === provenance.integrity.fileCount,
	"Vendored Pi file count differs from PROVENANCE.json",
);
assert(
	(await sha256File(resolve(PI_UPSTREAM, "LICENSE"))) === provenance.license.sha256,
	"Vendored Pi license digest differs from PROVENANCE.json",
);
assert(
	(await sha256File(resolve(PI_ROOT, provenance.license.copy))) === provenance.license.sha256,
	"Copied Pi license digest differs from PROVENANCE.json",
);
assert((await sha256File(PI_SBOM)) === provenance.integrity.sbomSha256, "SBOM digest differs from PROVENANCE.json");

for (const expected of [...SELECTED_RUNTIME_PACKAGES, ...COMPILE_ONLY_PACKAGES]) {
	const packageJson = await readJson(resolve(PI_UPSTREAM, expected.path, "package.json"));
	assert(packageJson.name === expected.name, `${expected.path} has unexpected package name`);
	assert(packageJson.version === expected.version, `${expected.name} has unexpected version`);
	assert(packageJson.license === "MIT", `${expected.name} has unexpected license`);
}

const patchSeries = await readJson(PI_PATCH_SERIES);
assert(patchSeries.schemaVersion === 1, "Unsupported Pi patch-series schema");
assert(Array.isArray(patchSeries.patches), "Pi patch series must contain an array");
for (const patch of patchSeries.patches) {
	assert(/^[a-f0-9]{64}$/u.test(patch.sha256), `Patch ${patch.file} has invalid digest`);
	assert((await sha256File(resolve(PI_ROOT, "patches", patch.file))) === patch.sha256, `Patch ${patch.file} digest mismatch`);
}
assert(
	patchSeries.patches.length === provenance.fork.patchCount,
	"Patch count differs between patch series and provenance",
);

const sbom = await readJson(PI_SBOM);
assert(sbom.spdxVersion === "SPDX-2.3", "Stored SBOM must be SPDX 2.3");
const unresolvedLicenses = sbom.packages.filter(
	(entry) => entry.licenseDeclared === "NOASSERTION" || entry.licenseDeclared === "NONE",
);
assert(unresolvedLicenses.length === 0, `Stored SBOM has unresolved licenses: ${unresolvedLicenses.map((entry) => entry.name).join(", ")}`);
const sbomPackages = new Set(sbom.packages.map((entry) => entry.name));
for (const expected of SELECTED_RUNTIME_PACKAGES) {
	assert(sbomPackages.has(expected.name), `Stored SBOM omits ${expected.name}`);
}

for (const reference of ["codex", "t3code"]) {
	const root = resolve(PI_ROOT, "../../reference", reference);
	const metadata = await readJson(resolve(root, "PROVENANCE.json"));
	assert(metadata.kind === "reference-only", `${reference} must remain reference-only`);
	assert(metadata.noCodeCopied === true, `${reference} must record that no code was copied`);
	assert(/^[a-f0-9]{40}$/u.test(metadata.commit), `${reference} commit must be full length`);
	assert(
		(await sha256File(resolve(root, metadata.license.file))) === metadata.license.sha256,
		`${reference} license digest mismatch`,
	);
	const allowed = new Set(["LICENSE.upstream.txt", "PROVENANCE.json", "REFERENCE.md"]);
	for (const entry of await readdir(root, { withFileTypes: true })) {
		assert(entry.isFile() && allowed.has(entry.name), `${reference} contains non-metadata content: ${entry.name}`);
	}
}

console.log(
	`Pi provenance verified: ${provenance.source.commit}, ${provenance.integrity.fileCount} source files, ` +
		`${sbom.packages.length} SPDX packages, ${patchSeries.patches.length} local patches.`,
);

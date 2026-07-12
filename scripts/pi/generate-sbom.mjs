import { writeFile } from "node:fs/promises";
import {
	assert,
	PI_SBOM,
	PI_UPSTREAM,
	run,
	SELECTED_RUNTIME_PACKAGES,
} from "./lib.mjs";

const args = [
	"sbom",
	"--package-lock-only",
	"--sbom-format",
	"spdx",
	"--sbom-type",
	"library",
	"--omit",
	"dev",
];
for (const packageInfo of SELECTED_RUNTIME_PACKAGES) {
	args.push("--workspace", packageInfo.name);
}

const result = run("npm", args, { cwd: PI_UPSTREAM, capture: true });
const sbom = JSON.parse(result.stdout);
assert(sbom.spdxVersion === "SPDX-2.3", `Unexpected SPDX version: ${sbom.spdxVersion}`);
const rootPackage = sbom.packages.find((entry) => entry.name === "pi-monorepo");
assert(rootPackage, "SBOM omits the Pi monorepo root package");
if (rootPackage.licenseDeclared === "NOASSERTION") {
	rootPackage.licenseDeclared = "MIT";
	rootPackage.licenseConcluded = "MIT";
	rootPackage.comment =
		"License conclusion derived from the pinned repository-root LICENSE recorded in vendor/pi/PROVENANCE.json.";
}
const packageNames = new Set(sbom.packages.map((entry) => entry.name));
for (const packageInfo of SELECTED_RUNTIME_PACKAGES) {
	assert(packageNames.has(packageInfo.name), `SBOM omits ${packageInfo.name}`);
}

if (process.argv.includes("--write")) {
	await writeFile(PI_SBOM, `${JSON.stringify(sbom, null, 2)}\n`, "utf8");
	console.log(`Wrote ${PI_SBOM} with ${sbom.packages.length} packages.`);
} else {
	console.log(`Generated a valid selected-package SPDX SBOM with ${sbom.packages.length} packages.`);
}

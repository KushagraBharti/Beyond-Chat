import { readFile, writeFile } from "node:fs/promises";
import { createSourceManifest, PI_MANIFEST, PI_UPSTREAM } from "./lib.mjs";

const generated = await createSourceManifest(PI_UPSTREAM);
if (process.argv.includes("--write")) {
	await writeFile(PI_MANIFEST, generated, "utf8");
	console.log(`Wrote ${PI_MANIFEST}`);
} else {
	const existing = await readFile(PI_MANIFEST, "utf8");
	if (existing !== generated) {
		throw new Error("Vendored Pi source differs from UPSTREAM_FILES.sha256");
	}
	console.log("Pi source manifest matches the vendored tree.");
}

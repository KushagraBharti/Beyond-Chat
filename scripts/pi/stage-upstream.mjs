import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import {
	assert,
	assertInside,
	parseCliArgs,
	readJson,
	run,
	SELECTED_RUNTIME_PACKAGES,
} from "./lib.mjs";

const args = parseCliArgs(process.argv.slice(2));
const commit = args.commit;
assert(typeof commit === "string" && /^[a-f0-9]{40}$/u.test(commit), "--commit must be a full 40-character SHA");
assert(typeof args.destination === "string", "--destination is required");

const destination = resolve(args.destination);
const allowedParent = resolve(tmpdir());
assertInside(allowedParent, destination, "staging destination");
assert(destination !== allowedParent, "staging destination cannot be the temporary-directory root");

const scratch = await mkdtemp(resolve(tmpdir(), "beyond-pi-stage-"));
const clone = resolve(scratch, "repo");
try {
	run("git", ["init", "--quiet", clone]);
	run("git", ["-C", clone, "remote", "add", "origin", "https://github.com/earendil-works/pi.git"]);
	run("git", ["-C", clone, "fetch", "--quiet", "--depth", "1", "origin", commit]);
	const resolvedCommit = run("git", ["-C", clone, "rev-parse", "FETCH_HEAD"], { capture: true }).stdout.trim();
	assert(resolvedCommit === commit, `Fetched ${resolvedCommit}, expected ${commit}`);
	run("git", ["-C", clone, "checkout", "--quiet", "--detach", "FETCH_HEAD"]);

	for (const expected of SELECTED_RUNTIME_PACKAGES) {
		const packageJson = await readJson(resolve(clone, expected.path, "package.json"));
		assert(packageJson.name === expected.name, `Candidate omits ${expected.name}`);
		assert(packageJson.license === "MIT", `Candidate changes ${expected.name} license`);
	}

	await rm(destination, { recursive: true, force: true });
	await mkdir(destination, { recursive: true });
	const archive = resolve(scratch, "pi.tar");
	run("git", ["-C", clone, "archive", "--format=tar", `--output=${archive}`, commit]);
	run("tar", ["-xf", archive, "-C", destination]);
	console.log(`Staged Pi ${commit} at ${destination}`);
} finally {
	await rm(scratch, { recursive: true, force: true });
}

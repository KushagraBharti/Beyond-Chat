import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { PI_PROVENANCE, readJson, REPOSITORY_ROOT } from "./lib.mjs";

const headers = {
	Accept: "application/vnd.github+json",
	"User-Agent": "Beyond-Chat-Provenance",
	...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

async function fetchOk(url) {
	const response = await fetch(url, { headers });
	if (!response.ok) throw new Error(`${url} returned ${response.status}`);
	return response;
}

function repositorySlug(url) {
	return new URL(url).pathname.replace(/^\//u, "").replace(/\.git$/u, "");
}

async function verifyRecord(label, metadata, licensePath) {
	const slug = repositorySlug(metadata.repository ?? metadata.source.repository);
	const commit = metadata.commit ?? metadata.source.commit;
	const tree = metadata.tree ?? metadata.source.tree;
	const license = metadata.license;
	const repository = await (await fetchOk(`https://api.github.com/repos/${slug}`)).json();
	assert(repository.html_url === `https://github.com/${slug}`, `${label} canonical repository changed`);
	assert(repository.license?.spdx_id === license.spdx, `${label} GitHub license metadata changed`);
	const commitRecord = await (await fetchOk(`https://api.github.com/repos/${slug}/commits/${commit}`)).json();
	assert(commitRecord.sha === commit, `${label} commit lookup mismatch`);
	assert(commitRecord.commit.tree.sha === tree, `${label} tree lookup mismatch`);

	const rawLicense = new Uint8Array(
		await (await fetchOk(`https://raw.githubusercontent.com/${slug}/${commit}/${licensePath}`)).arrayBuffer(),
	);
	const licenseHash = createHash("sha256").update(rawLicense).digest("hex");
	assert(licenseHash === license.sha256, `${label} upstream license digest mismatch`);

	for (const source of metadata.sourceReferences ?? []) {
		const body = new Uint8Array(
			await (await fetchOk(`https://raw.githubusercontent.com/${slug}/${commit}/${source.path}`)).arrayBuffer(),
		);
		const digest = createHash("sha256").update(body).digest("hex");
		assert(digest === source.sha256, `${label} reference digest mismatch: ${source.path}`);
	}
	console.log(`${label} online provenance verified at ${commit}.`);
}

await verifyRecord("Pi", await readJson(PI_PROVENANCE), "LICENSE");
const pi = await readJson(PI_PROVENANCE);
const forkSlug = repositorySlug(pi.fork.repository);
const fork = await (await fetchOk(`https://api.github.com/repos/${forkSlug}`)).json();
assert(fork.id === pi.fork.repositoryId, "Beyond Pi fork repository ID changed");
assert(fork.fork === true, "Beyond Pi repository is not a GitHub fork");
assert(fork.parent?.full_name === repositorySlug(pi.source.repository), "Beyond Pi fork parent changed");
const forkCommit = await (await fetchOk(`https://api.github.com/repos/${forkSlug}/commits/${pi.fork.currentForkCommit}`)).json();
assert(forkCommit.sha === pi.fork.currentForkCommit, "Beyond Pi fork commit lookup mismatch");
assert(forkCommit.commit.tree.sha === pi.source.tree, "Beyond Pi fork tree differs from recorded source tree");
console.log(`Beyond Pi fork verified at ${pi.fork.currentForkCommit}.`);
await verifyRecord(
	"Codex",
	await readJson(resolve(REPOSITORY_ROOT, "reference/codex/PROVENANCE.json")),
	"LICENSE",
);
await verifyRecord(
	"T3 Code",
	await readJson(resolve(REPOSITORY_ROOT, "reference/t3code/PROVENANCE.json")),
	"LICENSE",
);

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../../", import.meta.url);
const roots = ["packages/knowledge-plane", "connectors/knowledge", "fixtures/phase7", "scripts/phase7", "docs/architecture/knowledge"];
const secretPattern = /(?:sk-|AIza|ghp_|xox[baprs]-)[A-Za-z0-9_-]{16,}/;

async function walk(relative) {
  for (const entry of await readdir(new URL(`${relative}/`, root), { withFileTypes: true })) {
    const path = join(relative, entry.name).replaceAll("\\", "/");
    if (entry.isDirectory()) await walk(path);
    else if (secretPattern.test(await readFile(new URL(path, root), "utf8"))) throw new Error(`Potential secret in ${path}`);
  }
}

for (const directory of roots) await walk(directory);
console.log("Phase 7 secret-pattern scan passed.");

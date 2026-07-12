import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
const root = new URL("../../", import.meta.url); const roots = ["packages/skill-registry", "packages/tool-policy", "packages/app-registry", "packages/mcp-registry", "fixtures/phase6", "scripts/phase6", "docs/architecture/capabilities", "agents/skills"];
const pattern = /(?:sk-|AIza|ghp_|xox[baprs]-)[A-Za-z0-9_-]{16,}/;
async function walk(relative) { for (const entry of await readdir(new URL(relative + "/", root), { withFileTypes: true })) { const path = join(relative, entry.name).replaceAll("\\", "/"); if (entry.isDirectory()) await walk(path); else if ((await readFile(new URL(path, root), "utf8")).match(pattern)) throw new Error(`potential secret in ${path}`); } }
for (const directory of roots) await walk(directory); console.log("Phase 6 secret-pattern scan passed.");

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  path.join(here, "node_modules", "@proofscript", "lsp", "dist", "bin.js"),
  path.resolve(here, "..", "..", "..", "packages", "lsp", "dist", "bin.js"),
];
const target = candidates.find((candidate) => fs.existsSync(candidate));
if (!target) throw new Error("ProofScript LSP build not found. Run npm run build at the repository root or package @proofscript/lsp with the extension.");
await import(pathToFileURL(target).href);

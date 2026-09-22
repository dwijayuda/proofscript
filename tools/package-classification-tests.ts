import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checker = path.join(root, "tools", "check-package-classification.ts");
const manifestPath = path.join(root, "config", "package-classification.json");
const docPath = path.join(root, "docs", "PRODUCTION_PACKAGE_CLASSIFICATION.md");

function run(args) {
  return spawnSync(process.execPath, [checker, ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const ok = run([]);
assert.equal(ok.status, 0, `classification checker should pass\nstdout:\n${ok.stdout}\nstderr:\n${ok.stderr}`);
assert.match(ok.stdout, /package classification holds/);

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.trustClaim.label, "K3-TB trusted-boundary");
assert.equal(manifest.trustClaim.formalLean4EquivalenceProvenObligations, 0);
assert.ok(manifest.stablePsc1Path.includes("packages/kernel"));
assert.ok(manifest.stablePsc1Path.includes("packages/verifier"));
assert.ok(manifest.stablePsc1Path.includes("packages/backend-typescript"));
assert.ok(manifest.stablePsc1Path.includes("packages/runtime"));
assert.ok(manifest.packages.every((entry) => entry.path && entry.npmName && entry.tier && entry.lifecycle));

const byPath = new Map(manifest.packages.map((entry) => [entry.path, entry]));
assert.equal(byPath.get("packages/kernel")?.tier, "trusted");
assert.equal(byPath.get("packages/frontend-next")?.tier, "experimental");
assert.equal(byPath.get("packages/unified-bridge")?.tier, "bridge");
assert.equal(byPath.get("packages/backend-typescript")?.tier, "execution");

const doc = fs.readFileSync(docPath, "utf8");
assert.match(doc, /Canonical PSC-1 Production Path/);
assert.match(doc, /Trusted Packages/);
assert.match(doc, /Experimental and Bridge Packages/);
assert.match(doc, /Feature Promotion Gate/);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ps-package-classification-"));
const badManifestPath = path.join(tempDir, "bad.json");
const bad = structuredClone(manifest);
bad.packages = bad.packages.filter((entry) => entry.path !== "packages/kernel");
fs.writeFileSync(badManifestPath, `${JSON.stringify(bad, null, 2)}\n`);
const missingKernel = run(["--manifest", badManifestPath]);
assert.notEqual(missingKernel.status, 0, "checker should reject an omitted workspace package");
assert.match(`${missingKernel.stdout}\n${missingKernel.stderr}`, /not classified.*packages\/kernel|packages\/kernel.*not classified/);

const badStablePath = path.join(tempDir, "bad-stable.json");
const badStable = structuredClone(manifest);
for (const entry of badStable.packages) {
  if (entry.path === "packages/runtime") {
    entry.tier = "experimental";
    entry.lifecycle = "experimental";
    entry.productionRole = "misclassified runtime";
  }
}
fs.writeFileSync(badStablePath, `${JSON.stringify(badStable, null, 2)}\n`);
const unstableRuntime = run(["--manifest", badStablePath]);
assert.notEqual(unstableRuntime.status, 0, "checker should reject experimental packages in stable PSC-1 path");
assert.match(`${unstableRuntime.stdout}\n${unstableRuntime.stderr}`, /stable PSC-1 path.*packages\/runtime|packages\/runtime.*stable PSC-1 path/);

console.log("✓ package classification tests passed");

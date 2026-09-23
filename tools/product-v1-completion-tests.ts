#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(fs.readFileSync(
  path.join(root, "config", "proofscript-product-v1-completion.json"),
  "utf8",
));

assert.equal(manifest.schema, "proofscript.product-v1-completion/v1");
assert.equal(manifest.branch, "product/v1-completion");
assert.equal(manifest.baseCommit, "a7d223c421653e2a74753fbfe108c605d393465c");
assert.match(manifest.productVision, /JavaScript ecosystem/u);

const expectedPillars = ["V1-P0","V1-P1","V1-P2","V1-P3","V1-P4","V1-P5","V1-P6","V1-P7"];
assert.deepEqual(manifest.pillars.map((pillar) => pillar.id), expectedPillars);
assert.equal(manifest.pillars[0].status, "complete");
assert.ok(manifest.pillars.slice(1).some((pillar) => pillar.status !== "complete"));

assert.equal(manifest.baselineEvidence.cases, 6);
assert.equal(manifest.baselineEvidence.proved, 6);
assert.equal(manifest.baselineEvidence.failed, 0);
assert.equal(manifest.baselineEvidence.allProofsDischarged, true);
assert.equal(manifest.baselineEvidence.allStateModelsAdequate, true);
assert.equal(manifest.baselineEvidence.provenanceConsistent, true);
assert.equal(manifest.baselineEvidence.endtestStepsPassed, 8);

for (const phrase of [
  "full Lean 4 feature parity",
  "new Rust/Go/Java/PHP/Python/WASM backends",
  "unrelated historical KA assurance expansion",
]) {
  assert.ok(manifest.antiDrift.excludedUnlessBlocking.includes(phrase));
}

const softwareProfile = JSON.parse(fs.readFileSync(
  path.join(root, "config", "proofscript-software-profile-v0.json"),
  "utf8",
));
assert.equal(softwareProfile.smallnessBudget.minCoreConstructs, 20);
assert.equal(softwareProfile.smallnessBudget.maxCoreConstructs, 35);

const languageService = fs.readFileSync(
  path.join(root, "packages", "language-service", "src", "index.ts"),
  "utf8",
);
assert.match(languageService, /@proofscript\/compiler/u);
assert.doesNotMatch(languageService, /@proofscript\/frontend-next/u);

const lsp = fs.readFileSync(path.join(root, "packages", "lsp", "src", "index.ts"), "utf8");
assert.match(lsp, /compiler -> language-service -> language-worker -> lsp/u);
assert.match(lsp, /duplicateParser:\s*false/u);
assert.doesNotMatch(lsp, /@proofscript\/frontend-next/u);

const compiler = fs.readFileSync(
  path.join(root, "packages", "compiler", "src", "index.ts"),
  "utf8",
);
assert.match(compiler, /@proofscript\/frontend/u);
assert.doesNotMatch(compiler, /@proofscript\/frontend-next/u);

for (const required of [
  "packages/language-service/src/index.ts",
  "packages/language-worker/src/index.ts",
  "packages/language-worker/src/worker.ts",
  "packages/lsp/src/index.ts",
  "packages/monadic-lowering/src/stateful-adequacy-check.mjs",
]) {
  assert.ok(fs.existsSync(path.join(root, required)), `missing retained product asset: ${required}`);
}

console.log("PROOFSCRIPT_PRODUCT_V1_COMPLETION_CONTRACT=PASS");

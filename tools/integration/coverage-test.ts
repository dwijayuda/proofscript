import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listUnifiedCoreLowerings, UNIFIED_INTEGRATION_PROFILE } from "@proofscript/unified-bridge";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const coverage = JSON.parse(fs.readFileSync(path.join(root, "coverage/proofscript-unified-coverage.json"), "utf8"));
assert.equal(coverage.schema, "proofscript.coverage/v1");
assert.equal(coverage.checkpoint, UNIFIED_INTEGRATION_PROFILE);
assert.equal(coverage.coreFormat, 71);
assert.equal(coverage.kernelProfile, "KERNEL-level-instantiation-conformance1");
assert.equal(coverage.policy.unsupportedFailsClosed, true);

const ids = new Set();
for (const feature of coverage.features) {
  assert.ok(feature.id && typeof feature.id === "string");
  assert.ok(["unified", "partial", "frontend-only", "unsupported"].includes(feature.status), `invalid status ${feature.status}`);
  assert.equal(ids.has(feature.id), false, `duplicate coverage id ${feature.id}`);
  ids.add(feature.id);
}
const bySemantic = new Map(coverage.features.filter(f => f.semanticId).map(f => [f.semanticId, f]));
for (const descriptor of listUnifiedCoreLowerings()) {
  const row = bySemantic.get(descriptor.semanticId);
  assert.ok(row, `coverage matrix missing registered Core lowering ${descriptor.semanticId}`);
  assert.equal(row.status, descriptor.status, `coverage status drift for ${descriptor.semanticId}`);
  assert.equal(row.trust, descriptor.trust, `coverage trust drift for ${descriptor.semanticId}`);
}
console.log(`✓ coverage matrix validated (${coverage.features.length} features; ${listUnifiedCoreLowerings().length} registered Core operation lowerings)`);

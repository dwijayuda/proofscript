#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dir = path.join(root, "specs", "language", "conformance-v0.6.1");

function readJson(rel: string) {
  return JSON.parse(fs.readFileSync(path.join(dir, rel), "utf8"));
}

function readJsonl(rel: string) {
  return fs.readFileSync(path.join(dir, rel), "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try { return JSON.parse(line); }
      catch (error) { throw new Error(`${rel}:${index + 1}: invalid JSON: ${String(error)}`); }
    });
}

const registry = readJson("feature-registry.json");
const schema = readJson("feature-registry.schema.json");
const positive = readJsonl("cases/positive.jsonl");
const negative = readJsonl("cases/negative.jsonl");
const lowering = readJsonl("cases/lowering.jsonl");
const expectedLean = fs.readFileSync(path.join(dir, "expected", "positive-lowerings.lean"), "utf8");

assert.equal(registry.schema_version, "0.6.1");
assert.equal(registry.semantic_baseline.lean_version, "4.33.1");
assert.equal(registry.semantic_baseline.lean_commit, "819816b2e0a3bf405af45ae5c7af2491d8f5bee6");
assert.equal(registry.claim_ceiling, "S1-specified");
assert.equal(schema.properties.schema_version.const, "0.6.1");

const featureIds = registry.features.map((feature: any) => feature.id);
assert.equal(new Set(featureIds).size, featureIds.length, "feature IDs must be unique");
assert.equal(featureIds.length, 15, "v0.6.1 compiler-ready registry must contain 15 entries: 1 inherited L, 11 admitted D/E, and 3 registered X exclusions");
const classCounts = registry.features.reduce((counts: Record<string, number>, feature: any) => {
  counts[feature.class] = (counts[feature.class] ?? 0) + 1;
  return counts;
}, {});
assert.deepEqual(classCounts, { L: 1, D: 5, E: 6, X: 3 }, "v0.6.1 registry class counts must remain explicit");

const registered = new Set(featureIds);
for (const item of positive) {
  assert.ok(item.id && item.feature && item.source && item.expected_lean, `positive case must be complete: ${JSON.stringify(item)}`);
  assert.ok(registered.has(item.feature), `positive case ${item.id} references unregistered feature ${item.feature}`);
}
for (const item of negative) {
  assert.ok(item.id && item.feature && item.source && item.reason, `negative case must be complete: ${JSON.stringify(item)}`);
  assert.ok(registered.has(item.feature), `negative case ${item.id} references unregistered feature/exclusion ${item.feature}`);
}
for (const item of lowering) {
  assert.ok(item.id && item.feature && item.source && item.canonical_lean, `lowering case must be complete: ${JSON.stringify(item)}`);
  assert.ok(registered.has(item.feature), `lowering case ${item.id} references unregistered feature ${item.feature}`);
}

const positiveById = new Map(positive.map((item: any) => [item.id, item]));
const loweringById = new Map(lowering.map((item: any) => [item.id, item]));
assert.deepEqual([...loweringById.keys()].sort(), [...positiveById.keys()].sort(), "positive/lowering case IDs must match");

for (const [id, item] of positiveById) {
  const lower: any = loweringById.get(id);
  assert.equal(lower.feature, (item as any).feature, `${id}: feature mismatch`);
  assert.equal(lower.source, (item as any).source, `${id}: source mismatch`);
  assert.equal(lower.canonical_lean, (item as any).expected_lean, `${id}: canonical lowering mismatch`);
  assert.ok(expectedLean.includes((item as any).expected_lean), `${id}: expected Lean corpus does not contain canonical lowering`);
}

const allCaseIds = [...positive, ...negative].map((item: any) => item.id);
assert.equal(new Set(allCaseIds).size, allCaseIds.length, "positive/negative case IDs must be globally unique");

console.log(JSON.stringify({
  status: "PASS",
  conformance: "C0",
  reference: "ProofScript v0.6.1",
  registeredFeatures: featureIds.length,
  positiveCases: positive.length,
  negativeCases: negative.length,
  loweringCases: lowering.length,
}, null, 2));

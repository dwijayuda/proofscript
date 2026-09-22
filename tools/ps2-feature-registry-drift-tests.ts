#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SURFACE_FEATURE_IDS } from "@proofscript/syntax";

const root = path.resolve(import.meta.dirname, "..");
const conformance = path.join(root, "specs", "language", "conformance-v0.6.1");
const registry = JSON.parse(fs.readFileSync(path.join(conformance, "feature-registry.json"), "utf8"));

const registeredOwned = registry.features
  .filter((feature: any) => (feature.class === "D" || feature.class === "E") && feature.status === "admitted-S1")
  .map((feature: any) => feature.id)
  .sort();

const productionOwned = [...SURFACE_FEATURE_IDS].sort();

assert.deepEqual(
  productionOwned,
  registeredOwned,
  "production-owned surface feature IDs must exactly match the normative admitted D/E registry",
);

const positive = readJsonl(path.join(conformance, "cases", "positive.jsonl"));
const positiveFeatures = new Set(positive.map((item: any) => item.feature));
for (const feature of registeredOwned) {
  assert.ok(
    positiveFeatures.has(feature),
    `registered production feature ${feature} must have at least one normative positive conformance case`,
  );
}

const negative = readJsonl(path.join(conformance, "cases", "negative.jsonl"));
const excluded = new Set(
  registry.features
    .filter((feature: any) => feature.class === "X")
    .map((feature: any) => feature.id),
);
for (const item of negative) {
  if (String(item.feature).startsWith("X-")) {
    assert.ok(excluded.has(item.feature), `negative corpus references unregistered X feature ${item.feature}`);
  }
}

console.log(JSON.stringify({
  status: "PASS",
  reference: "ProofScript v0.6.1",
  registeredOwned,
  productionOwned,
  positiveCoverage: registeredOwned.length,
}, null, 2));

function readJsonl(file: string): any[] {
  return fs.readFileSync(file, "utf8")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

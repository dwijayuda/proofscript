#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SURFACE_FEATURE_IDS } from "@proofscript/syntax";
import { lowerOwnedSourceToCanonicalLean, parseSource } from "@proofscript/parser";
import { referenceLower, referenceParse } from "../reference/v061/frontend.ts";

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

/**
 * The v0.6.1 JSONL format records one primary feature per case. D-DECL-SEMI is
 * intentionally cross-cutting: its semicolon terminator/separator syntax appears
 * inside cases whose primary feature is a declaration/body overlay. Do not mutate
 * the released corpus just to give this presentation feature a synthetic primary case.
 */
const crossCuttingPositiveEvidence = new Map<string, boolean>([
  [
    "D-DECL-SEMI",
    positive.some((item: any) => item.id === "const-value" && /;\s*$/u.test(String(item.source)))
      && positive.some((item: any) => item.id === "structure-body" && /\{[\s\S]*;[\s\S]*\}/u.test(String(item.source))),
  ],
]);

const supplementalOwnedFeatureEvidence = new Map<string, boolean>([
  [
    "E-CLASS-BODY",
    (() => {
      const source = "class Box where { value : Nat; }";
      const production = parseSource(source);
      const productionFeatures = production.ownedFeatures.map((use) => use.feature);
      const reference = referenceParse(source);
      if (reference.kind !== "proofscript" || reference.feature !== "E-CLASS-BODY") return false;
      const productionLean = lowerOwnedSourceToCanonicalLean(source, "E-CLASS-BODY");
      const referenceLean = referenceLower(source).leanText;
      return productionFeatures.includes("E-CLASS-BODY") && productionLean === referenceLean;
    })(),
  ],
]);

for (const feature of registeredOwned) {
  assert.ok(
    positiveFeatures.has(feature)
      || crossCuttingPositiveEvidence.get(feature) === true
      || supplementalOwnedFeatureEvidence.get(feature) === true,
    `registered production feature ${feature} must have normative primary, cross-cutting, or supplemental production/reference evidence`,
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
  primaryPositiveFeatures: [...positiveFeatures].filter((feature) => registeredOwned.includes(feature)).sort(),
  crossCuttingPositiveFeatures: [...crossCuttingPositiveEvidence.entries()].filter(([, ok]) => ok).map(([feature]) => feature).sort(),
  supplementalOwnedFeatures: [...supplementalOwnedFeatureEvidence.entries()].filter(([, ok]) => ok).map(([feature]) => feature).sort(),
  positiveCoverage: registeredOwned.length,
}, null, 2));

function readJsonl(file: string): any[] {
  return fs.readFileSync(file, "utf8")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

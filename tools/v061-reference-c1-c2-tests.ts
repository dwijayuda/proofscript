#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  referenceLower,
  referenceParse,
  type ReferenceFeatureId,
} from "../reference/v061/frontend.ts";

const root = path.resolve(import.meta.dirname, "..");
const conformanceDir = path.join(root, "docs", "reference", "proofscript-language-reference-v0.6.1", "conformance");
const positive = readJsonl(path.join(conformanceDir, "cases", "positive.jsonl"));
const negative = readJsonl(path.join(conformanceDir, "cases", "negative.jsonl"));
const lowering = readJsonl(path.join(conformanceDir, "cases", "lowering.jsonl"));

const c1Failures: unknown[] = [];

for (const item of positive) {
  const result = referenceParse(item.source);
  if (result.kind !== "proofscript") {
    c1Failures.push({
      id: item.id,
      expected: "accept",
      actual: result.kind,
      ...(result.kind === "error" ? { code: result.code, message: result.message } : {}),
    });
    continue;
  }
  if (result.feature !== item.feature) {
    c1Failures.push({
      id: item.id,
      expectedFeature: item.feature,
      actualFeature: result.feature,
    });
  }
}

for (const item of negative) {
  const result = referenceParse(item.source);
  if (result.kind !== "error") {
    c1Failures.push({
      id: item.id,
      expected: "reject",
      actual: result.kind,
      ...(result.kind === "proofscript" ? { actualFeature: result.feature } : {}),
    });
  }
}

assert.deepEqual(c1Failures, [], `v0.6.1 reference C1 failures:\n${JSON.stringify(c1Failures, null, 2)}`);

const c2Failures: unknown[] = [];
for (const item of lowering) {
  try {
    const result = referenceLower(item.source);
    if (result.leanText !== item.canonical_lean) {
      c2Failures.push({
        id: item.id,
        expected: item.canonical_lean,
        actual: result.leanText,
      });
    }
    if (!result.featureIds.includes(item.feature as ReferenceFeatureId)) {
      c2Failures.push({
        id: item.id,
        expectedFeature: item.feature,
        actualFeatures: result.featureIds,
      });
    }
    if (result.relation !== "SyntaxEq") {
      c2Failures.push({
        id: item.id,
        expectedRelation: "SyntaxEq",
        actualRelation: result.relation,
      });
    }
  } catch (error) {
    c2Failures.push({
      id: item.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

assert.deepEqual(c2Failures, [], `v0.6.1 reference C2 failures:\n${JSON.stringify(c2Failures, null, 2)}`);

console.log(JSON.stringify({
  status: "PASS",
  reference: "ProofScript v0.6.1",
  c1: {
    status: "PASS",
    positiveAccepted: positive.length,
    negativeRejected: negative.length,
    total: positive.length + negative.length,
  },
  c2: {
    status: "PASS",
    canonicalLoweringsMatched: lowering.length,
    total: lowering.length,
  },
  independence: "reference/v061/frontend.ts imports no production parser/elaborator",
}, null, 2));

function readJsonl(file: string): any[] {
  return fs.readFileSync(file, "utf8")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

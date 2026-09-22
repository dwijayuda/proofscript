#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseAndLowerReferenceV061 } from "@proofscript/reference-v061";

const root = path.resolve(import.meta.dirname, "..");
const corpus = path.join(root, "specs", "language", "conformance-v0.6.1");

function readJsonl(file) {
  return fs.readFileSync(path.join(corpus, file), "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

const positive = readJsonl("cases/positive.jsonl");
const negative = readJsonl("cases/negative.jsonl");
const lowering = readJsonl("cases/lowering.jsonl");

const pkg = JSON.parse(fs.readFileSync(path.join(root, "packages/reference-v061/package.json"), "utf8"));
assert.deepEqual(pkg.dependencies ?? {}, {}, "reference frontend must not depend on production ProofScript packages");

const referenceSource = fs.readFileSync(path.join(root, "packages/reference-v061/src/index.ts"), "utf8");
assert.doesNotMatch(referenceSource, /from\s+["']@proofscript\//, "reference frontend must remain independent from production packages");
assert.doesNotMatch(referenceSource, /require\s*\(\s*["']@proofscript\//, "reference frontend must not require production packages");

const failures = [];

for (const item of positive) {
  const result = parseAndLowerReferenceV061(item.source);
  if (!result.ok) {
    failures.push({
      level: "C1",
      id: item.id,
      expected: "accept",
      actual: result,
    });
    continue;
  }
  if (!result.featureIds.includes(item.feature)) {
    failures.push({
      level: "C1",
      id: item.id,
      expectedFeature: item.feature,
      actualFeatures: result.featureIds,
    });
  }
}

for (const item of negative) {
  const result = parseAndLowerReferenceV061(item.source);
  if (result.ok) {
    failures.push({
      level: "C1",
      id: item.id,
      expected: "reject",
      actualLean: result.lowering.leanText,
    });
  }
}

const loweringById = new Map(lowering.map((item) => [item.id, item]));
for (const item of positive) {
  const expected = loweringById.get(item.id);
  assert.ok(expected, "missing lowering case for " + item.id);
  const result = parseAndLowerReferenceV061(item.source);
  if (!result.ok) continue;
  if (result.lowering.leanText !== expected.canonical_lean) {
    failures.push({
      level: "C2",
      id: item.id,
      expected: expected.canonical_lean,
      actual: result.lowering.leanText,
    });
  }
  if (result.lowering.relation !== "SyntaxEq") {
    failures.push({
      level: "C2",
      id: item.id,
      expectedRelation: "SyntaxEq",
      actualRelation: result.lowering.relation,
    });
  }
}

if (failures.length) {
  console.error(JSON.stringify({
    status: "FAIL",
    reference: "ProofScript v0.6.1",
    c1: {
      positiveAccepted: positive.length - failures.filter((x) => x.level === "C1" && x.expected === "accept").length,
      positiveTotal: positive.length,
      negativeRejected: negative.length - failures.filter((x) => x.level === "C1" && x.expected === "reject").length,
      negativeTotal: negative.length,
    },
    c2: {
      exactLowerings: positive.length - failures.filter((x) => x.level === "C2").length,
      total: positive.length,
    },
    failures,
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "PASS",
  reference: "ProofScript v0.6.1",
  independence: "zero-production-package-dependencies",
  C1: {
    status: "PASS",
    positiveAccepted: positive.length,
    negativeRejected: negative.length,
  },
  C2: {
    status: "PASS",
    exactCanonicalLean: positive.length,
    relation: "SyntaxEq",
  },
  claimDiscipline: "C1/C2 implementation-conformance only; no S2/S3 claim",
}, null, 2));

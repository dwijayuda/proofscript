#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { parseSource } from "@proofscript/parser";

const root = path.resolve(import.meta.dirname, "..");
const conformanceDir = path.join(root, "specs", "language", "conformance-v0.6.1");
const harness = JSON.parse(fs.readFileSync(path.join(conformanceDir, "production-harness.json"), "utf8"));
const positive = readJsonl(path.join(conformanceDir, "cases", "positive.jsonl"));
const negative = readJsonl(path.join(conformanceDir, "cases", "negative.jsonl"));
const termCases = new Set(harness.term_cases);

function sourceFor(item) {
  return termCases.has(item.id)
    ? harness.term_wrapper_prefix + item.source + harness.term_wrapper_suffix
    : item.source;
}

function tryParse(item) {
  const source = sourceFor(item);
  try {
    const parsed = parseSource(source);
    return {
      accepted: true,
      declarations: parsed.declarations.length,
      imports: parsed.imports.length,
    };
  } catch (error) {
    return {
      accepted: false,
      errorName: error instanceof Error ? error.constructor?.name ?? error.name : "Error",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

const positiveResults = positive.map((item) => {
  const result = tryParse(item);
  return {
    id: item.id,
    feature: item.feature,
    expected: "accept",
    actual: result.accepted ? "accept" : "reject",
    pass: result.accepted,
    ...(result.accepted ? {} : { errorName: result.errorName, message: result.message }),
  };
});

const negativeResults = negative.map((item) => {
  const result = tryParse(item);
  return {
    id: item.id,
    feature: item.feature,
    expected: "reject",
    actual: result.accepted ? "accept" : "reject",
    pass: !result.accepted,
    ...(result.accepted ? {} : { errorName: result.errorName, message: result.message }),
  };
});

const all = [...positiveResults, ...negativeResults];
const passed = all.filter((item) => item.pass).length;
const failed = all.length - passed;
const report = {
  status: failed === 0 ? "C1-surface-ready" : "C1-surface-gap",
  claim: "audit-only",
  reference: "ProofScript v0.6.1",
  layer: "production parser acceptance/rejection",
  passed,
  total: all.length,
  positive: {
    passed: positiveResults.filter((item) => item.pass).length,
    total: positiveResults.length,
  },
  negative: {
    passed: negativeResults.filter((item) => item.pass).length,
    total: negativeResults.length,
  },
  failures: all.filter((item) => !item.pass),
};

console.log(JSON.stringify(report, null, 2));

if (process.argv.includes("--strict") && failed !== 0) process.exit(1);

function readJsonl(file) {
  return fs.readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

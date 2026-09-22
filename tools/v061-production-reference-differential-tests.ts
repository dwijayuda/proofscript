#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseSource } from "@proofscript/parser";
import { referenceParse } from "../reference/v061/frontend.ts";

const root = path.resolve(import.meta.dirname, "..");
const conformanceDir = path.join(root, "docs", "reference", "proofscript-language-reference-v0.6.1", "conformance");
const harness = JSON.parse(fs.readFileSync(path.join(root, "specs", "language", "conformance-v0.6.1", "production-harness.json"), "utf8"));
const positive = readJsonl(path.join(conformanceDir, "cases", "positive.jsonl"));
const negative = readJsonl(path.join(conformanceDir, "cases", "negative.jsonl"));
const termCases = new Set(harness.term_cases);

const failures: unknown[] = [];
for (const item of [...positive, ...negative]) {
  const reference = referenceParse(item.source);
  if (reference.kind === "defer") {
    failures.push({
      id: item.id,
      kind: "reference-deferred-corpus-case",
      message: "normative corpus case must be owned or explicitly rejected by the reference frontend",
    });
    continue;
  }

  const referenceAccepted = reference.kind === "proofscript";
  const production = productionDecision(item);
  if (production.accepted !== referenceAccepted) {
    failures.push({
      id: item.id,
      feature: item.feature,
      reference: referenceAccepted ? "accept" : "reject",
      production: production.accepted ? "accept" : "reject",
      ...(production.error ? { productionError: production.error } : {}),
      ...(reference.kind === "error" ? { referenceCode: reference.code, referenceMessage: reference.message } : {}),
    });
  }
}

assert.deepEqual(
  failures,
  [],
  `v0.6.1 production/reference acceptance differential failures:\n${JSON.stringify(failures, null, 2)}`,
);

console.log(JSON.stringify({
  status: "PASS",
  reference: "ProofScript v0.6.1",
  claim: "C3-prerequisite-acceptance-parity",
  compared: positive.length + negative.length,
  positive: positive.length,
  negative: negative.length,
  note: "This does not claim full normative C3 because production feature ownership and canonical surface lowering are not yet compared.",
}, null, 2));

function productionDecision(item: any): { accepted: boolean; error?: string } {
  const source = termCases.has(item.id)
    ? harness.term_wrapper_prefix + item.source + harness.term_wrapper_suffix
    : item.source;
  try {
    parseSource(source);
    return { accepted: true };
  } catch (error) {
    return {
      accepted: false,
      error: error instanceof Error ? `${error.constructor?.name ?? error.name}: ${error.message}` : String(error),
    };
  }
}

function readJsonl(file: string): any[] {
  return fs.readFileSync(file, "utf8")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

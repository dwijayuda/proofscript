#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { makeMonadicContractsArtifact } from "../packages/contracts/src/index.mjs";
import { buildStateModelBinding } from "../packages/state-models/src/index.mjs";

const root = path.resolve(import.meta.dirname, "..");
const modelPath = path.join(root, "examples", "software", "06-bank-state.model.json");
const descriptorText = fs.readFileSync(modelPath, "utf8");
const descriptor = JSON.parse(descriptorText);

function sha256(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

const stateModel = buildStateModelBinding(descriptor, {
  descriptorPath: "examples/software/06-bank-state.model.json",
  descriptorSha256: sha256(descriptorText),
});

const cases = [
  {
    id: "if-branch",
    body: "if (amount > 0) { debit(from, amount); } else { audit(0); }",
    expectedUnknown: "if",
  },
  {
    id: "match-branch",
    body: "match amount with { | 0 => audit(0); | _ => debit(from, amount); }",
    expectedUnknown: "match",
  },
  {
    id: "return",
    body: "return;",
    expectedUnknown: "return",
  },
  {
    id: "throw",
    body: "throw(amount);",
    expectedUnknown: "throw",
  },
  {
    id: "try",
    body: "try { debit(from, amount); } catch { audit(0); }",
    expectedUnknown: "try",
  },
  {
    id: "break",
    body: "break;",
    expectedUnknown: "break",
  },
  {
    id: "continue",
    body: "continue;",
    expectedUnknown: "continue",
  },
];

for (const item of cases) {
  const sourceText = [
    "function boundary(from: AccountId, amount: Nat): State Bank Unit",
    "  ensures stable: True",
    ":= do {",
    `  ${item.body}`,
    "}",
    "",
  ].join("\n");

  const built = makeMonadicContractsArtifact({
    sourceText,
    sourcePath: `<stateful-control-flow-${item.id}>`,
    sourceSha256: sha256(sourceText),
    packageVersion: "test",
    stateModel,
  });

  assert.equal(
    built.artifact.verification.profile,
    "ka144-monadic-prototype",
    `${item.id}: control-flow source must not enter strict stateful verification`,
  );
  assert.equal(built.artifact.verification.claim, "prototype-only");
  assert.ok(
    built.artifact.verification.prototypeFeatures.includes("undeclared-state-operation"),
    `${item.id}: expected undeclared-state-operation boundary`,
  );
  assert.ok(
    built.artifact.verification.unknownOperations.includes(item.expectedUnknown),
    `${item.id}: expected '${item.expectedUnknown}' to remain outside the modeled operation set`,
  );
}

const strictLinear = [
  "function linear(from: AccountId, amount: Nat): State Bank Unit",
  "  ensures stable: balanceOf(from) = old(balanceOf(from)) - amount",
  ":= do {",
  "  debit(from, amount);",
  "}",
  "",
].join("\n");

const accepted = makeMonadicContractsArtifact({
  sourceText: strictLinear,
  sourcePath: "<stateful-linear-control>",
  sourceSha256: sha256(strictLinear),
  packageVersion: "test",
  stateModel,
});
assert.equal(accepted.artifact.verification.profile, "ps3-monadic-contracts0");
assert.deepEqual(accepted.artifact.verification.unknownOperations, []);
assert.equal(accepted.artifact.trustBoundary.exceptionalPathsCovered, false);
assert.equal(
  accepted.artifact.trustBoundary.controlFlowPolicy,
  "linear-modeled-operation-sequence-only",
);

console.log("PS3_STATEFUL_CONTROL_FLOW_BOUNDARY_TESTS=PASS");

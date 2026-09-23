#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { makeMonadicContractsArtifact } from "../packages/contracts/src/index.mjs";
import { createMonadicLoweringArtifact } from "../packages/monadic-lowering/src/index.mjs";
import { buildStateModelBinding } from "../packages/state-models/src/index.mjs";

const root = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(root, "examples", "software", "10-bank-audit-logical-stateful-vc.ps");
const modelPath = path.join(root, "examples", "software", "06-bank-state.model.json");
const sourceText = fs.readFileSync(sourcePath, "utf8");
const descriptorText = fs.readFileSync(modelPath, "utf8");
const descriptor = JSON.parse(descriptorText);

function sha256(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

const stateModel = buildStateModelBinding(descriptor, {
  descriptorPath: "examples/software/06-bank-state.model.json",
  descriptorSha256: sha256(descriptorText),
});

const built = makeMonadicContractsArtifact({
  sourceText,
  sourcePath: "examples/software/10-bank-audit-logical-stateful-vc.ps",
  sourceSha256: sha256(sourceText),
  packageVersion: "test",
  stateModel,
});

assert.equal(built.artifact.verification.profile, "ps3-monadic-contracts0");
assert.equal(built.artifact.statefulPredicateAST.typeCheckingComplete, true);
assert.equal(built.artifact.statefulPredicateAST.requirements.length, 1);
assert.equal(built.artifact.statefulPredicateAST.clauses.length, 1);

const requirement = built.artifact.statefulPredicateAST.requirements[0];
assert.equal(requirement.root.kind, "logical-binary");
assert.equal(requirement.root.operator, "∧");
assert.equal(requirement.root.type, "Prop");
assert.equal(requirement.root.left.kind, "group");
assert.equal(requirement.root.left.expression.kind, "logical-binary");
assert.equal(requirement.root.left.expression.operator, "∨");
assert.equal(requirement.root.right.kind, "logical-not");
assert.equal(requirement.root.right.operand.type, "Prop");

const postcondition = built.artifact.statefulPredicateAST.clauses[0];
assert.equal(postcondition.root.kind, "logical-binary");
assert.equal(postcondition.root.operator, "∧");
assert.equal(postcondition.root.left.kind, "relation");
assert.equal(postcondition.root.right.kind, "relation");

const lowering = createMonadicLoweringArtifact({
  contractArtifact: built.artifact,
  contractArtifactPath: "dist/10-bank-audit-logical.contracts.json",
  contractArtifactSha256: "a".repeat(64),
  packageVersion: "test",
});

assert.equal(lowering.statefulLeanSemanticEncoding.encodingReady, true);
assert.match(lowering.statefulLeanSemanticEncoding.precondition.leanSource, /∨/u);
assert.match(lowering.statefulLeanSemanticEncoding.precondition.leanSource, /∧/u);
assert.match(lowering.statefulLeanSemanticEncoding.precondition.leanSource, /¬/u);
assert.match(lowering.statefulLeanSemanticEncoding.postcondition.leanSource, /∧/u);
assert.match(lowering.statefulLeanSemanticEncoding.postcondition.leanSource, /balanceOf \(left\) \(__ps_final\)/u);
assert.match(lowering.statefulLeanSemanticEncoding.postcondition.leanSource, /balanceOf \(right\) \(__ps_final\)/u);
assert.match(lowering.statefulVcRequest.request.source, /mvcgen \[auditPair\]/u);
assert.match(lowering.statefulVcRequest.request.source, /all_goals simp_all/u);
assert.doesNotMatch(lowering.statefulVcRequest.request.source, /\b(?:sorry|admit)\b/u);

const invalidSource = [
  "function badLogic(code: Nat): State Bank Unit",
  "  requires invalid: code ∧ code > 0",
  "  ensures stable: True",
  ":= do {",
  "  audit(code);",
  "}",
  "",
].join("\n");
const invalid = makeMonadicContractsArtifact({
  sourceText: invalidSource,
  sourcePath: "<bad-logical-predicate>",
  sourceSha256: sha256(invalidSource),
  packageVersion: "test",
  stateModel,
});
assert.equal(invalid.artifact.verification.profile, "ka144-monadic-prototype");
assert.ok(
  invalid.artifact.verification.prototypeFeatures.includes("stateful-predicate-ast-type-mismatch"),
);
assert.ok(
  invalid.artifact.statefulPredicateAST.diagnostics.some(
    (diagnostic: any) =>
      diagnostic.code === "stateful-predicate-logical-type-mismatch"
      && /requires Prop operands/u.test(diagnostic.message),
  ),
);

console.log("PS3_STATEFUL_LOGICAL_PREDICATE_TESTS=PASS");

#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  leanForContract,
  makeContractsArtifact,
  parsePureContractSource,
} from "../packages/contracts/src/index.mjs";
import { normalizeObligationsForWorkflow } from "../packages/obligations/src/index.mjs";
import { createProofStatusArtifact } from "../packages/proof-status/src/index.mjs";

const root = path.resolve(import.meta.dirname, "..");
const specDir = path.join(root, "specs", "verification", "v0.7");
const registry = JSON.parse(fs.readFileSync(path.join(specDir, "feature-registry.json"), "utf8"));
const positive = readJsonl(path.join(specDir, "cases", "positive.jsonl"));
const negative = readJsonl(path.join(specDir, "cases", "negative.jsonl"));

assert.equal(registry.profile, "ps3-pure-contracts0");
assert.equal(registry.claim_ceiling, "specified-alpha");
assert.deepEqual(
  registry.features.map((feature: any) => feature.id).sort(),
  ["V-ASSERT", "V-ENSURES", "V-GHOST", "V-OLD", "V-REQUIRES", "V-RESULT"],
);

for (const item of positive) {
  const contract = parsePureContractSource(item.source, `<${item.id}>`);
  const { artifact } = makeContractsArtifact({
    sourceText: item.source,
    sourcePath: `<${item.id}>`,
    sourceSha256: "0".repeat(64),
    packageVersion: "test",
  });
  assert.equal(artifact.verification.schema, "proofscript.verification-profile/v1", item.id);
  assert.equal(artifact.verification.reference, registry.schema_version, item.id);
  assert.equal(artifact.verification.profile, registry.profile, item.id);
  assert.deepEqual(artifact.verification.features, item.features, item.id);
  assert.equal(contract.requirements.length, item.expected.requirements, item.id);
  assert.equal(contract.ensures.length, item.expected.ensures, item.id);
  assert.equal(contract.assertions.length, item.expected.assertions ?? 0, item.id);
  assert.equal(contract.ghosts.length, item.expected.ghosts ?? 0, item.id);
  assert.equal(contract.oldSnapshots.length, item.expected.oldSnapshots ?? 0, item.id);
  if (item.expected.old_expression) assert.equal(contract.oldSnapshots[0]?.expression, item.expected.old_expression, item.id);
  assert.equal(contract.obligations.length, item.expected.obligations, item.id);
  if (item.expected.requires_proposition) assert.equal(contract.requirements[0]?.proposition, item.expected.requires_proposition, item.id);

  const obligationIds = contract.obligations.map((obligation: any) => obligation.id);
  if (item.expected.obligation_id) assert.ok(obligationIds.includes(item.expected.obligation_id), item.id);
  if (item.expected.obligation_ids) assert.deepEqual(obligationIds, item.expected.obligation_ids, item.id);

  const ensuresObligation = contract.obligations.find((obligation: any) => obligation.kind === "ensures");
  assert.ok(ensuresObligation, `${item.id}: expected an ensures obligation`);
  assert.equal(ensuresObligation.proposition, item.expected.result_proposition, item.id);
  if (item.expected.assert_proposition) {
    const assertObligation = contract.obligations.find((obligation: any) => obligation.kind === "assert");
    assert.ok(assertObligation, `${item.id}: expected an assert obligation`);
    assert.equal(assertObligation.proposition, item.expected.assert_proposition, item.id);
  }
  if (item.expected.runtime_body) assert.equal(contract.body, item.expected.runtime_body, item.id);

  const lean = leanForContract(contract);
  const defLine = lean.split(/\r?\n/u)[0]!;
  for (const requirement of contract.requirements) {
    assert.ok(
      !defLine.includes(`(${requirement.name} :`),
      `${item.id}: requires hypothesis must not alter function definition arity`,
    );
    assert.ok(
      contract.obligations.every((obligation: any) =>
        obligation.exactTheoremStatement.includes(`(${requirement.name} : ${requirement.proposition})`)
      ),
      `${item.id}: requires hypothesis must appear in the proof obligation theorem`,
    );
  }

  const functionApplication = item.expected.result_proposition.split(" = ")[0]!;
  assert.ok(
    ensuresObligation.exactTheoremStatement.includes(functionApplication),
    `${item.id}: theorem must contain the expected result application`,
  );
}

for (const item of negative) {
  assert.throws(
    () => parsePureContractSource(item.source, `<${item.id}>`),
    (error: unknown) => error instanceof Error && error.message.includes(item.error),
    item.id,
  );
}

const manifestCase = positive.find((item: any) => item.id === "ghost-proof-only-substitution")!;
const manifestBuilt = makeContractsArtifact({
  sourceText: manifestCase.source,
  sourcePath: "Ghost.ps",
  sourceSha256: "1".repeat(64),
  packageVersion: "test",
});
const manifestObligations = normalizeObligationsForWorkflow(
  { ...manifestBuilt.artifact, contractsSha256: "2".repeat(64) },
  "Ghost.contracts.json",
  { packageVersion: "test", checkpoint: "ps3-test" },
);
assert.deepEqual(manifestObligations.verification, manifestBuilt.artifact.verification);

const manifestTmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-ps3-manifest-"));
try {
  const obligationsPath = path.join(manifestTmp, "Ghost.obligations.json");
  const proofStatusPath = path.join(manifestTmp, "Ghost.proofstatus.json");
  fs.writeFileSync(obligationsPath, JSON.stringify(manifestObligations, null, 2) + "\n");
  const proofStatus = createProofStatusArtifact({
    obligations: manifestObligations,
    obligationsPath,
    outPath: proofStatusPath,
    proofsArtifact: { schema: "proofscript.lean-proofs.v1", proofs: [] },
    packageVersion: "test",
  });
  assert.deepEqual(proofStatus.verification, manifestBuilt.artifact.verification);
} finally {
  fs.rmSync(manifestTmp, { recursive: true, force: true });
}

const stableA = parsePureContractSource(
  "function stable(x: Nat): Nat\n  requires hx: x >= 0\n  ensures post: result = x\n:= {\n  x\n}",
).obligations[0]!;
const stableB = parsePureContractSource(
  "function stable(x: Nat): Nat\n  requires hx: x >= 0\n  ensures post: result = x + 0\n:= {\n  x\n}",
).obligations[0]!;
assert.equal(stableA.id, "stable.ensures.post");
assert.equal(stableB.id, stableA.id, "obligation ID must remain stable when only the proposition changes");
assert.notEqual(stableB.statementSha256, stableA.statementSha256, "statement hash must detect changed obligation content");

const loopPrototypeSource = `function sumTo(n: Nat): Nat
  ensures closed_form: result = n * (n + 1) / 2
:= {
  let mut i: Nat := 0;
  let mut acc: Nat := 0;
  while (i <= n)
    invariant inv_acc: acc = i * (i - 1) / 2
    decreases dec: n - i
  {
    acc := acc + i;
    i := i + 1;
  }
  acc
}`;
const loopPrototypeArtifact = makeContractsArtifact({
  sourceText: loopPrototypeSource,
  sourcePath: "<loop-prototype>",
  sourceSha256: "0".repeat(64),
  packageVersion: "test",
}).artifact;
assert.equal(loopPrototypeArtifact.verification.profile, "ka142-loop-prototype");
assert.equal(loopPrototypeArtifact.verification.reference, null);
assert.equal(loopPrototypeArtifact.verification.claim, "prototype-only");
assert.deepEqual(
  loopPrototypeArtifact.verification.prototypeFeatures,
  ["KA142-INVARIANT", "KA142-DECREASES"],
);
assert.ok(!loopPrototypeArtifact.verification.features.includes("V-INVARIANT"));
assert.ok(!loopPrototypeArtifact.verification.features.includes("V-DECREASES"));

const preconditionRegression = parsePureContractSource(
  "function f(x: Nat): Nat\n  requires hx: x >= 0\n  ensures post: result = x\n:= {\n  x\n}",
);
const regressionObligation = preconditionRegression.obligations[0]!;
assert.equal(regressionObligation.proposition, "(f x) = x");
assert.match(
  regressionObligation.exactTheoremStatement,
  /^theorem f_ensures_post \(x : Nat\) \(hx : x >= 0\) : \(f x\) = x$/u,
);
assert.doesNotMatch(leanForContract(preconditionRegression), /^def f .*\(hx :/mu);

console.log(JSON.stringify({
  status: "PASS",
  profile: registry.profile,
  features: registry.features.map((feature: any) => feature.id),
  positive: positive.length,
  negative: negative.length,
}, null, 2));

function readJsonl(file: string): any[] {
  return fs.readFileSync(file, "utf8")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const psc = path.join(root, "bin", "psc.mjs");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-ps3-profile-cli-"));

function run(args: string[]) {
  return spawnSync(process.execPath, [psc, ...args], {
    cwd: tmp,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}
function json(result: ReturnType<typeof run>) {
  return JSON.parse(result.stdout);
}

try {
  const model = path.join(tmp, "Bank.model.json");
  fs.writeFileSync(model, JSON.stringify({
    schema: "proofscript.state-model.v1",
    name: "BankStateModel",
    stateType: "Bank",
    monad: { name: "State Bank", typeConstructor: "State Bank α" },
    wp: {
      triple: "Std.Do.Triple",
      precondition: "Bank -> Prop",
      postcondition: "α -> Bank -> Prop",
    },
    semantics: { runner: "runBankState", adequacyTheorem: "runBankState_adequate" },
    operations: [
      { name: "audit", type: "Nat -> State Bank Unit", spec: "records an audit code" },
    ],
    laws: [
      { name: "audit_preserves_balance", statement: "audit does not change account balances" },
    ],
    vcgen: { status: "planned", tactic: "vcgen" },
  }, null, 2) + "\n");

  const strictSource = path.join(tmp, "Strict.ps");
  fs.writeFileSync(strictSource, `function auditTransfer(code: Nat): State Bank Unit
  ensures recorded: code = code
:= do {
  audit(code);
}
`);
  const strictArtifact = path.join(tmp, "Strict.contracts.json");
  const strict = run([
    "contracts", strictSource,
    "--state-model", model,
    "--verification-profile", "ps3-monadic-contracts0",
    "--out", strictArtifact,
    "--json",
  ]);
  assert.equal(strict.status, 0, strict.stderr + strict.stdout);
  const strictJson = json(strict);
  assert.equal(strictJson.verification.profile, "ps3-monadic-contracts0");
  assert.equal(strictJson.verification.claim, "specified-structural-alpha");

  const verified = run(["verify", strictArtifact, "--json"]);
  assert.equal(verified.status, 0, verified.stderr + verified.stdout);
  assert.equal(json(verified).verification.profile, "ps3-monadic-contracts0");

  const callFreeOldSource = path.join(tmp, "CallFreeOld.ps");
  fs.writeFileSync(callFreeOldSource, `function inspect(x: Nat): State Bank Unit
  ensures old_value: old(x) = x
:= do {
  audit(x);
}
`);
  const callFreeOldArtifact = path.join(tmp, "CallFreeOld.contracts.json");
  const callFreeOld = run([
    "contracts", callFreeOldSource,
    "--state-model", model,
    "--verification-profile", "ps3-monadic-contracts0",
    "--out", callFreeOldArtifact,
    "--json",
  ]);
  assert.equal(callFreeOld.status, 0, callFreeOld.stderr + callFreeOld.stdout);
  const callFreeOldJson = json(callFreeOld);
  assert.equal(callFreeOldJson.verification.profile, "ps3-monadic-contracts0");
  assert.equal(callFreeOldJson.verification.claim, "specified-structural-alpha");
  assert.deepEqual(callFreeOldJson.verification.features, ["V-MONADIC-CONTRACT", "V-OLD"]);
  const callFreeOldArtifactJson = JSON.parse(fs.readFileSync(callFreeOldArtifact, "utf8"));
  assert.equal(callFreeOldArtifactJson.statefulPostconditionIR.binders.entryState.role, "entry-state");
  assert.equal(callFreeOldArtifactJson.statefulPostconditionIR.binders.result.role, "result");
  assert.equal(callFreeOldArtifactJson.statefulPostconditionIR.binders.finalState.role, "final-state");
  assert.equal(callFreeOldArtifactJson.statefulPostconditionIR.clauses[0].oldReferences[0].observationCoverageComplete, true);
  assert.equal(callFreeOldArtifactJson.statefulPostconditionIR.semanticElaborationComplete, false);

  const prototypeSource = path.join(tmp, "Prototype.ps");
  fs.writeFileSync(prototypeSource, `function inspect(x: Nat): State Bank Unit
  ensures old_value: old(hiddenRead(x)) = x
:= do {
  audit(x);
}
`);
  const rejected = run([
    "contracts", prototypeSource,
    "--state-model", model,
    "--verification-profile", "ps3-monadic-contracts0",
    "--json",
  ]);
  assert.equal(rejected.status, 1, rejected.stderr + rejected.stdout);
  const rejectedJson = json(rejected);
  assert.equal(rejectedJson.status, "rejected");
  assert.match(rejectedJson.message, /verification profile mismatch/i);
  assert.match(rejectedJson.message, /stateful-old-unclassified-call/i);

  const prototypeArtifact = path.join(tmp, "Prototype.contracts.json");
  const prototype = run([
    "contracts", prototypeSource,
    "--state-model", model,
    "--out", prototypeArtifact,
    "--json",
  ]);
  assert.equal(prototype.status, 0, prototype.stderr + prototype.stdout);
  const prototypeJson = json(prototype);
  assert.equal(prototypeJson.verification.profile, "ka144-monadic-prototype");
  assert.equal(prototypeJson.verification.claim, "prototype-only");
  assert.ok(prototypeJson.verification.prototypeFeatures.includes("stateful-old-unclassified-call"));
  const prototypeArtifactJson = JSON.parse(fs.readFileSync(prototypeArtifact, "utf8"));
  assert.equal(prototypeArtifactJson.statefulPostconditionIR.clauses[0].oldReferences[0].observationCoverageComplete, false);
  assert.ok(prototypeArtifactJson.statefulPostconditionIR.clauses[0].oldReferences[0].undeclaredCallHeads.includes("hiddenRead"));

  console.log("PS3_VERIFICATION_PROFILE_CLI_TESTS=PASS");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const node = process.execPath;
const psc = path.join(ROOT, "bin", "psc.mjs");

function run(args: string[], cwd = ROOT) {
  return spawnSync(node, [psc, ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runOk(args: string[], cwd = ROOT) {
  const result = run(args, cwd);
  assert.equal(
    result.status,
    0,
    `psc ${args.join(" ")} failed\nstdout=${result.stdout}\nstderr=${result.stderr}`,
  );
  return result;
}

function json(result: ReturnType<typeof run>) {
  try {
    return JSON.parse(result.stdout);
  } catch {
    assert.fail(`expected JSON stdout, got:\n${result.stdout}\nstderr=${result.stderr}`);
  }
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-vc-run-cli-"));
const source = path.join(tmp, "Audit.ps");
const model = path.join(tmp, "Bank.model.json");
const contracts = path.join(tmp, "Audit.contracts.json");
const lowering = path.join(tmp, "Audit.monadic-lowering.json");
const leanProject = path.join(tmp, "lean-project");
const runArtifact = path.join(tmp, "Audit.stateful-vc-run.json");

fs.mkdirSync(leanProject, { recursive: true });
fs.writeFileSync(source, `function auditTransfer(code: Nat): State Bank Unit
  ensures recorded: code = code
:= do {
  audit(code);
}
`);

fs.writeFileSync(model, JSON.stringify({
  schema: "proofscript.state-model.v1",
  name: "BankStateModel",
  stateType: "Bank",
  monad: {
    name: "State Bank",
    typeConstructor: "State Bank α",
  },
  wp: {
    triple: "Std.Do.Triple",
    precondition: "Bank -> Prop",
    postcondition: "α -> Bank -> Prop",
  },
  semantics: {
    runner: "runBankState",
    adequacyTheorem: "BankStateModel.runBankState_adequate",
  },
  lean: {
    imports: ["ProofScript.Test.BankStateModel"],
    openNamespaces: ["BankStateModel"],
    monadTypeConstructor: "StateM Bank",
  },
  operations: [{
    name: "audit",
    type: "Nat -> State Bank Unit",
    spec: "records an audit code without changing the bank state",
    verification: {
      tripleTheorem: "BankStateModel.audit_triple",
    },
  }],
  observations: [{
    name: "balanceOf",
    type: "AccountId -> Bank -> Nat",
    stateArgument: "last",
    spec: "reads account balance",
  }],
  laws: [{
    name: "audit_preserves_state",
    statement: "audit leaves the bank state unchanged",
  }],
  vcgen: {
    status: "planned",
  },
}, null, 2) + "\n");

const contractResult = json(runOk([
  "contracts",
  source,
  "--state-model", model,
  "--verification-profile", "ps3-monadic-contracts0",
  "--out", contracts,
  "--json",
], tmp));
assert.equal(contractResult.status, "accepted");
assert.equal(contractResult.verification.profile, "ps3-monadic-contracts0");

const loweringResult = json(runOk([
  "monadic-lowering",
  contracts,
  "--out", lowering,
  "--json",
], tmp));
assert.equal(loweringResult.status, "accepted");

const loweringArtifact = JSON.parse(fs.readFileSync(lowering, "utf8"));
assert.equal(loweringArtifact.statefulVcRequest.requestSourceReady, true);
assert.equal(loweringArtifact.statefulVcRequest.tactic.name, "mvcgen");
assert.equal(loweringArtifact.statefulVcRequest.tactic.requestedName, null);
assert.equal(loweringArtifact.statefulVcRequest.tactic.selectedFromTriple, true);
assert.equal(loweringArtifact.statefulVcRequest.tactic.tripleIdentity, "Std.Do.Triple");
assert.deepEqual(loweringArtifact.statefulVcRequest.tactic.invocationDefinitions, ["auditTransfer"]);
assert.deepEqual(loweringArtifact.statefulVcRequest.tactic.invocationItems, ["auditTransfer"]);
assert.equal(loweringArtifact.statefulVcRequest.tactic.programDefinitionHandling, "explicit-unfold-list");
assert.match(loweringArtifact.statefulVcRequest.request.source, /mvcgen \[auditTransfer\]/u);
assert.doesNotMatch(
  loweringArtifact.statefulVcRequest.request.source,
  /mvcgen \[BankStateModel\.audit_triple\]/u,
);
assert.equal(loweringArtifact.statefulVcRequest.leanEnvironmentResolved, false);
assert.equal(loweringArtifact.statefulVcRequest.tacticExecuted, false);
assert.equal(loweringArtifact.statefulVcRequest.realVerificationConditionsGenerated, false);

const missingLake = `proofscript-definitely-missing-lake-${process.pid}`;
const execution = run([
  "monadic-vc-run",
  lowering,
  "--lean-project", leanProject,
  "--lake-cmd", missingLake,
  "--out", runArtifact,
  "--json",
], tmp);
assert.equal(execution.status, 1, execution.stderr + execution.stdout);
const executionJson = json(execution);
assert.equal(executionJson.status, "rejected");
assert.equal(executionJson.command, "monadic-vc-run");
assert.equal(executionJson.verificationStatus, "failed");
assert.equal(executionJson.failedStage, "setup");
assert.equal(executionJson.claims.leanEnvironmentResolved, false);
assert.equal(executionJson.claims.leanModelTypechecked, false);
assert.equal(executionJson.claims.leanProgramTypechecked, false);
assert.equal(executionJson.claims.tripleTargetTypechecked, false);
assert.equal(executionJson.claims.tacticExecuted, false);
assert.equal(executionJson.claims.semanticVcDerivationComplete, false);
assert.equal(executionJson.claims.realVerificationConditionsGenerated, false);
assert.equal(executionJson.claims.semanticProofDischarge, false);

assert.ok(fs.existsSync(runArtifact));
const report = JSON.parse(fs.readFileSync(runArtifact, "utf8"));
assert.equal(report.schema, "proofscript.stateful-vc-run/v1");
assert.equal(report.status, "failed");
assert.equal(report.failedStage, "setup");
assert.match(report.message, /unable to execute Lean|ENOENT|not found|unsupported Lean version/iu);
assert.equal(report.claims.leanEnvironmentResolved, false);
assert.equal(report.claims.realVerificationConditionsGenerated, false);
assert.equal(report.claims.semanticProofDischarge, false);

const language = json(runOk(["language", "status", "--json"], tmp));
assert.ok(language.commands.includes("monadic-vc-run"));
assert.ok(language.features.formalVerification.includes("Lean VC execution evidence"));
assert.equal(language.features.verificationFeatureClaims.invariant, "ka142-loop-prototype");
assert.equal(language.features.verificationFeatureClaims.decreases, "ka142-loop-prototype");
assert.equal(language.trustBoundary.statefulVcExecutionEvidence, true);
assert.equal(language.trustBoundary.leanVcEnvironmentResolved, false);
assert.equal(language.trustBoundary.vcgenExecuted, false);
assert.equal(language.trustBoundary.monadicProofDischarge, false);
assert.ok(!Object.values(language.layers).some((layer: any) => Object.hasOwn(layer, "progress")));

const router = fs.readFileSync(psc, "utf8");
assert.ok(router.includes("./monadic-commands.mjs"));
assert.ok(router.includes("psc monadic-vc-run <monadic-lowering.json>"));
assert.ok(router.split("\n").length < 1900);

console.log("PS3_STATEFUL_VC_RUN_CLI_TESTS=PASS");

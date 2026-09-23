#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const runner = path.join(root, "tools", "ps3-stateful-lean-vc-runner.ts");
const canonicalModel = path.join(root, "examples", "software", "06-bank-state.model.json");
const canonicalLeanProject = path.join(root, "specs", "verification", "v0.7", "lean");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-stateful-runner-selection-"));
const missingLake = `proofscript-definitely-missing-lake-${process.pid}`;

function invoke(extraArgs: string[], reportPath: string) {
  const result = spawnSync(process.execPath, [
    "--experimental-strip-types",
    "--disable-warning=ExperimentalWarning",
    "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
    runner,
    ...extraArgs,
    "--lake-cmd", missingLake,
    "--out", reportPath,
  ], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert.equal(
    result.status,
    0,
    `runner selection probe failed\nstdout=${result.stdout}\nstderr=${result.stderr}`,
  );
  assert.ok(fs.existsSync(reportPath), `expected report at ${reportPath}`);
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  assert.equal(report.schema, "proofscript.stateful-vc-run/v1");
  assert.equal(report.status, "unsupported");
  assert.equal(report.failedStage, "setup");
  assert.equal(report.claims.leanEnvironmentResolved, false);
  assert.equal(report.claims.realVerificationConditionsGenerated, false);
  assert.equal(report.claims.semanticProofDischarge, false);
  return report;
}

try {
  const debitReport = invoke([], path.join(tmp, "debit-run.json"));
  assert.equal(debitReport.scope, "examples/software/07-bank-debit-stateful-vc.ps");

  const copiedModel = path.join(tmp, "bank.model.json");
  const copiedLeanProject = path.join(tmp, "lean-project");
  fs.copyFileSync(canonicalModel, copiedModel);
  fs.cpSync(canonicalLeanProject, copiedLeanProject, { recursive: true });

  const transferReport = invoke([
    "--source", "examples/software/06-bank-transfer-monadic-contract.ps",
    "--model", copiedModel,
    "--lean-project", copiedLeanProject,
  ], path.join(tmp, "transfer-run.json"));
  assert.equal(transferReport.scope, "examples/software/06-bank-transfer-monadic-contract.ps");

  const floorReport = invoke([
    "--source", "examples/software/06-bank-transfer-monadic-contract.ps",
    "--model", copiedModel,
    "--lean-project", copiedLeanProject,
    "--lean-toolchain", "4.33.1",
  ], path.join(tmp, "transfer-floor-run.json"));
  assert.equal(floorReport.lean.requestedToolchain, "leanprover/lean4:v4.33.1");
  assert.equal(floorReport.lean.projectToolchain, "leanprover/lean4:v4.33.1");

  console.log("PS3_STATEFUL_LEAN_RUNNER_SELECTION_TESTS=PASS");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

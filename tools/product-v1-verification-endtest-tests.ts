#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const endtest = path.join(root, "tools", "product-v1-verification-endtest.ts");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-product-v1-verification-plan-"));
const out = path.join(tmp, "summary.json");

try {
  const result = spawnSync(process.execPath, [
    "--experimental-strip-types",
    "--disable-warning=ExperimentalWarning",
    "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
    endtest,
    "--plan-only",
    "--toolchains", "4.33.1,4.34.0,4.35.0-rc2",
    "--out", out,
  ], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  assert.equal(
    result.status,
    0,
    `Product v1 verification plan failed\nstdout=${result.stdout}\nstderr=${result.stderr}`,
  );

  const report = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(report.schema, "proofscript.product-v1-verification-endtest/v1");
  assert.equal(report.status, "planned");
  assert.equal(report.executionAttempted, false);
  assert.equal(report.diagnoseAll, false);
  assert.deepEqual(report.toolchains, ["4.33.1", "4.34.0", "4.35.0-rc2"]);
  assert.deepEqual(report.steps.map((step) => step.name), [
    "build",
    "product-v1-contract",
    "pure-contracts",
    "loop-vc",
    "loop-runner-selection",
    "loop-matrix-plan",
    "loop-proof-matrix",
    "stateful-endtest",
  ]);
  assert.ok(report.steps.every((step) => step.status === "planned"));

  const loopStep = report.steps.find((step) => step.name === "loop-proof-matrix");
  assert.ok(loopStep.args.includes("4.33.1,4.34.0,4.35.0-rc2"));
  const statefulStep = report.steps.find((step) => step.name === "stateful-endtest");
  assert.ok(statefulStep.args.includes("4.33.1,4.34.0,4.35.0-rc2"));

  const diagnosticOut = path.join(tmp, "diagnostic.json");
  const diagnosticResult = spawnSync(process.execPath, [
    "--experimental-strip-types",
    "--disable-warning=ExperimentalWarning",
    "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
    endtest,
    "--plan-only",
    "--diagnose-all",
    "--toolchains", "4.33.1,4.34.0,4.35.0-rc2",
    "--out", diagnosticOut,
  ], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert.equal(
    diagnosticResult.status,
    0,
    `Product v1 diagnostic verification plan failed\nstdout=${diagnosticResult.stdout}\nstderr=${diagnosticResult.stderr}`,
  );
  const diagnostic = JSON.parse(fs.readFileSync(diagnosticOut, "utf8"));
  assert.equal(diagnostic.diagnoseAll, true);
  const diagnosticStateful = diagnostic.steps.find((step) => step.name === "stateful-endtest");
  assert.ok(diagnosticStateful.args.includes("--diagnose-all"));

  console.log("PRODUCT_V1_VERIFICATION_ENDTEST_TESTS=PASS");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

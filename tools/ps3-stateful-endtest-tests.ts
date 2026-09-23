#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const endtest = path.join(root, "tools", "ps3-stateful-endtest.ts");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-stateful-endtest-plan-"));
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
    `end-test plan failed\nstdout=${result.stdout}\nstderr=${result.stderr}`,
  );
  const report = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(report.schema, "proofscript.stateful-endtest/v1");
  assert.equal(report.status, "planned");
  assert.equal(report.executionAttempted, false);
  assert.deepEqual(report.toolchains, ["4.33.1", "4.34.0", "4.35.0-rc2"]);
  assert.deepEqual(report.steps.map((step: any) => step.name), [
    "build",
    "lean-version-compatibility",
    "stateful-model",
    "runner-selection",
    "proof-matrix-plan",
    "vc-evidence",
    "vc-run-cli",
    "proof-matrix",
  ]);
  const matrix = report.steps.at(-1);
  assert.ok(matrix.args.includes("--toolchains"));
  assert.ok(matrix.args.includes("4.33.1,4.34.0,4.35.0-rc2"));

  console.log("PS3_STATEFUL_ENDTEST_TESTS=PASS");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

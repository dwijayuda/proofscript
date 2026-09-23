#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const runner = path.join(root, "tools", "ps3-loop-lean-vc-runner.ts");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-loop-runner-selection-"));
const out = path.join(tmp, "report.json");

try {
  const missingLake = path.join(tmp, process.platform === "win32" ? "missing-lake.cmd" : "missing-lake");
  const result = spawnSync(process.execPath, [
    "--experimental-strip-types",
    "--disable-warning=ExperimentalWarning",
    "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
    runner,
    "--source", "examples/software/09-count-to-loop-vc.ps",
    "--lake-cmd", missingLake,
    "--require-proof",
    "--out", out,
  ], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  assert.equal(result.status, 2);
  assert.ok(fs.existsSync(out));

  const report = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(report.schema, "proofscript.loop-vc-run/v1");
  assert.equal(report.status, "unsupported");
  assert.equal(report.failedStage, "setup");
  assert.equal(report.scope, "examples/software/09-count-to-loop-vc.ps");
  assert.equal(report.claims.leanEnvironmentResolved, false);
  assert.equal(report.claims.semanticLoopVcGenerationComplete, true);
  assert.equal(report.claims.leanTypechecked, false);
  assert.equal(report.claims.semanticProofDischarge, false);
  assert.equal(report.claims.sourceRuntimeCorrespondenceChecked, false);
  assert.match(report.provenance.sourceSha256, /^[0-9a-f]{64}$/u);
  assert.match(report.provenance.generatedLeanSha256, /^[0-9a-f]{64}$/u);

  console.log("PS3_LOOP_LEAN_RUNNER_SELECTION_TESTS=PASS");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

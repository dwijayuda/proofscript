#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const matrix = path.join(root, "tools", "ps3-stateful-lean-proof-matrix.ts");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-stateful-matrix-"));
const out = path.join(tmp, "matrix.json");

try {
  const result = spawnSync(process.execPath, [
    "--experimental-strip-types",
    "--disable-warning=ExperimentalWarning",
    "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
    matrix,
    "--plan-only",
    "--toolchains", "4.33.1,v4.34.0,leanprover/lean4:v4.35.0-rc2",
    "--out", out,
  ], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  assert.equal(
    result.status,
    0,
    `matrix plan failed\nstdout=${result.stdout}\nstderr=${result.stderr}`,
  );
  assert.ok(fs.existsSync(out));

  const report = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(report.schema, "proofscript.stateful-proof-matrix/v1");
  assert.equal(report.status, "planned");
  assert.equal(report.executionAttempted, false);
  assert.deepEqual(report.toolchains, [
    "leanprover/lean4:v4.33.1",
    "leanprover/lean4:v4.34.0",
    "leanprover/lean4:v4.35.0-rc2",
  ]);
  assert.equal(report.cases.length, 6);

  for (const toolchain of report.toolchains) {
    const cases = report.cases.filter((item: any) => item.toolchain === toolchain);
    assert.deepEqual(cases.map((item: any) => item.name), ["debit", "transfer"]);
    assert.ok(cases.every((item: any) => item.requireProof === true));
    assert.ok(cases.every((item: any) => item.status === "planned"));
  }

  console.log("PS3_STATEFUL_LEAN_PROOF_MATRIX_TESTS=PASS");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

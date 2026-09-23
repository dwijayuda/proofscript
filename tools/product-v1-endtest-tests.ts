#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { productV1ClosureSatisfied } from "./product-v1-endtest-status.mjs";

const root = path.resolve(import.meta.dirname, "..");
const runner = path.join(root, "tools", "product-v1-endtest.ts");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-product-v1-endtest-plan-"));

function runPlan(extra: string[], file: string) {
  const result = spawnSync(process.execPath, [
    "--experimental-strip-types",
    "--disable-warning=ExperimentalWarning",
    "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
    runner,
    "--plan-only",
    "--out", file,
    ...extra,
  ], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert.equal(
    result.status,
    0,
    `Product-v1 endtest plan failed\nstdout=${result.stdout}\nstderr=${result.stderr}`,
  );
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

try {
  assert.equal(
    productV1ClosureSatisfied({ executionPassed: true, skipLean: false }),
    true,
    "a green full run is eligible to close Product v1",
  );
  assert.equal(
    productV1ClosureSatisfied({ executionPassed: true, skipLean: true }),
    false,
    "a green --skip-lean diagnostic run must not close Product v1",
  );
  assert.equal(
    productV1ClosureSatisfied({ executionPassed: false, skipLean: false }),
    false,
    "a failed full run must not close Product v1",
  );
  assert.equal(
    productV1ClosureSatisfied({ executionPassed: true, skipLean: false, diagnoseAll: true }),
    false,
    "a green --diagnose-all run must remain diagnostic and must not close Product v1",
  );

  const full = runPlan(
    ["--toolchains", "4.33.1,4.34.0,4.35.0-rc2"],
    path.join(tmp, "full.json"),
  );
  assert.equal(full.schema, "proofscript.product-v1-endtest/v1");
  assert.equal(full.status, "planned");
  assert.equal(full.executionAttempted, false);
  assert.equal(full.skipLean, false);
  assert.equal(full.diagnoseAll, false);
  assert.deepEqual(full.toolchains, ["4.33.1","4.34.0","4.35.0-rc2"]);
  assert.equal(full.steps.at(0).name, "build");
  assert.equal(full.steps.at(-1).name, "proof-required-verification");
  assert.ok(full.steps.some((step) => step.name === "representative-apps"));
  assert.ok(full.steps.some((step) => step.name === "fresh-release"));
  assert.ok(full.steps.some((step) => step.name === "lsp-transport"));
  assert.ok(full.steps.some((step) => step.name === "runtime-differential"));
  assert.ok(full.steps.every((step) => step.status === "planned"));

  const noLean = runPlan(
    ["--skip-lean"],
    path.join(tmp, "no-lean.json"),
  );
  assert.equal(noLean.skipLean, true);
  assert.deepEqual(noLean.toolchains, []);
  assert.equal(noLean.output.verification, null);
  assert.equal(noLean.steps.some((step) => step.name === "proof-required-verification"), false);
  assert.equal(noLean.steps.at(-1).name, "fresh-release");

  const diagnostic = runPlan(
    ["--diagnose-all", "--toolchains", "4.33.1,4.34.0,4.35.0-rc2"],
    path.join(tmp, "diagnostic.json"),
  );
  assert.equal(diagnostic.diagnoseAll, true);
  assert.equal(diagnostic.skipLean, false);
  assert.equal(diagnostic.steps.at(-1).name, "proof-required-verification");

  console.log("PRODUCT_V1_ENDTEST_TESTS=PASS");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

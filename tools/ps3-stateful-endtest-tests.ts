#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveNpmInvocation } from "./ps3-npm-invocation.mjs";
import { formatProcessProgress } from "./ps3-process-runner.mjs";

assert.equal(
  formatProcessProgress("start", "build"),
  "[proofscript] START build",
);
assert.equal(
  formatProcessProgress("pass", "build"),
  "[proofscript] PASS  build",
);
assert.equal(
  formatProcessProgress("fail", "proof-matrix", 1),
  "[proofscript] FAIL  proof-matrix (exit 1)",
);

const windowsInvocation = resolveNpmInvocation(
  ["run", "build"],
  {
    env: {
      npm_execpath: "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js",
    },
    execPath: "C:\\Program Files\\nodejs\\node.exe",
    platform: "win32",
  },
);
assert.deepEqual(windowsInvocation, {
  command: "C:\\Program Files\\nodejs\\node.exe",
  args: [
    "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js",
    "run",
    "build",
  ],
  mode: "node-npm-cli",
});

const posixFallback = resolveNpmInvocation(
  ["run", "build"],
  { env: {}, execPath: "/usr/bin/node", platform: "linux" },
);
assert.deepEqual(posixFallback, {
  command: "npm",
  args: ["run", "build"],
  mode: "npm-bin",
});

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
    "stateful-frame",
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

#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeContractsArtifact } from "../packages/contracts/src/index.mjs";
import {
  classifyLeanCompatibilityOutput,
  normalizeLeanToolchainSelector,
} from "../packages/monadic-lowering/src/index.mjs";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const requireProof = args.includes("--require-proof");

function option(name: string) {
  const eq = args.find((arg) => arg.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function run(command: string, commandArgs: string[], cwd: string) {
  const result = spawnSync(command, commandArgs, {
    cwd,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 32 * 1024 * 1024,
  });
  return {
    command,
    args: commandArgs,
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error?.message ?? null,
  };
}

function writeReport(report: any) {
  const out = option("--out");
  if (out) {
    const resolved = path.resolve(process.cwd(), out);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, JSON.stringify(report, null, 2) + "\n");
  }
  console.log(JSON.stringify(report, null, 2));
}

const sourcePath = path.resolve(
  process.cwd(),
  option("--source") ?? "examples/software/09-count-to-loop-vc.ps",
);
const leanProjectRoot = path.resolve(
  process.cwd(),
  option("--lean-project") ?? "specs/verification/v0.7/lean",
);
const requestedLeanToolchain = option("--lean-toolchain") ?? process.env.PROOFSCRIPT_LEAN_TOOLCHAIN;
const selectedLeanToolchain = requestedLeanToolchain
  ? normalizeLeanToolchainSelector(requestedLeanToolchain)
  : null;
const leanCmd = option("--lean-cmd") ?? process.env.LEAN ?? "lean";
const requestedLakeCmd = option("--lake-cmd") ?? process.env.LAKE;

const sourceText = fs.readFileSync(sourcePath, "utf8");
const sourceScope = path.relative(root, sourcePath).replace(/\\/gu, "/");
const built = makeContractsArtifact({
  sourceText,
  sourcePath: sourceScope,
  sourceSha256: sha256(sourceText),
  packageVersion: "test",
});
const loopVc = built.artifact.loopVerification;
assert.equal(loopVc?.schema, "proofscript.loop-vc/v1");
assert.equal(
  loopVc?.ready,
  true,
  `source is outside promoted loop-vc0 profile: ${loopVc?.diagnostic ?? loopVc?.reasons?.join(", ") ?? "unknown"}`,
);
assert.equal(built.artifact.verification.profile, "ps3-pure-contracts0");
assert.ok(built.artifact.verification.features.includes("V-INVARIANT"));
assert.ok(built.artifact.verification.features.includes("V-DECREASES"));
assert.ok(loopVc.lean?.source);
assert.doesNotMatch(loopVc.lean.source, /\b(?:sorry|admit)\b/u);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-loop-vc-"));
fs.cpSync(leanProjectRoot, tmp, { recursive: true });

const toolchainPath = path.join(tmp, "lean-toolchain");
if (selectedLeanToolchain) fs.writeFileSync(toolchainPath, selectedLeanToolchain + "\n");
const projectToolchain = fs.existsSync(toolchainPath)
  ? fs.readFileSync(toolchainPath, "utf8").trim()
  : null;

const generatedPath = path.join(tmp, "GeneratedLoopVC.lean");
fs.writeFileSync(generatedPath, loopVc.lean.source);

const leanBinDir = path.dirname(path.resolve(leanCmd));
const localLake = path.join(leanBinDir, process.platform === "win32" ? "lake.exe" : "lake");
const lakeCmd = requestedLakeCmd ?? (fs.existsSync(localLake) ? localLake : "lake");

console.error(`[proofscript] LEAN  loop-vc probe ${projectToolchain ?? "<project-default>"}`);
const versionRun = run(lakeCmd, ["env", "lean", "--version"], tmp);
const compatibility = versionRun.exitCode === 0
  ? classifyLeanCompatibilityOutput(`${versionRun.stdout}\n${versionRun.stderr}`)
  : {
      status: "unsupported",
      minimumVersion: "4.33.1",
      message: versionRun.error || versionRun.stderr || "unable to execute Lean through Lake",
    };

const lean = {
  requestedLeanBinary: leanCmd,
  requestedToolchain: selectedLeanToolchain,
  projectToolchain,
  lakeCommand: lakeCmd,
  run: versionRun,
  ...compatibility,
};

if (compatibility.status !== "accepted") {
  const report = {
    schema: "proofscript.loop-vc-run/v1",
    status: "unsupported",
    scope: sourceScope,
    failedStage: "setup",
    lean,
    provenance: {
      sourceSha256: sha256(sourceText),
      generatedLeanSha256: sha256(loopVc.lean.source),
    },
    claims: {
      leanEnvironmentResolved: false,
      semanticLoopVcGenerationComplete: true,
      leanTypechecked: false,
      semanticProofDischarge: false,
      sourceRuntimeCorrespondenceChecked: false,
    },
  };
  writeReport(report);
  process.exit(requireProof ? 2 : 0);
}

console.error("[proofscript] LEAN  loop-vc proof");
const proofRun = run(lakeCmd, ["env", "lean", path.basename(generatedPath)], tmp);
const proved = proofRun.exitCode === 0;
const report = {
  schema: "proofscript.loop-vc-run/v1",
  status: proved ? "proved" : "failed",
  scope: sourceScope,
  failedStage: proved ? null : "loop-vc-proof",
  lean,
  provenance: {
    sourceSha256: sha256(sourceText),
    generatedLeanSha256: sha256(loopVc.lean.source),
  },
  generated: {
    profile: loopVc.profile,
    vcCount: loopVc.vcs.length,
    theoremNames: loopVc.vcs.map((vc: any) => vc.theoremName),
    targets: loopVc.vcs.map((vc: any) => ({ kind: vc.kind, target: vc.target })),
    source: loopVc.lean.source,
  },
  checks: {
    proofRun,
  },
  claims: {
    leanEnvironmentResolved: true,
    semanticLoopVcGenerationComplete: true,
    leanTypechecked: proved,
    semanticProofDischarge: proved,
    sourceRuntimeCorrespondenceChecked: false,
  },
};
writeReport(report);
if (requireProof && !proved) process.exit(1);
process.exit(proved ? 0 : 1);

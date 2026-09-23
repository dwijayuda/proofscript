#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const psc = path.join(root, "bin", "psc.mjs");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-runtime-cert-"));
const source = path.join(tmp, "Main.ps");
const core = path.join(tmp, "Main.pscore.json");
const js = path.join(tmp, "Main.js");
const cert = path.join(tmp, "Main.pscert.json");
const profileOnlyCert = path.join(tmp, "Main.profile-only.pscert.json");
fs.writeFileSync(source, "def one: Nat := 1;\n");

function run(args, expected = 0) {
  const result = spawnSync(process.execPath, [psc, ...args], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(
    result.status,
    expected,
    `${args.join(" ")} exited ${result.status}, expected ${expected}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
  );
  return result;
}

function json(args, expected = 0) {
  const result = run([...args, "--json"], expected);
  return JSON.parse(result.stdout);
}

assert.equal(json(["emit-core", source, "--out", core]).status, "accepted");
const build = json(["build-js", source, "--out", js]);
assert.equal(build.status, "accepted");
assert.equal(build.target, "js");
assert.ok(/^[0-9a-f]{64}$/u.test(build.outputSha256));

const certified = json([
  "certify", source,
  "--core", core,
  "--out", cert,
  "--runtime-artifact", js,
]);
assert.equal(certified.status, "accepted");

const artifactBound = JSON.parse(fs.readFileSync(cert, "utf8"));
assert.equal(artifactBound.runtimeProfile.profileId, "proofscript-js-runtime-v1");
assert.equal(artifactBound.correspondence.level, "artifact-bound-structural");
assert.equal(
  artifactBound.correspondence.meaning,
  "runtime profile and emitted backend artifact hash are bound; execution correspondence is not proved",
);
assert.equal(artifactBound.correspondence.runtimeRepresentationProfileBound, true);
assert.equal(artifactBound.correspondence.runtimeImplementationGated, true);
assert.equal(artifactBound.correspondence.backendArtifactBound, true);
assert.equal(artifactBound.correspondence.runtimeDifferentialTested, false);
assert.equal(artifactBound.correspondence.coreToBackendFormallyProved, false);
assert.equal(artifactBound.correspondence.backendToJavaScriptFormallyProved, false);
assert.equal(artifactBound.correspondence.endToEndVerifiedJavaScript, false);
assert.equal(artifactBound.trustBoundary.executionCorrespondenceProof, false);
assert.equal(artifactBound.runtimeArtifact.target, "js");
assert.ok(/^[0-9a-f]{64}$/u.test(artifactBound.runtimeArtifact.sha256));

const verified = json(["verify", cert]);
assert.equal(verified.status, "accepted");
assert.equal(verified.artifactKind, "certificate");
assert.equal(verified.correspondence.level, "artifact-bound-structural");
assert.equal(verified.correspondence.backendArtifactBound, true);
assert.equal(verified.correspondence.endToEndVerifiedJavaScript, false);
assert.equal(verified.runtimeArtifact.target, "js");

const originalJs = fs.readFileSync(js);
fs.appendFileSync(js, "\n// tampered\n");
const tamperedRuntime = json(["verify", cert], 1);
assert.equal(tamperedRuntime.status, "rejected");
assert.match(tamperedRuntime.message, /runtime artifact hash mismatch/u);
fs.writeFileSync(js, originalJs);

const exaggerated = structuredClone(artifactBound);
exaggerated.correspondence.runtimeDifferentialTested = true;
fs.writeFileSync(cert, JSON.stringify(exaggerated, null, 2) + "\n");
const exaggeratedVerify = json(["verify", cert], 1);
assert.equal(exaggeratedVerify.status, "rejected");
assert.match(exaggeratedVerify.message, /not established by structural certification/u);

const profileCertified = json([
  "certify", source,
  "--core", core,
  "--out", profileOnlyCert,
]);
assert.equal(profileCertified.status, "accepted");
const profileOnly = JSON.parse(fs.readFileSync(profileOnlyCert, "utf8"));
assert.equal(profileOnly.runtimeArtifact, undefined);
assert.equal(profileOnly.correspondence.level, "profile-bound");
assert.equal(
  profileOnly.correspondence.meaning,
  "runtime representation profile identity is bound; no emitted backend artifact is bound",
);
assert.equal(profileOnly.correspondence.backendArtifactBound, false);
const profileVerified = json(["verify", profileOnlyCert]);
assert.equal(profileVerified.status, "accepted");
assert.equal(profileVerified.correspondence.level, "profile-bound");

console.log("PRODUCT_V1_RUNTIME_CERTIFICATE_TESTS=PASS");

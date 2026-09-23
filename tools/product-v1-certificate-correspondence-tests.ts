#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const psc = path.join(root, "bin", "psc.mjs");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-runtime-cert-"));

function run(args: string[], expected = 0) {
  const result = spawnSync(process.execPath, [psc, ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert.equal(
    result.status,
    expected,
    `psc ${args.join(" ")} exited ${result.status}, expected ${expected}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  return result;
}

function json(args: string[], expected = 0) {
  const result = run([...args, "--json"], expected);
  return JSON.parse(result.stdout);
}

function sha256File(file: string) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

try {
  const source = path.join(tmp, "RuntimeCert.ps");
  const core = path.join(tmp, "RuntimeCert.pscore.json");
  const ts = path.join(tmp, "RuntimeCert.ts");
  const cert = path.join(tmp, "RuntimeCert.pscert.json");
  const structuralCert = path.join(tmp, "RuntimeCert.structural.pscert.json");

  fs.writeFileSync(source, "def answer: Nat := { 42 }\n");

  const coreResult = json(["emit-core", source, "--out", core]);
  assert.equal(coreResult.status, "accepted");
  assert.equal(coreResult.coreSha256, sha256File(core));

  const build = json(["build-ts", source, "--out", ts, "--runtime", "bundled"]);
  assert.equal(build.status, "accepted");
  assert.equal(build.target, "ts");
  assert.equal(build.outputSha256, sha256File(ts));

  const certified = json([
    "certify",
    source,
    "--core", core,
    "--out", cert,
    "--runtime-artifact", ts,
  ]);
  assert.equal(certified.status, "accepted");

  const artifact = JSON.parse(fs.readFileSync(cert, "utf8"));
  const runtimeProfilePath = path.join(root, "config", "proofscript-runtime-profile-v1.json");
  assert.equal(artifact.format, "proofscript-certificate");
  assert.equal(artifact.version, 4);
  assert.equal(artifact.runtimeProfile.schema, "proofscript.runtime-profile/v1");
  assert.equal(artifact.runtimeProfile.profileId, "proofscript-js-runtime-v1");
  assert.equal(artifact.runtimeProfile.status, "specified-bounded");
  assert.equal(artifact.runtimeProfile.path, "config/proofscript-runtime-profile-v1.json");
  assert.equal(artifact.runtimeProfile.sha256, sha256File(runtimeProfilePath));
  assert.equal(artifact.runtimeArtifact.target, "ts");
  assert.equal(path.resolve(path.dirname(cert), artifact.runtimeArtifact.path), ts);
  assert.equal(artifact.runtimeArtifact.sha256, sha256File(ts));

  assert.deepEqual(artifact.correspondence, {
    level: "artifact-bound-structural",
    meaning: "runtime profile and emitted backend artifact hash are bound; execution correspondence is not proved",
    runtimeRepresentationProfileBound: true,
    runtimeImplementationGated: true,
    backendArtifactBound: true,
    runtimeDifferentialTested: false,
    coreToBackendFormallyProved: false,
    backendToJavaScriptFormallyProved: false,
    endToEndVerifiedJavaScript: false,
  });
  assert.equal(artifact.trustBoundary.executionCorrespondenceProof, false);

  const verified = json(["verify", cert]);
  assert.equal(verified.status, "accepted");
  assert.equal(verified.artifactKind, "certificate");
  assert.equal(verified.runtimeProfile.profileId, "proofscript-js-runtime-v1");
  assert.equal(verified.runtimeArtifact.target, "ts");
  assert.equal(verified.runtimeArtifact.sha256, sha256File(ts));
  assert.equal(verified.correspondence.level, "artifact-bound-structural");
  assert.equal(
    verified.correspondence.meaning,
    "runtime profile and emitted backend artifact hash are bound; execution correspondence is not proved",
  );
  assert.equal(verified.correspondence.endToEndVerifiedJavaScript, false);

  const originalTs = fs.readFileSync(ts, "utf8");
  fs.appendFileSync(ts, "\n// tampered\n");
  const tamperedRuntime = json(["verify", cert], 1);
  assert.equal(tamperedRuntime.status, "rejected");
  assert.match(tamperedRuntime.message, /runtime artifact hash mismatch/u);
  fs.writeFileSync(ts, originalTs);

  const tamperedProfile = JSON.parse(fs.readFileSync(cert, "utf8"));
  tamperedProfile.runtimeProfile.sha256 = "0".repeat(64);
  const tamperedProfileCert = path.join(tmp, "RuntimeCert.bad-profile.pscert.json");
  fs.writeFileSync(tamperedProfileCert, JSON.stringify(tamperedProfile, null, 2) + "\n");
  const badProfile = json(["verify", tamperedProfileCert], 1);
  assert.equal(badProfile.status, "rejected");
  assert.match(badProfile.message, /runtime profile metadata/u);

  const structural = json([
    "certify",
    source,
    "--core", core,
    "--out", structuralCert,
  ]);
  assert.equal(structural.status, "accepted");
  const structuralArtifact = JSON.parse(fs.readFileSync(structuralCert, "utf8"));
  assert.equal(structuralArtifact.runtimeProfile.profileId, "proofscript-js-runtime-v1");
  assert.equal(structuralArtifact.runtimeArtifact, undefined);
  assert.equal(structuralArtifact.correspondence.level, "profile-bound");
  assert.equal(
    structuralArtifact.correspondence.meaning,
    "runtime representation profile identity is bound; no emitted backend artifact is bound",
  );
  assert.equal(structuralArtifact.correspondence.backendArtifactBound, false);
  assert.equal(structuralArtifact.correspondence.endToEndVerifiedJavaScript, false);
  const structuralVerified = json(["verify", structuralCert]);
  assert.equal(structuralVerified.status, "accepted");
  assert.equal(structuralVerified.correspondence.level, "profile-bound");
  assert.equal(
    structuralVerified.correspondence.meaning,
    "runtime representation profile identity is bound; no emitted backend artifact is bound",
  );

  console.log("PRODUCT_V1_CERTIFICATE_CORRESPONDENCE_TESTS=PASS");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

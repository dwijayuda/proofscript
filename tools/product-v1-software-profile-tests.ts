#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(fs.readFileSync(
  path.join(root, "config", "proofscript-software-profile-v1.json"),
  "utf8",
));

assert.equal(manifest.schema, "proofscript.software-profile/v1");
assert.equal(manifest.profileId, "proofscript-software-v1");
assert.equal(manifest.reference, "v0.6.1 + v0.7 verification extensions");
assert.match(manifest.canonicalPath, /@proofscript\/compiler/u);

const required = manifest.requiredConstructs;
assert.ok(Array.isArray(required));
assert.equal(required.length, manifest.smallnessBudget.requiredConstructCount);
assert.ok(required.length >= manifest.smallnessBudget.minCoreConstructs);
assert.ok(required.length <= manifest.smallnessBudget.maxCoreConstructs);
assert.equal(new Set(required.map((item: any) => item.id)).size, required.length);

for (const item of required) {
  assert.match(item.id, /^P1-/u);
  assert.ok(["everyday", "verification"].includes(item.category));
  assert.doesNotMatch(item.status, /planned|deferred|placeholder|scaffold/u);
}

for (const id of [
  "P1-DEF",
  "P1-STRUCTURE",
  "P1-INDUCTIVE",
  "P1-IF",
  "P1-MATCH",
  "P1-PI",
  "P1-IMPORT",
  "P1-TYPES",
  "P1-REQUIRES",
  "P1-ENSURES",
  "P1-FRAME",
  "P1-LOOP",
  "P1-TS",
  "P1-PACKAGE",
]) {
  assert.ok(required.some((item: any) => item.id === id), `missing required Product-v1 construct ${id}`);
}

assert.ok(manifest.deferredFromV1.includes("arbitrary macros/custom elaborators"));
assert.ok(manifest.deferredFromV1.includes("full Lean tactic engine"));
assert.ok(manifest.deferredFromV1.includes("unrestricted JavaScript FFI"));
assert.ok(manifest.failClosed.includes("TypeScript any"));
assert.ok(manifest.failClosed.includes("unmodeled stateful control flow"));
assert.equal(manifest.claimBoundary.fullLean4Equivalence, false);
assert.equal(manifest.claimBoundary.fullTypeScriptFeatureCompatibility, false);
assert.equal(manifest.claimBoundary.generalExecutionCorrespondenceProof, false);
assert.equal(manifest.claimBoundary.unsupportedFeaturesMustFailClosed, true);

const psc = fs.readFileSync(path.join(root, "bin", "psc.mjs"), "utf8");
assert.match(psc, /require\('@proofscript\/compiler'\)/u);
const compilerLibs = psc.match(/function compilerLibs\(\) \{[\s\S]*?\n\}/u)?.[0] ?? "";
assert.doesNotMatch(compilerLibs, /require\('@proofscript\/frontend'\)/u);

const psliveCore = fs.readFileSync(path.join(root, "tools", "pslive-core.ts"), "utf8");
assert.match(psliveCore, /packages\/compiler\/dist\/index\.js/u);
assert.doesNotMatch(psliveCore, /packages\/frontend\/dist\/index\.js/u);

const runtimeProfile = fs.readFileSync(path.join(root, "packages", "runtime", "src", "profile.ts"), "utf8");
assert.match(runtimeProfile, /Nat \/ Bool \/ Unit \/ Eq \/ Int \/ String \/ Option \/ List \/ Array \/ Except/u);
assert.match(runtimeProfile, /standalone TypeScript module emission/u);
assert.match(runtimeProfile, /structure update expressions/u);
assert.match(runtimeProfile, /IO, modules as runtime namespaces, effects/u);
assert.match(runtimeProfile, /full Lean compatibility or formal equivalence/u);

const examples = JSON.parse(fs.readFileSync(
  path.join(root, "examples", "software-profile", "software-profile-examples.json"),
  "utf8",
));
assert.deepEqual(examples.examples.map((item: any) => item.file).sort(), [
  "BusinessRules.ps",
  "Collections.ps",
  "SecurityPolicy.ps",
  "StateMachine.ps",
  "Validation.ps",
].sort());

console.log("PRODUCT_V1_SOFTWARE_PROFILE=PASS");

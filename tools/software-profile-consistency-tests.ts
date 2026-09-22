#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docPath = path.join(root, 'docs', 'profiles', 'PROOFSCRIPT_SOFTWARE_PROFILE_V0.md');
const manifestPath = path.join(root, 'config', 'proofscript-software-profile-v0.json');
const finalReportPath = path.join(root, 'P5_94_FINAL_BUILD_REPORT.md');
const releaseGatePath = path.join(root, 'P5_94_FINAL_RELEASE_GATE.json');

function readText(file: string): string {
  return fs.readFileSync(file, 'utf8');
}

function readJson(file: string): any {
  return JSON.parse(readText(file));
}

assert.ok(fs.existsSync(docPath), 'software profile spec must exist at docs/profiles/PROOFSCRIPT_SOFTWARE_PROFILE_V0.md');
assert.ok(fs.existsSync(manifestPath), 'software profile manifest must exist at config/proofscript-software-profile-v0.json');
assert.ok(fs.existsSync(finalReportPath), 'P5.94 final build report must remain bundled for evidence binding');
assert.ok(fs.existsSync(releaseGatePath), 'P5.94 final release gate must remain bundled for evidence binding');

const doc = readText(docPath);
const manifest = readJson(manifestPath);
const releaseGate = readJson(releaseGatePath);

assert.equal(manifest.schemaVersion, 1, 'manifest schemaVersion must be 1');
assert.equal(manifest.profileId, 'proofscript-software-v0', 'profile id must be stable');
assert.equal(manifest.baseline.release, 'P5.94', 'profile must bind to the current audited P5.94 baseline');
assert.equal(manifest.baseline.checkpoint, 'arena-nested-helper-target-validation0', 'profile must bind to the exact P5.94 checkpoint');
assert.equal(manifest.baseline.sha256, releaseGate.finalZipSha256, 'profile baseline SHA must match P5.94 final release gate');

assert.equal(manifest.trustBoundary.fullLean4Equivalence, false, 'profile must not claim full Lean 4 equivalence');
assert.equal(manifest.trustBoundary.sameTheoryAsFullLean4, false, 'profile must not claim same theory as full Lean 4');
assert.equal(manifest.trustBoundary.fullyFormalK3, false, 'profile must not claim fully formal K3');
assert.equal(manifest.trustBoundary.formalLean4EquivalenceProvenObligations, 0, 'profile must preserve zero formal Lean equivalence obligations');

assert.ok(Array.isArray(manifest.coreConstructs), 'manifest.coreConstructs must be an array');
assert.ok(manifest.coreConstructs.length >= 20 && manifest.coreConstructs.length <= 35, 'software profile should stay Go-small: 20-35 core constructs');
for (const item of manifest.coreConstructs) {
  assert.equal(typeof item.name, 'string', 'core construct must have a name');
  assert.match(item.status, /^(current|planned|deferred|forbidden)$/u, `invalid construct status for ${item.name}`);
}

const names = new Set(manifest.coreConstructs.map((item: { name: string }) => item.name));
for (const required of ['def', 'theorem', 'structure', 'inductive', 'let', 'if', 'match', 'requires', 'ensures', 'assert']) {
  assert.ok(names.has(required), `software profile must classify required construct: ${required}`);
}
for (const forbidden of ['unchecked cast', 'TypeScript any', 'silent axiom insertion']) {
  assert.ok(names.has(forbidden), `software profile must explicitly forbid: ${forbidden}`);
}

assert.ok(Array.isArray(manifest.currentImplementationFeatures), 'manifest.currentImplementationFeatures must be an array');
assert.ok(manifest.currentImplementationFeatures.length >= 20, 'profile must record substantial current implementation evidence');
for (const feature of manifest.currentImplementationFeatures) {
  assert.equal(typeof feature.name, 'string', 'current feature must have a name');
  assert.match(feature.evidence, /^(p5\.94-final-gate|conformance|differential|arena|implementation-status)$/u, `unexpected evidence kind for ${feature.name}`);
}

assert.ok(Array.isArray(manifest.deferredUntilKernelMaturity), 'manifest.deferredUntilKernelMaturity must list deferred features');
for (const requiredDeferred of ['nested helper recursor derivation + iota validation', 'full Lean tactic engine', 'arbitrary macros', 'unrestricted JS interop']) {
  assert.ok(manifest.deferredUntilKernelMaturity.includes(requiredDeferred), `missing deferred feature: ${requiredDeferred}`);
}

for (const heading of [
  '# ProofScript Software Profile v0',
  '## Goal',
  '## Smallness rule',
  '## Core language',
  '## Current implementation evidence',
  '## Deferred features',
  '## Milestone plan',
  '## Non-overclaim boundary'
]) {
  assert.ok(doc.includes(heading), `spec missing heading: ${heading}`);
}

assert.match(doc, /20-35 core constructs/, 'spec must state the smallness budget');
assert.match(doc, /Full Lean 4 equivalence: NO/, 'spec must preserve full Lean equivalence boundary');
assert.match(doc, /Same theory as full Lean 4: NO/, 'spec must preserve same-theory boundary');
assert.doesNotMatch(doc, /same theory as full Lean 4:\s*YES/i, 'spec must not overclaim same theory');
assert.doesNotMatch(doc, /fully formal K3:\s*YES/i, 'spec must not overclaim fully formal K3');

console.log('PROOFSCRIPT_SOFTWARE_PROFILE_V0_CONSISTENCY=PASS');

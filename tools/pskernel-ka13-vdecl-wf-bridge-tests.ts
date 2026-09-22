#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA13BridgeGate } from './pskernel-ka13-vdecl-wf-bridge.ts';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'assurance/ka13/vdecl-wf-bridge.lean',
  'assurance/ka13/vdecl-wf-bridge.json',
  'assurance/ka13/obligation-delta.json',
  'assurance/ka13/KA13_REPORT.md',
  'assurance/ka13/KA13_RELEASE_GATE.json',
  'tools/pskernel-ka13-vdecl-wf-bridge.ts',
  'tools/pskernel-ka13-vdecl-wf-bridge-tests.ts',
  'docs/superpowers/plans/2026-09-18-pskernel-ka13-vdecl-wf-bridge.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.match(pkg.version, /^1\.0\.0-pskernel\.\d+$/);
assert.ok(pkg.scripts['test:pskernel:ka13']);
assert.ok(pkg.scripts['assurance:ka13']);
assert.ok(pkg.scripts['lean:ka13:check']);
const gate = runKA13BridgeGate({ strict: true });
assert.equal(gate.checkpoint, 'proofscript-v1-ka13-vdecl-wf-bridge0');
assert.equal(gate.publicVersion, '1.0.0-pskernel.16');
assert.equal(gate.coreFormat, 71);
assert.equal(gate.referenceKind, 'direct-imported-lean4lean-vdecl-wf-bridge');
assert.equal(gate.actualLean4LeanImportBound, true);
assert.equal(gate.directLean4LeanVDeclWFBridgeChecked, true);
assert.equal(gate.strictBridgeCheckPassed, true);
assert.deepEqual(gate.blockedReasons, []);
assert.equal(gate.trustedKernelSemanticChange, false);
assert.equal(gate.kernelCodecChange, false);
assert.equal(gate.newTrustedComputationRule, false);
assert.equal(gate.fullLean4Equivalence, false);
assert.equal(gate.sameTheoryAsFullLean4, false);
assert.equal(gate.fullyFormalK3, false);
assert.equal(gate.formalLean4EquivalenceProvenObligations, 2);
console.log(JSON.stringify({ status: 'passed', checkpoint: gate.checkpoint, directLean4LeanVDeclWFBridgeChecked: gate.directLean4LeanVDeclWFBridgeChecked }, null, 2));

#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA20NonDefVDeclWFBridgeGate } from './pskernel-ka20-nondef-vdecl-wf-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const required = [
  'assurance/ka20/nondef-vdecl-wf-bridge.lean',
  'assurance/ka20/nondef-vdecl-wf-bridge.json',
  'assurance/ka20/obligation-delta.json',
  'assurance/ka20/KA20_RELEASE_GATE.json',
  'assurance/ka20/KA20_REPORT.md',
  'tools/pskernel-ka20-nondef-vdecl-wf-bridge.ts',
  'tools/pskernel-ka20-nondef-vdecl-wf-bridge-tests.ts',
  'docs/superpowers/plans/2026-09-18-pskernel-ka20-nondef-vdecl-wf-bridge.md',
];
for (const rel of required) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const result = runKA20NonDefVDeclWFBridgeGate({ strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka20-nondef-vdecl-wf-bridge0');
assert.equal(result.publicVersion, '1.0.0-pskernel.23');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.baseline, 'proofscript-v1-ka19-env-defeq-preservation-bridge0');
assert.equal(result.actualLean4LeanImportBound, true);
assert.equal(result.directLean4LeanNonDefVDeclWFBridgeChecked, true);
assert.equal(result.strictBridgeCheckPassed, true);
assert.deepEqual(result.blockedReasons, []);
assert.equal(result.bridgedRelation, 'Lean4Lean.VDecl.WF');
assert.deepEqual(result.coveredPSDeclKinds, ['theorem', 'example', 'opaque']);
assert.deepEqual(result.alreadyCoveredPSDeclKinds, ['axiom', 'definition']);
assert.deepEqual(result.provenLeanTheoremObligations, [
  'PSKernelKA20.translated_theorem_vdecl_wf',
  'PSKernelKA20.translated_example_vdecl_wf',
  'PSKernelKA20.translated_opaque_vdecl_wf',
]);
assert.equal(result.trustedKernelSemanticChange, false);
assert.equal(result.kernelCodecChange, false);
assert.equal(result.newTrustedComputationRule, false);
assert.equal(result.fullLean4Equivalence, false);
assert.equal(result.sameTheoryAsFullLean4, false);
assert.equal(result.fullyFormalK3, false);
assert.equal(result.formalLean4EquivalenceProvenObligations, 19);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, directLean4LeanNonDefVDeclWFBridgeChecked: result.directLean4LeanNonDefVDeclWFBridgeChecked }, null, 2));

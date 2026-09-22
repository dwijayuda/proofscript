#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA35TypeCheckerRefinementBridgeGate } from './pskernel-ka35-typechecker-refinement-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const preRequired = [
  'tools/pskernel-ka35-typechecker-refinement-bridge.ts',
  'tools/pskernel-ka35-typechecker-refinement-bridge-tests.ts',
  'assurance/ka35/typechecker-refinement-bridge.lean',
  'assurance/ka35/typechecker-refinement-bridge.json',
  'assurance/ka35/obligation-delta.json',
  'docs/superpowers/plans/2026-09-19-pskernel-ka35-typechecker-refinement-bridge.md',
];
for (const rel of preRequired) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const result = runKA35TypeCheckerRefinementBridgeGate({ strict: true });

const generatedRequired = [
  'assurance/ka35/KA35_RELEASE_GATE.json',
  'assurance/ka35/KA35_REPORT.md',
  'assurance/ka35/KA35_VERIFICATION_SUMMARY.json',
];
for (const rel of generatedRequired) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);

assert.equal(result.checkpoint, 'proofscript-v1-ka35-typechecker-refinement-bridge0');
assert.equal(result.publicVersion, '1.0.0-pskernel.38');
assert.equal(result.baseline, 'proofscript-v1-ka34-mutual-def-env-bridge0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.referenceKind, 'direct-imported-lean4lean-typechecker-refinement-bridge');
assert.equal(result.actualLean4LeanImportBound, true);
assert.equal(result.strictTypeCheckerRefinementBridgePassed, true);
assert.deepEqual(result.coveredLean4LeanTypeCheckerOperations, [
  'TypeChecker.whnf',
  'TypeChecker.whnfCore',
  'TypeChecker.inferType',
  'TypeChecker.checkType',
  'TypeChecker.isDefEq',
]);
assert.deepEqual(result.formalBridgeLemmas, [
  'PSKernelKA35.translated_whnf_refines_typing',
  'PSKernelKA35.translated_whnfCore_refines_typing',
  'PSKernelKA35.translated_inferType_refines_typing',
  'PSKernelKA35.translated_checkType_refines_typing',
  'PSKernelKA35.translated_isDefEq_refines_defeq',
]);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.claimBoundary.kernelCodecChange, false);
assert.equal(result.claimBoundary.newTrustedComputationRule, false);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.sameTheoryAsFullLean4, false);
assert.equal(result.claimBoundary.fullyFormalK3, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.typeCheckerSemanticCompleteness, false);
assert.equal(result.claimBoundary.formalLean4EquivalenceProvenObligations, 71);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, formalObligations: result.claimBoundary.formalLean4EquivalenceProvenObligations }, null, 2));

#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA37WHNFHeadReductionBridgeGate } from './pskernel-ka37-whnf-head-reduction-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const preRequired = [
  'tools/pskernel-ka37-whnf-head-reduction-bridge.ts',
  'tools/pskernel-ka37-whnf-head-reduction-bridge-tests.ts',
  'assurance/ka37/whnf-head-reduction-bridge.lean',
  'assurance/ka37/whnf-head-reduction-bridge.json',
  'assurance/ka37/obligation-delta.json',
  'docs/superpowers/plans/2026-09-19-pskernel-ka37-whnf-head-reduction-bridge.md',
];
for (const rel of preRequired) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const result = runKA37WHNFHeadReductionBridgeGate({ strict: true });

const generatedRequired = [
  'assurance/ka37/KA37_RELEASE_GATE.json',
  'assurance/ka37/KA37_REPORT.md',
  'assurance/ka37/KA37_VERIFICATION_SUMMARY.json',
];
for (const rel of generatedRequired) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);

assert.equal(result.checkpoint, 'proofscript-v1-ka37-whnf-head-reduction-bridge0');
assert.equal(result.publicVersion, '1.0.0-pskernel.40');
assert.equal(result.baseline, 'proofscript-v1-ka36-expression-tag-coverage-bridge0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.referenceKind, 'direct-imported-lean4lean-whnf-head-reduction-bridge');
assert.equal(result.actualLean4LeanImportBound, true);
assert.equal(result.strictWHNFHeadReductionBridgePassed, true);
assert.deepEqual(result.coveredLean4LeanWHNFHeadReductionSurface, [
  'WHNF.bvar',
  'WHNF.lam',
  'WHNF.sort',
  'WHNF.forallE',
  'WHRed.beta',
  'WHRed.app',
  'WHRedS.app',
  'WHRedS.determ',
]);
assert.deepEqual(result.formalBridgeLemmas, [
  'PSKernelKA37.translated_whnf_bvar_head_normal',
  'PSKernelKA37.translated_whnf_lam_head_normal',
  'PSKernelKA37.translated_whnf_sort_head_normal',
  'PSKernelKA37.translated_whnf_forall_head_normal',
  'PSKernelKA37.translated_whred_beta_step',
  'PSKernelKA37.translated_whred_app_congruence',
  'PSKernelKA37.translated_whreds_app_congruence',
  'PSKernelKA37.translated_whreds_deterministic',
]);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.claimBoundary.kernelCodecChange, false);
assert.equal(result.claimBoundary.newTrustedComputationRule, false);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.sameTheoryAsFullLean4, false);
assert.equal(result.claimBoundary.fullyFormalK3, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.fullWHNFRecursorRefinement, false);
assert.equal(result.claimBoundary.formalLean4EquivalenceProvenObligations, 90);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, formalObligations: result.claimBoundary.formalLean4EquivalenceProvenObligations }, null, 2));

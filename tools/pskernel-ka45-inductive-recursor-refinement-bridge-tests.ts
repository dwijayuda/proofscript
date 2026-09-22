#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA45InductiveRecursorRefinementBridgeGate } from './pskernel-ka45-inductive-recursor-refinement-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const required = [
  'tools/pskernel-ka45-inductive-recursor-refinement-bridge.ts',
  'tools/pskernel-ka45-inductive-recursor-refinement-bridge-tests.ts',
  'assurance/ka45/inductive-recursor-refinement-bridge.lean',
  'assurance/ka45/inductive-recursor-refinement-bridge.json',
  'assurance/ka45/obligation-delta.json',
  'assurance/ka45/kernel-feature-equivalence-progress.json',
  'docs/superpowers/plans/2026-09-19-pskernel-ka45-inductive-recursor-refinement-bridge.md',
];
for (const rel of required) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const result = runKA45InductiveRecursorRefinementBridgeGate({ strict: true });
for (const rel of [
  'assurance/ka45/KA45_INDUCTIVE_RECURSOR_REFINEMENT_BRIDGE_RELEASE_GATE.json',
  'assurance/ka45/KA45_INDUCTIVE_RECURSOR_REFINEMENT_BRIDGE_REPORT.md',
  'assurance/ka45/KA45_INDUCTIVE_RECURSOR_REFINEMENT_BRIDGE_VERIFICATION_SUMMARY.json',
  'assurance/ka45/KA45_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);

assert.equal(result.checkpoint, 'proofscript-v1-ka45-inductive-recursor-refinement-bridge0');
assert.equal(result.publicVersion, '1.0.0-pskernel.48');
assert.equal(result.baseline, 'proofscript-v1-ka44-end-to-end-checker-refinement-plan0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.referenceKind, 'direct-imported-lean4lean-inductive-recursor-refinement-bridge');
assert.equal(result.actualLean4LeanImportBound, true);
assert.equal(result.strictInductiveRecursorBridgePassed, true);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
assert.deepEqual(result.coveredLean4LeanRecursorSurface, [
  'TypeChecker.Inner.reduceRecursor.WF',
  "TypeChecker.Inner.whnfCore'.WF",
  "TypeChecker.Inner.whnf'.WF",
  'Inductive.Reduce.inductiveReduceRec import-bound',
]);
assert.deepEqual(result.formalBridgeLemmas, [
  'Lean4Lean.PSKernelKA45.translated_reduceRecursor_wf',
  'Lean4Lean.PSKernelKA45.translated_whnfCore_recursor_path_wf',
  'Lean4Lean.PSKernelKA45.translated_whnf_recursor_path_wf',
  'Lean4Lean.PSKernelKA45.translated_inductive_reduce_rec_import_bound',
]);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.claimBoundary.kernelCodecChange, false);
assert.equal(result.claimBoundary.newTrustedComputationRule, false);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.fullInductiveRecursorRefinement, false);
assert.equal(result.claimBoundary.formalLean4EquivalenceProvenObligations, 132);
assert.equal(result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent, 68);
assert.equal(result.featureEquivalenceProgress.executableKernelEquivalenceProofProgressPercent, 34);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, formalObligations: result.claimBoundary.formalLean4EquivalenceProvenObligations }, null, 2));

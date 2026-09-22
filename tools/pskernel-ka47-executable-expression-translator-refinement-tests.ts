#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const required = [
  'tools/pskernel-ka47-executable-expression-translator-refinement.ts',
  'tools/pskernel-ka47-executable-expression-translator-refinement-tests.ts',
  'assurance/ka47/executable-expression-translator-refinement-bridge.lean',
  'assurance/ka47/executable-expression-translator-refinement-bridge.json',
  'assurance/ka47/obligation-delta.json',
  'assurance/ka47/kernel-feature-equivalence-progress.json',
  'docs/superpowers/plans/2026-09-19-pskernel-ka47-executable-expression-translator-refinement.md',
];
for (const rel of required) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const { runKA47ExecutableExpressionTranslatorRefinementGate } = await import('./pskernel-ka47-executable-expression-translator-refinement.ts');
const result = runKA47ExecutableExpressionTranslatorRefinementGate({ strict: false, soft: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka47-executable-expression-translator-refinement-preflight0');
assert.equal(result.publicVersion, '1.0.0-pskernel.50');
assert.equal(result.baseline, 'proofscript-v1-ka46-projection-reduction-refinement-preflight0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.referenceKind, 'source-bound-lean4lean-executable-expression-translator-refinement-preflight');
assert.equal(result.actualLean4LeanImportBound, false);
assert.equal(result.strictExecutableExpressionTranslatorBridgePassed, false);
assert.ok(result.blockedReasons.includes('batteries_4_33_0_rc2_archive_missing') || result.blockedReasons.includes('external_dependency_fetch_failed_or_dependency_unavailable'));
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.claimBoundary.kernelCodecChange, false);
assert.equal(result.claimBoundary.newTrustedComputationRule, false);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.fullExecutableExpressionTranslatorRefinement, false);
assert.equal(result.claimBoundary.formalLean4LeanBridgeObligations, 132);
assert.equal(result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent, 69);
assert.equal(result.featureEquivalenceProgress.executableKernelEquivalenceProofProgressPercent, 34);
for (const rel of [
  'assurance/ka47/KA47_EXECUTABLE_EXPRESSION_TRANSLATOR_REFINEMENT_RELEASE_GATE.json',
  'assurance/ka47/KA47_EXECUTABLE_EXPRESSION_TRANSLATOR_REFINEMENT_REPORT.md',
  'assurance/ka47/KA47_EXECUTABLE_EXPRESSION_TRANSLATOR_REFINEMENT_VERIFICATION_SUMMARY.json',
  'assurance/ka47/KA47_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, formalObligations: result.claimBoundary.formalLean4LeanBridgeObligations, formalLeanCheckStatus: result.formalLeanCheckStatus }, null, 2));

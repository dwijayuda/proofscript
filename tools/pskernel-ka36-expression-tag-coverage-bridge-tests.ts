#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA36ExpressionTagCoverageBridgeGate } from './pskernel-ka36-expression-tag-coverage-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const preRequired = [
  'tools/pskernel-ka36-expression-tag-coverage-bridge.ts',
  'tools/pskernel-ka36-expression-tag-coverage-bridge-tests.ts',
  'assurance/ka36/expression-tag-coverage-bridge.lean',
  'assurance/ka36/expression-tag-coverage-bridge.json',
  'assurance/ka36/obligation-delta.json',
  'docs/superpowers/plans/2026-09-19-pskernel-ka36-expression-tag-coverage-bridge.md',
];
for (const rel of preRequired) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const result = runKA36ExpressionTagCoverageBridgeGate({ strict: true });

const generatedRequired = [
  'assurance/ka36/KA36_RELEASE_GATE.json',
  'assurance/ka36/KA36_REPORT.md',
  'assurance/ka36/KA36_VERIFICATION_SUMMARY.json',
];
for (const rel of generatedRequired) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);

assert.equal(result.checkpoint, 'proofscript-v1-ka36-expression-tag-coverage-bridge0');
assert.equal(result.publicVersion, '1.0.0-pskernel.39');
assert.equal(result.baseline, 'proofscript-v1-ka35-typechecker-refinement-bridge0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.referenceKind, 'direct-imported-lean4lean-expression-tag-coverage-bridge');
assert.equal(result.actualLean4LeanImportBound, true);
assert.equal(result.strictExpressionTagCoverageBridgePassed, true);
assert.deepEqual(result.coveredLean4LeanTrExprSTags, [
  'bvar', 'fvar', 'sort', 'const', 'app', 'lam', 'forallE', 'letE', 'lit', 'mdata', 'proj',
]);
assert.deepEqual(result.formalBridgeLemmas, [
  'PSKernelKA36.translated_bvar_expr_tag_covered',
  'PSKernelKA36.translated_fvar_expr_tag_covered',
  'PSKernelKA36.translated_sort_expr_tag_covered',
  'PSKernelKA36.translated_const_expr_tag_covered',
  'PSKernelKA36.translated_app_expr_tag_covered',
  'PSKernelKA36.translated_lam_expr_tag_covered',
  'PSKernelKA36.translated_forall_expr_tag_covered',
  'PSKernelKA36.translated_let_expr_tag_covered',
  'PSKernelKA36.translated_lit_expr_tag_covered',
  'PSKernelKA36.translated_mdata_expr_tag_covered',
  'PSKernelKA36.translated_proj_expr_tag_covered',
]);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.claimBoundary.kernelCodecChange, false);
assert.equal(result.claimBoundary.newTrustedComputationRule, false);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.sameTheoryAsFullLean4, false);
assert.equal(result.claimBoundary.fullyFormalK3, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.rawLeanExprMVarCoverage, false);
assert.equal(result.claimBoundary.formalLean4EquivalenceProvenObligations, 82);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, formalObligations: result.claimBoundary.formalLean4EquivalenceProvenObligations }, null, 2));

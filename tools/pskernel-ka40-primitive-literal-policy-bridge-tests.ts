#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA40PrimitiveLiteralPolicyBridgeGate } from './pskernel-ka40-primitive-literal-policy-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const preRequired = [
  'tools/pskernel-ka40-primitive-literal-policy-bridge.ts',
  'tools/pskernel-ka40-primitive-literal-policy-bridge-tests.ts',
  'assurance/ka40/primitive-literal-policy-bridge.lean',
  'assurance/ka40/primitive-literal-policy-bridge.json',
  'assurance/ka40/obligation-delta.json',
  'assurance/ka40/kernel-feature-equivalence-progress.json',
  'docs/superpowers/plans/2026-09-19-pskernel-ka40-primitive-literal-policy-bridge.md',
];
for (const rel of preRequired) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const result = runKA40PrimitiveLiteralPolicyBridgeGate({ strict: true });

const generatedRequired = [
  'assurance/ka40/KA40_PRIMITIVE_LITERAL_POLICY_BRIDGE_RELEASE_GATE.json',
  'assurance/ka40/KA40_PRIMITIVE_LITERAL_POLICY_BRIDGE_REPORT.md',
  'assurance/ka40/KA40_PRIMITIVE_LITERAL_POLICY_BRIDGE_VERIFICATION_SUMMARY.json',
  'assurance/ka40/KA40_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
];
for (const rel of generatedRequired) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);

assert.equal(result.checkpoint, 'proofscript-v1-ka40-primitive-literal-policy-bridge0');
assert.equal(result.publicVersion, '1.0.0-pskernel.43');
assert.equal(result.baseline, 'proofscript-v1-ka39-defeq-whnf-refinement-bridge0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.referenceKind, 'direct-imported-lean4lean-primitive-literal-policy-bridge');
assert.equal(result.actualLean4LeanImportBound, true);
assert.equal(result.strictPrimitiveLiteralPolicyBridgePassed, true);
assert.equal(result.directLean4LeanPrimitiveLiteralPolicyBridgeChecked, true);
assert.deepEqual(result.coveredLean4LeanPrimitiveLiteralSurface, [
  'VEnv.ContainsLits natVal',
  'VEnv.ContainsLits strVal',
  'VEnv.HasPrimitives.natZeroT',
  'VEnv.HasPrimitives.natSuccT',
  'VEnv.HasPrimitives.natLitT',
  'VExpr.closedN_natLit',
  'VEnv.HasPrimitives.natIsType',
  'VEnv.HasPrimitives.trNat',
  'VEnv.HasPrimitives.boolLitT',
  'VEnv.HasPrimitives.boolIsType',
  'VEnv.HasPrimitives.trBool',
]);
assert.deepEqual(result.formalBridgeLemmas, [
  'PSKernelKA40.translated_literal_policy_nat_requires_nat',
  'PSKernelKA40.translated_literal_policy_string_requires_primitives',
  'PSKernelKA40.translated_nat_zero_has_type',
  'PSKernelKA40.translated_nat_succ_has_type',
  'PSKernelKA40.translated_nat_literal_has_type',
  'PSKernelKA40.translated_nat_literal_closed',
  'PSKernelKA40.translated_nat_is_type',
  'PSKernelKA40.translated_nat_const_translates',
  'PSKernelKA40.translated_bool_literal_has_type',
  'PSKernelKA40.translated_bool_is_type',
  'PSKernelKA40.translated_bool_const_translates',
]);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.claimBoundary.kernelCodecChange, false);
assert.equal(result.claimBoundary.newTrustedComputationRule, false);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.sameTheoryAsFullLean4, false);
assert.equal(result.claimBoundary.fullyFormalK3, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.fullPrimitiveLiteralPolicyRefinement, false);
assert.equal(result.claimBoundary.formalLean4EquivalenceProvenObligations, 114);
assert.equal(result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent, 58);
assert.equal(result.featureEquivalenceProgress.executableKernelEquivalenceProofProgressPercent, 26);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, formalObligations: result.claimBoundary.formalLean4EquivalenceProvenObligations, featureSurfaceBridgeProgressPercent: result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent }, null, 2));

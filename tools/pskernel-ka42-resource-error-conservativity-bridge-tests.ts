#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runKA42ResourceErrorConservativityBridgeGate } from './pskernel-ka42-resource-error-conservativity-bridge.ts';

for (const rel of [
  'tools/pskernel-ka42-resource-error-conservativity-bridge.ts',
  'assurance/ka42/resource-error-conservativity-bridge.lean',
  'assurance/ka42/resource-error-conservativity-bridge.json',
  'assurance/ka42/obligation-delta.json',
  'assurance/ka42/kernel-feature-equivalence-progress.json',
]) {
  assert.ok(fs.existsSync(rel), `missing ${rel}`);
}

const result = runKA42ResourceErrorConservativityBridgeGate({ strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka42-resource-error-conservativity-bridge0');
assert.equal(result.publicVersion, '1.0.0-pskernel.45');
assert.equal(result.baseline, 'proofscript-v1-ka41-codec-replay-refinement-bridge0');
assert.equal(result.kernel.coreFormat, 71);
assert.equal(result.kernel.certificateFormat, 2);
assert.equal(result.formalLean4LeanBridgeObligations, 128);
assert.equal(result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent, 63);
assert.equal(result.featureEquivalenceProgress.executableKernelEquivalenceProofProgressPercent, 30);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.sameTheoryAsFullLean4, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.fullResourceErrorConservativity, false);
assert.equal(result.directLean4LeanResourceErrorBridgeChecked, true);
assert.equal(result.strictResourceErrorBridgePassed, true);
for (const lemma of [
  'PSKernelKA42.translated_default_rec_depth_policy',
  'PSKernelKA42.translated_default_whnf_policy',
  'PSKernelKA42.translated_default_lazy_delta_policy',
  'PSKernelKA42.translated_zero_fuel_whnf_deep_recursion',
  'PSKernelKA42.translated_zero_fuel_whnfCore_deep_recursion',
  'PSKernelKA42.translated_zero_fuel_inferType_deep_recursion',
  'PSKernelKA42.translated_zero_fuel_isDefEqCore_deep_recursion',
  'PSKernelKA42.translated_except_error_not_success',
]) assert.ok(result.formalBridgeLemmas.includes(lemma), `missing lemma ${lemma}`);
console.log(JSON.stringify(result, null, 2));

#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runKA43TheoryWideRefinementMapGate } from './pskernel-ka43-theory-wide-refinement-map.ts';

for (const rel of [
  'tools/pskernel-ka43-theory-wide-refinement-map.ts',
  'assurance/ka43/theory-wide-refinement-map.json',
  'assurance/ka43/architecture-health-policy.json',
  'assurance/ka43/obligation-delta.json',
  'assurance/ka43/kernel-feature-equivalence-progress.json',
]) {
  assert.ok(fs.existsSync(rel), `missing ${rel}`);
}

const result = runKA43TheoryWideRefinementMapGate({ strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka43-theory-wide-refinement-map0');
assert.equal(result.publicVersion, '1.0.0-pskernel.46');
assert.equal(result.baseline, 'proofscript-v1-ka42-resource-error-conservativity-bridge0');
assert.equal(result.kernel.coreFormat, 71);
assert.equal(result.kernel.certificateFormat, 2);
assert.equal(result.formalLean4LeanBridgeObligations, 128);
assert.equal(result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent, 65);
assert.equal(result.featureEquivalenceProgress.executableKernelEquivalenceProofProgressPercent, 31);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.sameTheoryAsFullLean4, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
assert.equal(result.architectureHealth.newKa43OversizedSourceFiles.length, 0);
assert.equal(result.architectureHealth.semanticPackageTouched, false);
assert.ok(result.refinementMap.closedSinceKA32.includes('inductive-environment-bridge'));
assert.ok(result.refinementMap.nextMilestones.includes('KA44-end-to-end-checker-refinement-plan'));
console.log(JSON.stringify(result, null, 2));

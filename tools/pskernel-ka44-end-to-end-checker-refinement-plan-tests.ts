#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runKA44EndToEndCheckerRefinementPlanGate } from './pskernel-ka44-end-to-end-checker-refinement-plan.ts';

for (const rel of [
  'tools/pskernel-ka44-end-to-end-checker-refinement-plan.ts',
  'assurance/ka44/end-to-end-checker-refinement-plan.json',
  'assurance/ka44/architecture-no-spaghetti-policy.json',
  'assurance/ka44/refinement-module-boundaries.json',
  'assurance/ka44/kernel-feature-equivalence-progress.json',
]) assert.ok(fs.existsSync(rel), `missing ${rel}`);

const result = runKA44EndToEndCheckerRefinementPlanGate({ strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka44-end-to-end-checker-refinement-plan0');
assert.equal(result.publicVersion, '1.0.0-pskernel.47');
assert.equal(result.baseline, 'proofscript-v1-ka43-theory-wide-refinement-map0');
assert.equal(result.kernel.coreFormat, 71);
assert.equal(result.kernel.certificateFormat, 2);
assert.equal(result.formalLean4LeanBridgeObligations, 128);
assert.equal(result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent, 66);
assert.equal(result.featureEquivalenceProgress.executableKernelEquivalenceProofProgressPercent, 33);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
assert.equal(result.architectureHealth.newKa44OversizedSourceFiles.length, 0);
assert.equal(result.architectureHealth.semanticPackageTouched, false);
assert.equal(result.refinementPlan.phases[0].id, 'KA44-refinement-spine');
assert.ok(result.refinementPlan.nextMilestones.includes('KA45-inductive-recursor-refinement-bridge'));
console.log(JSON.stringify(result, null, 2));

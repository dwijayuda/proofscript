#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runKA41CodecReplayRefinementBridgeGate } from './pskernel-ka41-codec-replay-refinement-bridge.ts';

for (const rel of [
  'tools/pskernel-ka41-codec-replay-refinement-bridge.ts',
  'assurance/ka41/codec-replay-refinement-bridge.lean',
  'assurance/ka41/codec-replay-refinement-bridge.json',
  'assurance/ka41/obligation-delta.json',
  'assurance/ka41/kernel-feature-equivalence-progress.json',
]) {
  assert.ok(fs.existsSync(rel), `missing ${rel}`);
}

const result = runKA41CodecReplayRefinementBridgeGate({ strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka41-codec-replay-refinement-bridge0');
assert.equal(result.publicVersion, '1.0.0-pskernel.44');
assert.equal(result.baseline, 'proofscript-v1-ka40-primitive-literal-policy-bridge0');
assert.equal(result.kernel.coreFormat, 71);
assert.equal(result.kernel.certificateFormat, 2);
assert.equal(result.formalLean4LeanBridgeObligations, 120);
assert.equal(result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent, 61);
assert.equal(result.featureEquivalenceProgress.executableKernelEquivalenceProofProgressPercent, 28);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.sameTheoryAsFullLean4, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.fullCodecReplayRefinement, false);
assert.equal(result.directLean4LeanCodecReplayBridgeChecked, true);
assert.equal(result.strictCodecReplayBridgePassed, true);
assert.equal(result.codecRoundTripChecks.canonicalJsonStable, true);
assert.equal(result.codecRoundTripChecks.decodeArtifactRoundTrip, true);
assert.equal(result.codecRoundTripChecks.profileVersionBinding, true);
for (const lemma of [
  'PSKernelKA41.translated_replay_context_lookup_preserved',
  'PSKernelKA41.translated_replay_state_env_preserved',
  'PSKernelKA41.translated_replay_state_num_added_preserved',
  'PSKernelKA41.translated_replay_context_flags_preserved',
  'PSKernelKA41.translated_replay_result_count_preserved',
  'PSKernelKA41.translated_replay_result_env_preserved',
]) assert.ok(result.formalBridgeLemmas.includes(lemma), `missing lemma ${lemma}`);
console.log(JSON.stringify(result, null, 2));

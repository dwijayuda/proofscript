#!/usr/bin/env node
import assert from 'node:assert/strict';
import { acceptsLean433xOrLater, parseLeanToolchain, runKA10Gate } from './pskernel-ka10-target-policy.ts';

assert.deepEqual(parseLeanToolchain('leanprover/lean4:v4.33.0-rc2'), { raw: 'leanprover/lean4:v4.33.0-rc2', major: 4, minor: 33, patch: 0, prerelease: 'rc2' });
assert.equal(acceptsLean433xOrLater('leanprover/lean4:v4.33.0-rc2'), true);
assert.equal(acceptsLean433xOrLater('leanprover/lean4:v4.33.1'), true);
assert.equal(acceptsLean433xOrLater('leanprover/lean4:v4.34.0'), true);
assert.equal(acceptsLean433xOrLater('leanprover/lean4:v4.35.0-rc2'), true);
assert.equal(acceptsLean433xOrLater('leanprover/lean4:v4.32.9'), false);
assert.equal(acceptsLean433xOrLater('leanprover/lean3:v3.51.1'), false);

const gate = runKA10Gate({ soft: true });
assert.equal(gate.checkpoint, 'proofscript-v1-ka10-lean-target-policy0');
assert.match(gate.publicVersion, /^1\.0\.0-pskernel\.\d+$/);
assert.equal(gate.coreFormat, 71);
assert.equal(gate.targetPolicy, 'leanprover/lean4:v4.33.x-or-later');
assert.equal(gate.trustedKernelSemanticChange, false);
assert.equal(gate.kernelCodecChange, false);
assert.equal(gate.newTrustedComputationRule, false);
assert.equal(gate.fullLean4Equivalence, false);
assert.equal(gate.sameTheoryAsFullLean4, false);
assert.equal(gate.formalLean4EquivalenceProvenObligations, 0);
assert.equal(gate.sourcePresent, true);
assert.equal(gate.source.leanToolchain, 'leanprover/lean4:v4.33.0-rc2');
assert.equal(gate.sourceToolchainAcceptedByPolicy, true);
assert.equal(gate.sourceToolchainWouldHaveFailedOldExactPolicy, true);
assert.ok(!gate.blockedReasons.includes('lean4lean_toolchain_mismatch'), 'KA-10 must not block source solely for not being exact v4.33.1');
assert.equal(gate.batteriesRequire.rev, 'v4.33.0-rc2');
assert.ok(gate.batteries.selectedArchive?.name.includes('batteries'), 'expected uploaded batteries archive to be discovered');
assert.equal(gate.batteries.source.leanToolchain, 'leanprover/lean4:v4.33.0-rc2');
assert.equal(gate.batteries.acceptedByLeanPolicy, true);
assert.equal(gate.batteries.exactRequiredRevMaterialized, true);
// KA-10 deliberately audits the dependency; KA-11 performs the path-patched offline build.
assert.equal(gate.strictActualImportPassed, false);
assert.equal(gate.actualLean4LeanImportBound, false);
assert.ok(gate.blockedReasons.some((r: string) => r === 'external_dependency_fetch_failed_or_dependency_unavailable' || r === 'toolchain_or_dependency_toolchain_mismatch' || r === 'lean4lean_lake_build_failed'));
assert.ok(gate.closedByKA10 >= 5);
assert.ok(gate.stillOpenObligations >= 7);

console.log(JSON.stringify({ status: 'passed', checkpoint: gate.checkpoint, targetPolicy: gate.targetPolicy, blockedReasons: gate.blockedReasons }, null, 2));

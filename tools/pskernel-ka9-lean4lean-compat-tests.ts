#!/usr/bin/env node
import assert from 'node:assert/strict';
import { runKA9Gate } from './pskernel-ka9-lean4lean-compat.ts';

const gate = runKA9Gate({ soft: true });

assert.equal(gate.checkpoint, 'proofscript-v1-ka9-lean4lean-compat0');
assert.match(gate.publicVersion, /^1\.0\.0-pskernel\.\d+$/);
assert.equal(gate.coreFormat, 71);
assert.equal(gate.trustedKernelSemanticChange, false);
assert.equal(gate.kernelCodecChange, false);
assert.equal(gate.newTrustedComputationRule, false);
assert.equal(gate.fullLean4Equivalence, false);
assert.equal(gate.sameTheoryAsFullLean4, false);
assert.equal(gate.formalLean4EquivalenceProvenObligations, 0);
assert.ok(gate.archives.length >= 1, 'expected at least one uploaded Lean4Lean archive to be discovered');
assert.ok(gate.selectedArchive?.name.includes('lean4lean'), 'expected selected archive to be Lean4Lean-like');
assert.equal(gate.extraction.status, 'extracted');
assert.equal(gate.actualLean4LeanSourcePresent, true);
assert.deepEqual(gate.source.missingRequired, []);
assert.equal(gate.source.leanToolchain, 'leanprover/lean4:v4.33.0-rc2');
assert.equal(gate.source.expectedToolchain, 'leanprover/lean4:v4.33.1');
assert.equal(gate.source.toolchainMatchesTarget, false);
assert.ok(gate.source.lake.requires.some((r: any) => r.name === 'batteries' && r.rev === 'v4.33.0-rc2'), 'expected batteries v4.33.0-rc2 dependency to be recorded');
assert.equal(gate.strictActualImportPassed, false);
assert.equal(gate.actualLean4LeanImportBound, false);
assert.ok(gate.blockedReasons.includes('lean4lean_toolchain_mismatch'));
assert.ok(gate.blockedReasons.some((r: string) => r === 'external_dependency_fetch_failed_or_dependency_unavailable' || r === 'lean4lean_lake_build_failed'));
assert.ok(gate.closedByKA9 >= 5);
assert.ok(gate.stillOpenObligations >= 7);

console.log(JSON.stringify({ status: 'passed', checkpoint: gate.checkpoint, blockedReasons: gate.blockedReasons }, null, 2));

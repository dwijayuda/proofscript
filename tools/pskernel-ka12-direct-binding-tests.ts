#!/usr/bin/env node
import assert from 'node:assert/strict';
import { runKA12Gate } from './pskernel-ka12-direct-binding.ts';

const gate = runKA12Gate({ strict: true });
assert.equal(gate.checkpoint, 'proofscript-v1-ka12-direct-lean4lean-binding0');
assert.match(gate.publicVersion, /^1\.0\.0-pskernel\.\d+$/);
assert.equal(gate.coreFormat, 71);
assert.equal(gate.bindingKind, 'direct-imported-lean4lean-theory-types');
assert.equal(gate.ka11StrictActualImportPassed, true);
assert.equal(gate.actualLean4LeanImportBound, true);
assert.equal(gate.directLean4LeanTheoryImportChecked, true);
assert.equal(gate.strictDirectImportPassed, true);
assert.deepEqual(gate.blockedReasons, []);
assert.equal(gate.targets.level, 'Lean4Lean.VLevel');
assert.equal(gate.targets.expr, 'Lean4Lean.VExpr');
assert.equal(gate.targets.decl, 'Lean4Lean.VDecl');
assert.ok(gate.coveredPSDeclKinds.includes('definition'));
assert.ok(gate.excludedPSDeclKinds.includes('inductive'));
assert.ok(gate.blockedPSExprTags.includes('mvar'));
assert.ok(gate.closedByKA12 >= 7);
assert.ok(gate.stillOpenObligations >= 5);
assert.equal(gate.trustedKernelSemanticChange, false);
assert.equal(gate.kernelCodecChange, false);
assert.equal(gate.newTrustedComputationRule, false);
assert.equal(gate.fullLean4Equivalence, false);
assert.equal(gate.sameTheoryAsFullLean4, false);
assert.equal(gate.formalLean4EquivalenceProvenObligations, 0);
console.log(JSON.stringify({ status: 'passed', checkpoint: gate.checkpoint, directLean4LeanTheoryImportChecked: gate.directLean4LeanTheoryImportChecked }, null, 2));

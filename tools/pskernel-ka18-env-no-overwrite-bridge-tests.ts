#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA18EnvNoOverwriteBridgeGate } from './pskernel-ka18-env-no-overwrite-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'assurance/ka18/env-no-overwrite-bridge.lean',
  'assurance/ka18/env-no-overwrite-bridge.json',
  'assurance/ka18/obligation-delta.json',
  'assurance/ka18/KA18_REPORT.md',
  'assurance/ka18/KA18_RELEASE_GATE.json',
  'tools/pskernel-ka18-env-no-overwrite-bridge.ts',
  'tools/pskernel-ka18-env-no-overwrite-bridge-tests.ts',
  'docs/superpowers/plans/2026-09-18-pskernel-ka18-env-no-overwrite-bridge.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.match(pkg.version, /^1\.0\.0-pskernel\.(21|2[2-9]|[3-9][0-9])$/);
assert.ok(pkg.scripts['test:pskernel:ka18']);
assert.ok(pkg.scripts['assurance:ka18']);
assert.ok(pkg.scripts['lean:ka18:check']);

const gate = runKA18EnvNoOverwriteBridgeGate({ strict: true });
assert.equal(gate.checkpoint, 'proofscript-v1-ka18-env-no-overwrite-bridge0');
assert.equal(gate.publicVersion, '1.0.0-pskernel.21');
assert.equal(gate.coreFormat, 71);
assert.equal(gate.referenceKind, 'direct-imported-lean4lean-env-no-overwrite-bridge');
assert.equal(gate.actualLean4LeanImportBound, true);
assert.equal(gate.directLean4LeanEnvNoOverwriteBridgeChecked, true);
assert.equal(gate.strictBridgeCheckPassed, true);
assert.deepEqual(gate.blockedReasons, []);
assert.equal(gate.bridgedRelations.includes('Lean4Lean.VEnv.addConst'), true);
assert.equal(gate.bridgedRelations.includes('Lean4Lean.VEnv.constants'), true);
assert.deepEqual(gate.conditionalBridgeLemmas, [
  'PSKernelKA18.translated_axiom_fresh_before_add',
  'PSKernelKA18.translated_definition_fresh_before_add',
  'PSKernelKA18.translated_axiom_preserves_other_lookup',
  'PSKernelKA18.translated_definition_preserves_other_lookup',
]);
assert.equal(gate.trustedKernelSemanticChange, false);
assert.equal(gate.kernelCodecChange, false);
assert.equal(gate.newTrustedComputationRule, false);
assert.equal(gate.fullLean4Equivalence, false);
assert.equal(gate.sameTheoryAsFullLean4, false);
assert.equal(gate.fullyFormalK3, false);
assert.equal(gate.formalLean4EquivalenceProvenObligations, 13);
console.log(JSON.stringify({ status: 'passed', checkpoint: gate.checkpoint, directLean4LeanEnvNoOverwriteBridgeChecked: gate.directLean4LeanEnvNoOverwriteBridgeChecked }, null, 2));

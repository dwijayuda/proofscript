#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA17EnvLookupBridgeGate } from './pskernel-ka17-env-lookup-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'assurance/ka17/env-lookup-bridge.lean',
  'assurance/ka17/env-lookup-bridge.json',
  'assurance/ka17/obligation-delta.json',
  'assurance/ka17/KA17_REPORT.md',
  'assurance/ka17/KA17_RELEASE_GATE.json',
  'tools/pskernel-ka17-env-lookup-bridge.ts',
  'tools/pskernel-ka17-env-lookup-bridge-tests.ts',
  'docs/superpowers/plans/2026-09-18-pskernel-ka17-env-lookup-bridge.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.match(pkg.version, /^1\.0\.0-pskernel\.(20|21|2[2-9]|[3-9][0-9])$/);
assert.ok(pkg.scripts['test:pskernel:ka17']);
assert.ok(pkg.scripts['assurance:ka17']);
assert.ok(pkg.scripts['lean:ka17:check']);

const gate = runKA17EnvLookupBridgeGate({ strict: true });
assert.equal(gate.checkpoint, 'proofscript-v1-ka17-env-lookup-bridge0');
assert.equal(gate.publicVersion, '1.0.0-pskernel.20');
assert.equal(gate.coreFormat, 71);
assert.equal(gate.referenceKind, 'direct-imported-lean4lean-env-lookup-bridge');
assert.equal(gate.actualLean4LeanImportBound, true);
assert.equal(gate.directLean4LeanEnvLookupBridgeChecked, true);
assert.equal(gate.strictBridgeCheckPassed, true);
assert.deepEqual(gate.blockedReasons, []);
assert.equal(gate.bridgedRelations.includes('Lean4Lean.VEnv.constants'), true);
assert.equal(gate.bridgedRelations.includes('Lean4Lean.VEnv.defeqs'), true);
assert.deepEqual(gate.conditionalBridgeLemmas, [
  'PSKernelKA17.translated_axiom_env_lookup',
  'PSKernelKA17.translated_definition_env_lookup',
  'PSKernelKA17.translated_definition_env_defeq_member',
]);
assert.equal(gate.trustedKernelSemanticChange, false);
assert.equal(gate.kernelCodecChange, false);
assert.equal(gate.newTrustedComputationRule, false);
assert.equal(gate.fullLean4Equivalence, false);
assert.equal(gate.sameTheoryAsFullLean4, false);
assert.equal(gate.fullyFormalK3, false);
assert.equal(gate.formalLean4EquivalenceProvenObligations, 9);
console.log(JSON.stringify({ status: 'passed', checkpoint: gate.checkpoint, directLean4LeanEnvLookupBridgeChecked: gate.directLean4LeanEnvLookupBridgeChecked }, null, 2));

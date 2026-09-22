#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA16EnvExtensionBridgeGate } from './pskernel-ka16-env-extension-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'assurance/ka16/env-extension-bridge.lean',
  'assurance/ka16/env-extension-bridge.json',
  'assurance/ka16/obligation-delta.json',
  'assurance/ka16/KA16_REPORT.md',
  'assurance/ka16/KA16_RELEASE_GATE.json',
  'tools/pskernel-ka16-env-extension-bridge.ts',
  'tools/pskernel-ka16-env-extension-bridge-tests.ts',
  'docs/superpowers/plans/2026-09-18-pskernel-ka16-env-extension-bridge.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.match(pkg.version, /^1\.0\.0-pskernel\.\d+$/);
assert.ok(pkg.scripts['test:pskernel:ka16']);
assert.ok(pkg.scripts['assurance:ka16']);
assert.ok(pkg.scripts['lean:ka16:check']);

const gate = runKA16EnvExtensionBridgeGate({ strict: true });
assert.equal(gate.checkpoint, 'proofscript-v1-ka16-env-extension-bridge0');
assert.equal(gate.publicVersion, '1.0.0-pskernel.19');
assert.equal(gate.coreFormat, 71);
assert.equal(gate.referenceKind, 'direct-imported-lean4lean-env-extension-bridge');
assert.equal(gate.actualLean4LeanImportBound, true);
assert.equal(gate.directLean4LeanEnvExtensionBridgeChecked, true);
assert.equal(gate.strictBridgeCheckPassed, true);
assert.deepEqual(gate.blockedReasons, []);
assert.equal(gate.bridgedRelation, 'Lean4Lean.VEnv.LE');
assert.deepEqual(gate.conditionalBridgeLemmas, [
  'PSKernelKA16.translated_axiom_env_extends',
  'PSKernelKA16.translated_definition_env_extends',
]);
assert.equal(gate.trustedKernelSemanticChange, false);
assert.equal(gate.kernelCodecChange, false);
assert.equal(gate.newTrustedComputationRule, false);
assert.equal(gate.fullLean4Equivalence, false);
assert.equal(gate.sameTheoryAsFullLean4, false);
assert.equal(gate.fullyFormalK3, false);
assert.equal(gate.formalLean4EquivalenceProvenObligations, 6);
console.log(JSON.stringify({ status: 'passed', checkpoint: gate.checkpoint, directLean4LeanEnvExtensionBridgeChecked: gate.directLean4LeanEnvExtensionBridgeChecked }, null, 2));

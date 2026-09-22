#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const gate = 'tools/pskernel-ka51-executable-expression-translator-constructor-refinement.ts';
assert.ok(fs.existsSync(gate), 'KA-51 gate tool must exist');
const result = spawnSync(process.execPath, [
  '--experimental-strip-types',
  '--disable-warning=ExperimentalWarning',
  '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
  gate,
  '--strict',
], { encoding: 'utf8' });
assert.equal(result.status, 0, `KA-51 strict gate failed\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
const parsed = JSON.parse(result.stdout.trim());
assert.equal(parsed.status, 'passed');
assert.equal(parsed.checkpoint, 'proofscript-v1-ka51-executable-expression-translator-constructor-refinement0');
assert.equal(parsed.strictLean4LeanUnblocked, true);
assert.equal(parsed.formalLean4LeanBridgeObligations, 140);
for (const rel of [
  'assurance/ka51/KA51_EXECUTABLE_EXPRESSION_TRANSLATOR_CONSTRUCTOR_REFINEMENT_RELEASE_GATE.json',
  'assurance/ka51/KA51_EXECUTABLE_EXPRESSION_TRANSLATOR_CONSTRUCTOR_REFINEMENT_VERIFICATION_SUMMARY.json',
  'assurance/ka51/KA51_EXECUTABLE_EXPRESSION_TRANSLATOR_CONSTRUCTOR_REFINEMENT_REPORT.md',
  'assurance/ka51/KA51_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka51/KA51_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
  'assurance/ka51/executable-expression-translator-constructor-refinement-bridge-spec.json',
]) assert.ok(fs.existsSync(rel), `expected ${rel}`);
console.log('✓ KA-51 executable expression translator constructor refinement strict gate passed and emitted required artifacts');

#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const gate = 'tools/pskernel-ka91-primitive-logical-bitwise-recognizer-refinement.ts';
assert.ok(fs.existsSync(gate), 'KA-91 gate tool must exist');
const result = spawnSync(process.execPath, [
  '--experimental-strip-types',
  '--disable-warning=ExperimentalWarning',
  '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
  gate,
  '--strict',
], { encoding: 'utf8' });
assert.equal(result.status, 0, `KA-91 strict gate failed\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
const parsed = JSON.parse(result.stdout.trim());
assert.equal(parsed.status, 'passed');
assert.equal(parsed.checkpoint, 'proofscript-v1-ka91-primitive-logical-bitwise-recognizer-refinement0');
assert.equal(parsed.obligationsAdded, 3);
assert.equal(parsed.totalObligations, 281);
for (const rel of [
  'assurance/ka91/KA91_PRIMITIVE_LOGICAL_BITWISE_RECOGNIZER_REFINEMENT_RELEASE_GATE.json',
  'assurance/ka91/KA91_PRIMITIVE_LOGICAL_BITWISE_RECOGNIZER_REFINEMENT_VERIFICATION_SUMMARY.json',
  'assurance/ka91/KA91_PRIMITIVE_LOGICAL_BITWISE_RECOGNIZER_REFINEMENT_REPORT.md',
  'assurance/ka91/KA91_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka91/KA91_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
  'assurance/ka91/primitive-logical-bitwise-recognizer-refinement-bridge.lean',
]) assert.ok(fs.existsSync(rel), `expected ${rel}`);
console.log('✓ KA-91 strict gate passed and emitted required artifacts');

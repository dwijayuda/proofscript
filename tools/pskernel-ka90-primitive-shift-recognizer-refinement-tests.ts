#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const gate = 'tools/pskernel-ka90-primitive-shift-recognizer-refinement.ts';
assert.ok(fs.existsSync(gate), 'KA-90 gate tool must exist');
const result = spawnSync(process.execPath, [
  '--experimental-strip-types',
  '--disable-warning=ExperimentalWarning',
  '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
  gate,
  '--strict',
], { encoding: 'utf8' });
assert.equal(result.status, 0, `KA-90 strict gate failed\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
const parsed = JSON.parse(result.stdout.trim());
assert.equal(parsed.status, 'passed');
assert.equal(parsed.checkpoint, 'proofscript-v1-ka90-primitive-shift-recognizer-refinement0');
assert.equal(parsed.obligationsAdded, 2);
assert.equal(parsed.totalObligations, 278);
for (const rel of [
  'assurance/ka90/KA90_PRIMITIVE_SHIFT_RECOGNIZER_REFINEMENT_RELEASE_GATE.json',
  'assurance/ka90/KA90_PRIMITIVE_SHIFT_RECOGNIZER_REFINEMENT_VERIFICATION_SUMMARY.json',
  'assurance/ka90/KA90_PRIMITIVE_SHIFT_RECOGNIZER_REFINEMENT_REPORT.md',
  'assurance/ka90/KA90_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka90/KA90_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
  'assurance/ka90/primitive-shift-recognizer-refinement-bridge.lean',
]) assert.ok(fs.existsSync(rel), `expected ${rel}`);
console.log('✓ KA-90 strict gate passed and emitted required artifacts');

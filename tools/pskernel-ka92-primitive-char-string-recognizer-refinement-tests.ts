#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const gate = 'tools/pskernel-ka92-primitive-char-string-recognizer-refinement.ts';
assert.ok(fs.existsSync(gate), 'KA-92 gate tool must exist');
const result = spawnSync(process.execPath, [
  '--experimental-strip-types',
  '--disable-warning=ExperimentalWarning',
  '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
  gate,
  '--strict',
], { encoding: 'utf8' });
assert.equal(result.status, 0, `KA-92 strict gate failed\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
const parsed = JSON.parse(result.stdout.trim());
assert.equal(parsed.status, 'passed');
assert.equal(parsed.checkpoint, 'proofscript-v1-ka92-primitive-char-string-recognizer-refinement0');
assert.equal(parsed.obligationsAdded, 2);
assert.equal(parsed.totalObligations, 283);
for (const rel of [
  'assurance/ka92/primitive-char-string-recognizer-refinement-bridge.lean',
  'assurance/ka92/KA92_PRIMITIVE_CHAR_STRING_RECOGNIZER_REFINEMENT_REPORT.md',
  'assurance/ka92/KA92_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
  'assurance/ka92/KA92_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka92/KA92_PRIMITIVE_CHAR_STRING_RECOGNIZER_REFINEMENT_RELEASE_GATE.json',
  'assurance/ka92/KA92_PRIMITIVE_CHAR_STRING_RECOGNIZER_REFINEMENT_VERIFICATION_SUMMARY.json',
  'assurance/ka92/KA92_PRIMITIVE_CHAR_STRING_RECOGNIZER_REFINEMENT_BRIDGE_SPEC.json',
]) assert.ok(fs.existsSync(rel), `expected generated artifact ${rel}`);
console.log('✓ KA-92 primitive char/string recognizer strict gate passed');

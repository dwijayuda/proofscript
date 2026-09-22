#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const gate = 'tools/pskernel-ka50-feature-equivalence-audit-refresh.ts';
assert.ok(fs.existsSync(gate), 'KA-50 gate tool must exist');
const result = spawnSync(process.execPath, [
  '--experimental-strip-types',
  '--disable-warning=ExperimentalWarning',
  '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
  gate,
  '--strict',
], { encoding: 'utf8' });
assert.equal(result.status, 0, `KA-50 strict gate failed\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
const parsed = JSON.parse(result.stdout.trim());
assert.equal(parsed.status, 'passed');
assert.equal(parsed.checkpoint, 'proofscript-v1-ka50-feature-equivalence-audit-refresh0');
assert.equal(parsed.strictLean4LeanUnblocked, true);
assert.equal(parsed.formalLean4LeanBridgeObligations, 136);
for (const rel of [
  'assurance/ka50/KA50_FEATURE_EQUIVALENCE_AUDIT_REFRESH_RELEASE_GATE.json',
  'assurance/ka50/KA50_FEATURE_EQUIVALENCE_AUDIT_REFRESH_VERIFICATION_SUMMARY.json',
  'assurance/ka50/KA50_FEATURE_EQUIVALENCE_AUDIT_REFRESH_REPORT.md',
  'assurance/ka50/KA50_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka50/KA50_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
  'assurance/ka50/feature-equivalence-audit-refresh-bridge-spec.json',
]) assert.ok(fs.existsSync(rel), `expected ${rel}`);
console.log('✓ KA-50 audit refresh strict gate passed and emitted required artifacts');

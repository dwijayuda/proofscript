#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const tool = path.join(root, 'tools/pskernel-ka71-feature-equivalence-coverage-audit.ts');

assert.ok(fs.existsSync(tool), 'KA71 coverage-audit gate tool must exist');

const r = spawnSync(process.execPath, [
  '--experimental-strip-types',
  '--disable-warning=ExperimentalWarning',
  '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
  tool,
  '--strict'
], { cwd: root, encoding: 'utf8', env: { ...process.env, TERM: process.env.TERM ?? 'xterm' } });

if (r.status !== 0) {
  console.error(r.stdout);
  console.error(r.stderr);
}
assert.equal(r.status, 0, 'KA71 coverage-audit strict gate must pass');
const result = JSON.parse(r.stdout);
assert.equal(result.status, 'passed');
assert.equal(result.checkpoint, 'proofscript-v1-ka71-feature-equivalence-coverage-audit0');
assert.equal(result.publicVersion, '1.0.0-pskernel.74');
assert.equal(result.baseline, 'proofscript-v1-ka70-executable-defeq-unit-proj-refinement0');
assert.equal(result.formalLean4LeanBridgeObligations, 216);
assert.equal(result.newFormalLean4LeanBridgeObligations, 0);
assert.equal(result.auditedFeatureSurfaceBridgeProgressPercent, 88);
assert.equal(result.auditedExecutableKernelEquivalenceProofProgressPercent, 54);
assert.equal(result.auditClassification.proofBearingCheckpoints, 21);
assert.equal(result.auditClassification.preflightOrScaffoldCheckpoints, 4);
assert.equal(result.auditClassification.unresolvedScaffoldCheckpoints, 1);
console.log('✓ KA71 feature-equivalence coverage audit gate passed');

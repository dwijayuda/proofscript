#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const tool = path.join(root, 'tools/pskernel-ka73-defeq-sorry-boundary-audit.ts');

assert.ok(fs.existsSync(tool), 'KA73 sorry-boundary audit gate tool must exist');

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
assert.equal(r.status, 0, 'KA73 sorry-boundary audit strict gate must pass');
const result = JSON.parse(r.stdout);
assert.equal(result.status, 'passed');
assert.equal(result.checkpoint, 'proofscript-v1-ka73-defeq-sorry-boundary-audit0');
assert.equal(result.publicVersion, '1.0.0-pskernel.76');
assert.equal(result.baseline, 'proofscript-v1-ka72-executable-defeq-eta-cache-status-refinement0');
assert.equal(result.newFormalLean4LeanBridgeObligations, 0);
assert.equal(result.ledgerCorrectionFormalLean4LeanBridgeObligations, -1);
assert.equal(result.formalLean4LeanBridgeObligations, 219);
assert.equal(result.auditFindings.demotedCountedObligations.length, 1);
assert.equal(result.auditFindings.demotedCountedObligations[0].name, 'translated_isDefEqUnitLike_wf');
assert.equal(result.auditFindings.demotedCountedObligations[0].reason, 'upstream_theorem_body_contains_sorry');
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
console.log('✓ KA73 DefEq sorry-boundary audit gate passed');

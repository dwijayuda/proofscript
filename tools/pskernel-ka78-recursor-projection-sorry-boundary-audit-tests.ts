#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const tool = path.join(root, 'tools/pskernel-ka78-recursor-projection-sorry-boundary-audit.ts');

assert.ok(fs.existsSync(tool), 'KA78 recursor/projection sorry-boundary audit gate tool must exist');

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
assert.equal(r.status, 0, 'KA78 recursor/projection sorry-boundary audit strict gate must pass');
const result = JSON.parse(r.stdout);
assert.equal(result.status, 'passed');
assert.equal(result.checkpoint, 'proofscript-v1-ka78-recursor-projection-sorry-boundary-audit0');
assert.equal(result.publicVersion, '1.0.0-pskernel.81');
assert.equal(result.baseline, 'proofscript-v1-ka77-executable-infer-structural-refinement0');
assert.equal(result.newFormalLean4LeanBridgeObligations, 0);
assert.equal(result.ledgerCorrectionFormalLean4LeanBridgeObligations, -3);
assert.equal(result.formalLean4LeanBridgeObligations, 232);
assert.equal(result.auditFindings.demotedDirectSorryBackedObligations.length, 3);
assert.deepEqual(result.auditFindings.demotedDirectSorryBackedObligations.map((x: any) => x.name).sort(), [
  'translated_inferProj_wf',
  'translated_reduceProjCore_wf',
  'translated_reduceRecursor_wf'
].sort());
assert.equal(result.auditFindings.dependencyRiskObligations.length >= 3, true);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
console.log('✓ KA78 recursor/projection sorry-boundary audit gate passed');

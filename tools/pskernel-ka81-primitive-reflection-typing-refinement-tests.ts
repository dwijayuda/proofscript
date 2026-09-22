#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const tool = path.join(root, 'tools/pskernel-ka81-primitive-reflection-typing-refinement.ts');
const lean = path.join(root, 'assurance/ka81/primitive-reflection-typing-refinement-bridge.lean');

assert.ok(fs.existsSync(tool), 'KA81 gate tool must exist');
assert.ok(fs.existsSync(lean), 'KA81 Lean bridge must exist');

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
assert.equal(r.status, 0, 'KA81 strict gate must pass');
const result = JSON.parse(r.stdout);
assert.equal(result.status, 'passed');
assert.equal(result.checkpoint, 'proofscript-v1-ka81-primitive-reflection-typing-refinement0');
assert.equal(result.publicVersion, '1.0.0-pskernel.84');
assert.equal(result.baseline, 'proofscript-v1-ka80-infertype-top-level-projection-boundary-audit0');
assert.equal(result.baselineObligations, 237);
assert.equal(result.newFormalLean4LeanBridgeObligations, 5);
assert.equal(result.formalLean4LeanBridgeObligations, 242);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
console.log('✓ KA81 primitive reflection typing refinement gate passed');

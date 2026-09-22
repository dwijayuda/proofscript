#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA14ArenaRealCorpusGate } from './pskernel-ka14-real-arena-corpus.ts';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'assurance/ka14/arena-real-corpus.json',
  'assurance/ka14/obligation-delta.json',
  'assurance/ka14/KA14_REPORT.md',
  'assurance/ka14/KA14_RELEASE_GATE.json',
  'tools/pskernel-ka14-real-arena-corpus.ts',
  'tools/pskernel-ka14-real-arena-corpus-tests.ts',
  'docs/superpowers/plans/2026-09-18-pskernel-ka14-real-arena-corpus.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.match(pkg.version, /^1\.0\.0-pskernel\.\d+$/);
assert.ok(pkg.scripts['test:pskernel:ka14']);
assert.ok(pkg.scripts['assurance:ka14']);
assert.ok(pkg.scripts['arena:ka14:verify']);
const gate = runKA14ArenaRealCorpusGate({ strict: true });
assert.equal(gate.checkpoint, 'proofscript-v1-ka14-real-arena-corpus0');
assert.equal(gate.publicVersion, '1.0.0-pskernel.17');
assert.equal(gate.coreFormat, 71);
assert.equal(gate.realArenaCorpusAvailable, true);
assert.equal(gate.ndjsonCount, 190);
assert.equal(gate.staticNonperf.fullStaticAgreement, true);
assert.equal(gate.staticNonperf.acceptedGood, 4);
assert.equal(gate.staticNonperf.rejectedBad, 22);
assert.equal(gate.tutorial.fullArenaTutorial, true);
assert.equal(gate.tutorial.acceptedGood, 93);
assert.equal(gate.tutorial.rejectedBad, 47);
assert.equal(gate.verifyArenaPassed, true);
assert.equal(gate.trustedKernelSemanticChange, false);
assert.equal(gate.kernelCodecChange, false);
assert.equal(gate.newTrustedComputationRule, false);
assert.equal(gate.fullLean4Equivalence, false);
assert.equal(gate.sameTheoryAsFullLean4, false);
assert.equal(gate.fullyFormalK3, false);
assert.equal(gate.formalLean4EquivalenceProvenObligations, 2);
console.log(JSON.stringify({ status: 'passed', checkpoint: gate.checkpoint, ndjsonCount: gate.ndjsonCount }, null, 2));

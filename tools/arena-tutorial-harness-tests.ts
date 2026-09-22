import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-arena-tutorial-harness-'));
const fixturesDir = path.join(tempDir, 'fixtures');
const goodDir = path.join(fixturesDir, 'good');
const badDir = path.join(fixturesDir, 'bad');
const goodTutorialDir = path.join(goodDir, 'tutorial');
const badTutorialDir = path.join(badDir, 'tutorial');
fs.mkdirSync(goodTutorialDir, { recursive: true });
fs.mkdirSync(badTutorialDir, { recursive: true });

function writeNdjson(file, records) {
  fs.writeFileSync(file, `${records.map((record) => JSON.stringify(record)).join('\n')}\n`);
}

const meta = {
  meta: {
    exporter: { name: 'proofscript-arena-tutorial-harness', version: '0.0.0' },
    lean: { githash: '819816b2e0a3bf405af45ae5c7af2491d8f5bee6', version: '4.33.1' },
    format: { version: '3.1.0' },
  },
};

writeNdjson(path.join(goodTutorialDir, '001_basicDef.ndjson'), [
  meta,
  { str: { pre: 0, str: 'basicDef' }, in: 1 },
  { succ: 0, il: 1 },
  { sort: 1, ie: 1 },
  { sort: 0, ie: 2 },
  { def: { name: 1, levelParams: [], type: 1, value: 2, hints: { regular: 0 }, safety: 'safe', all: [] } },
]);

writeNdjson(path.join(badTutorialDir, '002_badDef.ndjson'), [
  meta,
  { str: { pre: 0, str: 'badDef' }, in: 1 },
  { sort: 0, ie: 1 },
  { succ: 0, il: 1 },
  { sort: 1, ie: 2 },
  { def: { name: 1, levelParams: [], type: 1, value: 2, hints: { regular: 0 }, safety: 'safe', all: [] } },
]);

writeNdjson(path.join(goodTutorialDir, '034_empty.ndjson'), [
  meta,
  { inductive: { types: [], ctors: [], recs: [] } },
]);

const manifest = path.join(tempDir, 'manifest.json');
fs.writeFileSync(manifest, JSON.stringify({
  schemaVersion: 1,
  checkpoint: 'P5.78-arena-tutorial-harness0-test',
  entries: [
    { name: 'tutorial/001_basicDef', outcome: 'accept' },
    { name: 'tutorial/002_badDef', outcome: 'reject' },
    { name: 'tutorial/034_empty', outcome: 'accept' },
    { name: 'tutorial/999_missing', outcome: 'accept' },
  ],
}, null, 2));
const report = path.join(tempDir, 'report.json');
const run = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/arena-tutorial-runner.ts', '--manifest', manifest, '--fixtures-dir', fixturesDir, '--out', report], {
  cwd: repoRoot,
  env: { ...process.env, NODE_OPTIONS: '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON' },
  encoding: 'utf8',
});
assert.equal(run.status, 0, `tutorial harness should exit 0 for no wrong results\nstdout=${run.stdout}\nstderr=${run.stderr}`);
const summary = JSON.parse(fs.readFileSync(report, 'utf8'));
assert.equal(summary.counts.total, 4);
assert.equal(summary.counts.expectedAccept, 3);
assert.equal(summary.counts.expectedReject, 1);
assert.equal(summary.counts.acceptedGood, 1);
assert.equal(summary.counts.rejectedBad, 1);
assert.equal(summary.counts.declinedUnsupported, 1);
assert.equal(summary.counts.notRun, 1);
assert.equal(summary.counts.wrongAccepts, 0);
assert.equal(summary.counts.wrongRejects, 0);
assert.equal(summary.counts.checkerCrashes, 0);
assert.equal(summary.fullArenaTutorial, false);
assert.equal(summary.fullLean4Equivalence, false);
assert.equal(summary.formalLean4EquivalenceProvenObligations, 0);

const defaultRun = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/arena-tutorial-runner.ts'], {
  cwd: repoRoot,
  env: { ...process.env, NODE_OPTIONS: '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON' },
  encoding: 'utf8',
});
assert.equal(defaultRun.status, 0, `default tutorial manifest should exit 0 with absent fixtures counted as not-run\nstdout=${defaultRun.stdout}\nstderr=${defaultRun.stderr}`);
const defaultSummary = JSON.parse(defaultRun.stdout);
assert.equal(defaultSummary.counts.total, 140);
assert.equal(defaultSummary.counts.expectedAccept, 93);
assert.equal(defaultSummary.counts.expectedReject, 47);
assert.equal(defaultSummary.counts.wrongAccepts, 0);
assert.equal(defaultSummary.counts.wrongRejects, 0);
assert.equal(defaultSummary.counts.checkerCrashes, 0);
if (fs.existsSync('/mnt/data/arena-corpus-20260915')) {
  assert.equal(defaultSummary.counts.acceptedGood, 93);
  assert.equal(defaultSummary.counts.rejectedBad, 47);
  assert.equal(defaultSummary.counts.notRun, 0);
  assert.equal(defaultSummary.fullArenaTutorial, true);
} else {
  assert.equal(defaultSummary.counts.notRun, 140);
  assert.equal(defaultSummary.fullArenaTutorial, false);
}
assert.equal(defaultSummary.publicArenaReady, false);
console.log('ARENA_TUTORIAL_HARNESS0=PASS');

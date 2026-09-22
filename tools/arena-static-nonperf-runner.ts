#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const checker = path.join(repoRoot, 'packages', 'arena-checker', 'dist', 'main.js');

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
function boolArg(name) { return process.argv.includes(name); }
function usage(exitCode) {
  console.log(`Usage: node tools/arena-static-nonperf-runner.ts [--fixtures-dir dir] [--out file] [--strict-agreement]\n\nRuns the small non-performance, non-tutorial Lean Kernel Arena fixtures that have stable accept/reject expectations in results.json. Declines are counted as gaps unless --strict-agreement is set.`);
  process.exit(exitCode);
}
if (boolArg('--help')) usage(0);

const fixturesDir = path.resolve(argValue('--fixtures-dir') ?? process.env.PROOFSCRIPT_ARENA_CORPUS_DIR ?? '/mnt/data/arena-corpus-20260915');
const outPath = path.resolve(argValue('--out') ?? path.join(repoRoot, 'artifacts', 'arena', 'P5_94_ARENA_STATIC_NONPERF_REPORT.json'));
const strictAgreement = boolArg('--strict-agreement');

const entries = [
  ['bad/bogus1.ndjson', 'reject'],
  ['bad/constlevels.ndjson', 'reject'],
  ['bad/ctor-num-fields.ndjson', 'reject'],
  ['bad/extra-rec.ndjson', 'reject'],
  ['bad/k-rec-conv.ndjson', 'reject'],
  ['bad/large-elim-param.ndjson', 'reject'],
  ['bad/large-elim-prop-bool.ndjson', 'reject'],
  ['bad/level-imax-leq.ndjson', 'reject'],
  ['bad/level-imax-normalization.ndjson', 'reject'],
  ['bad/nat-rec-k-lie.ndjson', 'reject'],
  ['bad/nat-rec-rules.ndjson', 'reject'],
  ['bad/nested-unused-param.ndjson', 'reject'],
  ['bad/orphan-ctor.ndjson', 'reject'],
  ['bad/orphan-rec.ndjson', 'reject'],
  ['bad/proj-non-structure.ndjson', 'reject'],
  ['bad/proj-of-imax-prop.ndjson', 'reject'],
  ['bad/proj-of-prop.ndjson', 'reject'],
  ['bad/proj-of-stuck-prop.ndjson', 'reject'],
  ['bad/proj-of-subst-prop.ndjson', 'reject'],
  ['bad/rec-k-lie.ndjson', 'reject'],
  ['bad/rec-missing-ih.ndjson', 'reject'],
  ['bad/rec-of-subst-prop.ndjson', 'reject'],
  ['good/corner-cases/proof-param-ok.ndjson', 'accept'],
  ['good/level-index-out-of-order.ndjson', 'accept'],
  ['good/proof-irrel.ndjson', 'accept'],
  ['good/sparse-name-index.ndjson', 'accept'],
];

function runChecker(file) {
  const run = spawnSync(process.execPath, [checker, file], {
    cwd: repoRoot,
    env: { ...process.env, NODE_OPTIONS: '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON' },
    encoding: 'utf8',
    timeout: 30000,
  });
  if (run.error) return { exitCode: null, stdout: run.stdout ?? '', stderr: run.stderr ?? '', error: run.error.message };
  return { exitCode: run.status, stdout: run.stdout ?? '', stderr: run.stderr ?? '' };
}

function classify(expected, exitCode) {
  if (expected === 'accept' && exitCode === 0) return 'acceptedGood';
  if (expected === 'reject' && exitCode === 1) return 'rejectedBad';
  if (exitCode === 2) return 'declinedUnsupported';
  if (expected === 'reject' && exitCode === 0) return 'wrongAccepts';
  if (expected === 'accept' && exitCode === 1) return 'wrongRejects';
  return 'checkerCrashes';
}

const counts = {
  total: entries.length,
  expectedAccept: 0,
  expectedReject: 0,
  acceptedGood: 0,
  rejectedBad: 0,
  declinedUnsupported: 0,
  wrongAccepts: 0,
  wrongRejects: 0,
  checkerCrashes: 0,
  notRun: 0,
};
const results = [];
for (const [rel, expected] of entries) {
  if (expected === 'accept') counts.expectedAccept++; else counts.expectedReject++;
  const file = path.join(fixturesDir, rel);
  if (!fs.existsSync(file)) {
    counts.notRun++;
    results.push({ rel, expected, category: 'notRun', exitCode: null, message: 'fixture not found' });
    continue;
  }
  const run = runChecker(file);
  const category = classify(expected, run.exitCode);
  counts[category]++;
  let parsed;
  try { parsed = JSON.parse(String(run.stdout || '').trim().split(/\r?\n/).at(-1) || '{}'); } catch {}
  results.push({ rel, expected, exitCode: run.exitCode, category, status: parsed?.status, message: parsed?.message ?? run.error ?? run.stderr.trim() });
}
const report = {
  schemaVersion: 1,
  checkpoint: 'P5.94-arena-nested-helper-target-validation0',
  checker: 'proofscript-arena-adapter0',
  fixturesDir,
  counts,
  strictAgreement,
  noWrongResults: counts.wrongAccepts === 0 && counts.wrongRejects === 0 && counts.checkerCrashes === 0,
  fullStaticAgreement: counts.notRun === 0 && counts.declinedUnsupported === 0 && counts.wrongAccepts === 0 && counts.wrongRejects === 0 && counts.checkerCrashes === 0,
  publicArenaReady: false,
  fullLean4Equivalence: false,
  fullyFormalK3: false,
  formalLean4EquivalenceProvenObligations: 0,
  results,
};
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...report, results: undefined }, null, 2));
const bad = counts.wrongAccepts + counts.wrongRejects + counts.checkerCrashes + (strictAgreement ? counts.declinedUnsupported + counts.notRun : 0);
process.exitCode = bad === 0 ? 0 : 1;

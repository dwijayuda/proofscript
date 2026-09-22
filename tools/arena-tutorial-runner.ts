#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const defaultManifest = path.join(repoRoot, 'config', 'arena-tutorial-manifest.json');
const checker = path.join(repoRoot, 'packages', 'arena-checker', 'dist', 'main.js');

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function boolArg(name) { return process.argv.includes(name); }
const verbose = boolArg('--verbose');

function usage(exitCode) {
  console.log(`Usage: node tools/arena-tutorial-runner.ts [--manifest file] [--fixtures-dir dir] [--out file] [--strict-files]\n\nRuns available Lean Kernel Arena tutorial NDJSON fixtures with ProofScript's arena checker.\nMissing fixture files are counted as notRun by default so this command can be used before the real Arena corpus is downloaded.`);
  process.exit(exitCode);
}

if (boolArg('--help')) usage(0);

function readJson(file, label) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`${label} is not readable JSON: ${detail}`);
    process.exit(1);
  }
}

function expectedExitForOutcome(outcome) {
  if (outcome === 'accept') return 0;
  if (outcome === 'reject') return 1;
  throw new Error(`unsupported manifest outcome ${String(outcome)}`);
}

function candidateFixturePaths(entry, fixturesDir) {
  const paths = [];
  if (entry.ndjsonPath) paths.push(path.resolve(repoRoot, entry.ndjsonPath));
  if (fixturesDir) {
    const baseName = entry.name.replace(/^tutorial\//, '');
    const classDir = entry.outcome === 'accept' ? 'good' : 'bad';
    paths.push(path.join(fixturesDir, classDir, `${baseName}.ndjson`));
    paths.push(path.join(fixturesDir, classDir, entry.name.endsWith('.ndjson') ? entry.name : `${entry.name}.ndjson`));
    paths.push(path.join(fixturesDir, `${entry.name}.ndjson`));
    paths.push(path.join(fixturesDir, `${baseName}.ndjson`));
  }
  return paths;
}

function firstExisting(paths) { return paths.find((p) => fs.existsSync(p) && fs.statSync(p).isFile()); }

function runChecker(file) {
  const run = spawnSync(process.execPath, [checker, file], {
    cwd: repoRoot,
    env: { ...process.env, NODE_OPTIONS: '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON' },
    encoding: 'utf8',
    timeout: 30000,
  });
  if (run.error) {
    return { exitCode: null, status: 'checker-error', message: run.error.message, stdout: run.stdout ?? '', stderr: run.stderr ?? '' };
  }
  return { exitCode: run.status, status: 'completed', stdout: run.stdout ?? '', stderr: run.stderr ?? '' };
}

function classify(entry, file, run) {
  const expected = expectedExitForOutcome(entry.outcome);
  if (run.exitCode === expected) return entry.outcome === 'accept' ? 'acceptedGood' : 'rejectedBad';
  if (run.exitCode === 2) return 'declinedUnsupported';
  if (run.exitCode === 0 && entry.outcome === 'reject') return 'wrongAccepts';
  if (run.exitCode === 1 && entry.outcome === 'accept') return 'wrongRejects';
  return 'checkerCrashes';
}

const manifestPath = path.resolve(argValue('--manifest') ?? defaultManifest);
const defaultFixturesDir = process.env.PROOFSCRIPT_ARENA_CORPUS_DIR ?? process.env.ARENA_FIXTURES_DIR ?? '/mnt/data/arena-corpus-20260915';
const fixturesDir = argValue('--fixtures-dir') ? path.resolve(argValue('--fixtures-dir')) : path.resolve(defaultFixturesDir);
const outPath = argValue('--out') ? path.resolve(argValue('--out')) : path.join(repoRoot, 'artifacts', 'arena', 'P5_94_ARENA_TUTORIAL_REPORT.json');
const strictFiles = boolArg('--strict-files');
const manifest = readJson(manifestPath, 'manifest');
const entries = Array.isArray(manifest.entries) ? manifest.entries : undefined;
if (!entries) {
  console.error('manifest.entries must be an array');
  process.exit(1);
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
for (const entry of entries) {
  if (entry.outcome !== 'accept' && entry.outcome !== 'reject') throw new Error(`bad outcome for ${entry.name}`);
  if (entry.outcome === 'accept') counts.expectedAccept++; else counts.expectedReject++;
  const fixture = firstExisting(candidateFixturePaths(entry, fixturesDir));
  if (!fixture) {
    if (strictFiles) {
      counts.checkerCrashes++;
      results.push({ name: entry.name, outcome: entry.outcome, status: 'missing-fixture', category: 'checkerCrashes' });
    } else {
      counts.notRun++;
      results.push({ name: entry.name, outcome: entry.outcome, status: 'not-run', category: 'notRun' });
    }
    continue;
  }
  const run = runChecker(fixture);
  const category = classify(entry, fixture, run);
  counts[category]++;
  let parsed;
  try { parsed = JSON.parse(String(run.stdout || '').trim().split(/\r?\n/).at(-1) || '{}'); } catch {}
  results.push({ name: entry.name, outcome: entry.outcome, fixture: path.relative(repoRoot, fixture), category, exitCode: run.exitCode, checkerStatus: parsed?.status, message: parsed?.message ?? run.stderr.trim() });
}
const summary = {
  schemaVersion: 1,
  checkpoint: 'P5.94-arena-nested-helper-target-validation0',
  checker: 'proofscript-arena-adapter0',
  manifest: path.relative(repoRoot, manifestPath),
  fixturesDir: fixturesDir ? path.relative(repoRoot, fixturesDir) : null,
  observedArenaTutorial: manifest.observedArenaTutorial ?? null,
  counts,
  publicArenaReady: false,
  fullArenaTutorial: counts.notRun === 0 && counts.checkerCrashes === 0 && counts.wrongAccepts === 0 && counts.wrongRejects === 0 && counts.declinedUnsupported === 0,
  fullLean4Equivalence: false,
  fullyFormalK3: false,
  formalLean4EquivalenceProvenObligations: 0,
  results,
};
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(summary, null, 2)}\n`);
const printable = verbose ? summary : { ...summary, results: undefined };
console.log(JSON.stringify(printable, null, 2));
const bad = counts.wrongAccepts + counts.wrongRejects + counts.checkerCrashes;
process.exitCode = bad === 0 ? 0 : 1;

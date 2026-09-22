#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
function hasArg(name: string): boolean { return process.argv.includes(name); }

const fixturesDir = path.resolve(
  argValue('--fixtures-dir')
    ?? process.env.PROOFSCRIPT_ARENA_CORPUS_DIR
    ?? process.env.ARENA_FIXTURES_DIR
    ?? '/mnt/data/arena-corpus-20260915',
);

const requiredFixtures = [
  // Full verify:arena begins with these hand-picked adversarial tests.
  'bad/extra-rec.ndjson',
  'bad/orphan-rec.ndjson',
  // Static non-performance corpus sentinels.
  'bad/bogus1.ndjson',
  'good/corner-cases/proof-param-ok.ndjson',
  // Tutorial sentinels covering expected accept/reject and later dependent-field checks.
  'good/tutorial/001_basicDef.ndjson',
  'bad/tutorial/002_badDef.ndjson',
  'good/tutorial/036_empty.ndjson',
  'good/tutorial/074_existsRec.ndjson',
  'good/tutorial/086_PSigma.snd.ndjson',
];

const missingRequired = requiredFixtures.filter((rel) => !fs.existsSync(path.join(fixturesDir, rel)));
let ndjsonCount = 0;
if (fs.existsSync(fixturesDir)) {
  const stack = [fixturesDir];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(child);
      else if (entry.isFile() && entry.name.endsWith('.ndjson')) ndjsonCount++;
    }
  }
}

const parsedMinimum = Number(argValue('--min-ndjson') ?? '166');
const minimumExpectedNdjson = Number.isFinite(parsedMinimum) && parsedMinimum >= 0 ? parsedMinimum : 166; // 140 tutorial + 26 static non-performance fixtures.
const hasEnoughNdjson = ndjsonCount >= minimumExpectedNdjson;
const status = missingRequired.length === 0 && hasEnoughNdjson ? 'arena_corpus_available' : 'arena_corpus_missing';
const report = {
  schemaVersion: 1,
  status,
  fixturesDir,
  requiredFixtures,
  missingRequired,
  ndjsonCount,
  minimumExpectedNdjson,
  hasEnoughNdjson,
  expectedLayout: 'Lean Kernel Arena corpus root containing good/... and bad/... NDJSON fixtures',
  remedy: status === 'arena_corpus_missing'
    ? 'Materialize or extract the Lean Kernel Arena corpus to this directory, or set PROOFSCRIPT_ARENA_CORPUS_DIR/ARENA_FIXTURES_DIR.'
    : null,
  fullLean4Equivalence: false,
  fullyFormalK3: false,
  formalLean4EquivalenceProvenObligations: 0,
};

console.log(JSON.stringify(report, null, 2));
if (hasArg('--soft')) process.exit(0);
process.exit(status === 'arena_corpus_available' ? 0 : 1);

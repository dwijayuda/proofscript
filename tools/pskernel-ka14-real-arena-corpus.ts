#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const exists = (rel: string) => fs.existsSync(path.join(root, rel));

type StrictOptions = { strict?: boolean };

export function runKA14ArenaRealCorpusGate(options: StrictOptions = {}) {
  for (const rel of [
    'assurance/ka13/KA13_RELEASE_GATE.json',
    'assurance/ka14/arena-real-corpus.json',
    'assurance/ka14/obligation-delta.json',
    'assurance/ka14/KA14_REPORT.md',
    'assurance/ka14/KA14_RELEASE_GATE.json',
    'artifacts/arena/P5_94_ARENA_STATIC_NONPERF_REPORT.json',
    'artifacts/arena/P5_94_ARENA_TUTORIAL_REPORT.json',
  ]) assert.ok(exists(rel), `missing ${rel}`);

  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const gate = readJson('assurance/ka14/KA14_RELEASE_GATE.json');
  const spec = readJson('assurance/ka14/arena-real-corpus.json');
  const delta = readJson('assurance/ka14/obligation-delta.json');
  const staticReport = readJson('artifacts/arena/P5_94_ARENA_STATIC_NONPERF_REPORT.json');
  const tutorialReport = readJson('artifacts/arena/P5_94_ARENA_TUTORIAL_REPORT.json');

  assert.match(pkg.version, /^1\.0\.0-pskernel\.\d+$/);
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.equal(versions.implementation, pkg.version);
  assert.ok(String(versions.latestLocalLineageCheckpoint).startsWith('proofscript-v1-ka'));
  assert.equal(versions.ka14Checkpoint, 'proofscript-v1-ka14-real-arena-corpus0');
  assert.equal(versions.ka14TrustedSemanticChange, false);
  assert.equal(versions.ka14KernelCodecChange, false);
  assert.equal(versions.ka14NewTrustedComputationRule, false);
  assert.equal(versions.ka14VerifyArenaPassed, true);

  assert.equal(gate.checkpoint, 'proofscript-v1-ka14-real-arena-corpus0');
  assert.equal(gate.publicVersion, '1.0.0-pskernel.17');
  assert.equal(gate.kernel.coreArtifactFormat, 71);
  assert.equal(gate.kernel.trustedSemanticChange, false);
  assert.equal(gate.kernel.kernelCodecChange, false);
  assert.equal(gate.kernel.newTrustedComputationRule, false);
  assert.equal(gate.verifyArenaPassed, true);

  assert.equal(spec.corpus.ndjsonCount, 190);
  assert.equal(spec.staticNonperf.total, 26);
  assert.equal(spec.staticNonperf.acceptedGood, 4);
  assert.equal(spec.staticNonperf.rejectedBad, 22);
  assert.equal(spec.staticNonperf.wrongAccepts, 0);
  assert.equal(spec.staticNonperf.wrongRejects, 0);
  assert.equal(spec.staticNonperf.checkerCrashes, 0);
  assert.equal(spec.staticNonperf.notRun, 0);
  assert.equal(spec.staticNonperf.fullStaticAgreement, true);
  assert.equal(spec.tutorial.total, 140);
  assert.equal(spec.tutorial.acceptedGood, 93);
  assert.equal(spec.tutorial.rejectedBad, 47);
  assert.equal(spec.tutorial.wrongAccepts, 0);
  assert.equal(spec.tutorial.wrongRejects, 0);
  assert.equal(spec.tutorial.checkerCrashes, 0);
  assert.equal(spec.tutorial.notRun, 0);
  assert.equal(spec.tutorial.fullArenaTutorial, true);

  assert.deepEqual(staticReport.counts, {
    total: 26,
    expectedAccept: 4,
    expectedReject: 22,
    acceptedGood: 4,
    rejectedBad: 22,
    declinedUnsupported: 0,
    wrongAccepts: 0,
    wrongRejects: 0,
    checkerCrashes: 0,
    notRun: 0,
  });
  assert.equal(staticReport.fullStaticAgreement, true);
  assert.deepEqual(tutorialReport.counts, {
    total: 140,
    expectedAccept: 93,
    expectedReject: 47,
    acceptedGood: 93,
    rejectedBad: 47,
    declinedUnsupported: 0,
    wrongAccepts: 0,
    wrongRejects: 0,
    checkerCrashes: 0,
    notRun: 0,
  });
  assert.equal(tutorialReport.fullArenaTutorial, true);

  assert.equal(delta.previousFormalLean4EquivalenceProvenObligations, 2);
  assert.equal(delta.newFormalLean4EquivalenceProvenObligations, 0);
  assert.equal(delta.totalFormalLean4EquivalenceProvenObligations, 2);
  assert.equal(gate.claimBoundary.fullLean4Equivalence, false);
  assert.equal(gate.claimBoundary.sameTheoryAsFullLean4, false);
  assert.equal(gate.claimBoundary.fullyFormalK3, false);
  assert.equal(gate.claimBoundary.formalLean4EquivalenceProvenObligations, 2);

  const result = {
    checkpoint: gate.checkpoint,
    publicVersion: gate.publicVersion,
    coreFormat: gate.kernel.coreArtifactFormat,
    certificateFormat: gate.kernel.certificateFormat,
    realArenaCorpusAvailable: spec.corpus.requiredSentinelsAvailable,
    ndjsonCount: spec.corpus.ndjsonCount,
    staticNonperf: spec.staticNonperf,
    tutorial: spec.tutorial,
    verifyArenaPassed: gate.verifyArenaPassed,
    trustedKernelSemanticChange: gate.kernel.trustedSemanticChange,
    kernelCodecChange: gate.kernel.kernelCodecChange,
    newTrustedComputationRule: gate.kernel.newTrustedComputationRule,
    fullLean4Equivalence: gate.claimBoundary.fullLean4Equivalence,
    sameTheoryAsFullLean4: gate.claimBoundary.sameTheoryAsFullLean4,
    fullyFormalK3: gate.claimBoundary.fullyFormalK3,
    formalLean4EquivalenceProvenObligations: gate.claimBoundary.formalLean4EquivalenceProvenObligations,
  };
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    console.log(JSON.stringify(runKA14ArenaRealCorpusGate({ strict: process.argv.includes('--strict') }), null, 2));
  } catch (error: any) {
    console.error(JSON.stringify({ status: 'failed', message: error.message }, null, 2));
    process.exit(process.argv.includes('--strict') ? 2 : 1);
  }
}

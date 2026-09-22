#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  classifyDeclarationForKA3,
  translateNonInductiveDeclaration,
  nonInductiveSampleSuite,
  runKA3Assurance,
} from './pskernel-ka3-soundness.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const exists = (rel: string) => fs.existsSync(path.join(root, rel));

for (const rel of [
  'assurance/ka3/reference-model.json',
  'assurance/ka3/noninductive-soundness.json',
  'assurance/ka3/noninductive-soundness-skeleton.lean',
  'assurance/ka3/KA3_REPORT.md',
]) assert.ok(exists(rel), `missing KA-3 artifact ${rel}`);

assert.equal(classifyDeclarationForKA3({ kind: 'definition' }).status, 'supported-noninductive');
assert.equal(classifyDeclarationForKA3({ kind: 'inductive' }).status, 'outside-ka3-noninductive-slice');
assert.equal(classifyDeclarationForKA3({ kind: 'quot' }).status, 'outside-ka3-noninductive-slice');

const translated = translateNonInductiveDeclaration({
  kind: 'definition',
  name: 'zeroAlias',
  levelParams: [],
  type: { tag: 'const', name: 'Nat', levels: [] },
  value: { tag: 'const', name: 'Nat.zero', levels: [] },
});
assert.equal(translated.status, 'translated');
assert.equal(translated.value.kind, 'defnInfo');
assert.ok(translated.obligations.includes('ka3.soundness.noninductive.translation-shape'));

const blockedInductive = translateNonInductiveDeclaration({ kind: 'inductive', name: 'T' });
assert.equal(blockedInductive.status, 'blocked');
assert.match(blockedInductive.reason, /outside KA-3/);

const samples = nonInductiveSampleSuite();
assert.equal(samples.total, 8);
assert.equal(samples.translatedSupported, 5);
assert.equal(samples.blockedExcluded, 3);
assert.equal(samples.wronglyTranslated, 0);

const gate = runKA3Assurance();
assert.equal(gate.status, 'passed');
assert.match(gate.publicVersion, /^1\.0\.0-pskernel\.\d+$/);
assert.equal(gate.coreFormat, 71);
assert.equal(gate.leanCheckedHere, false);
assert.equal(gate.fullLean4Equivalence, false);
assert.equal(gate.formalLean4EquivalenceProvenObligations, 0);
assert.equal(gate.ka3ClosedObligations, 5);
assert.equal(gate.ka3StillOpenObligations, 9);

const model = readJson('assurance/ka3/reference-model.json');
assert.equal(model.schema, 'proofscript.assurance.ka3.reference-model/v1');
assert.equal(model.targetLean.version, '4.33.1');
assert.equal(model.nonInductiveSlice.enabled, true);
assert.deepEqual(model.nonInductiveSlice.declarationKinds, ['axiom','definition','theorem','example','opaque']);
assert.equal(model.leanCheckedHere, false);

const soundness = readJson('assurance/ka3/noninductive-soundness.json');
assert.equal(soundness.schema, 'proofscript.assurance.ka3.noninductive-soundness/v1');
assert.ok(soundness.closedByKA3.includes('ka3.soundness.noninductive.translation-shape'));
assert.ok(soundness.stillOpen.includes('soundness.defEq'));

const versions = readJson('versions.json');
assert.equal(versions.implementation, readJson('package.json').version);
assert.match(versions.latestLocalLineageCheckpoint, /^proofscript-v1-ka\d+-/);
assert.equal(versions.ka3TrustedSemanticChange, false);
assert.equal(versions.ka3LeanCheckedHere, false);

console.log('PSKERNEL_KA3_NONINDUCTIVE_SOUNDNESS=PASS');

#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  translateLevel,
  translateTerm,
  translateDeclaration,
  translationCoverage,
  runKA2Assurance,
} from './pskernel-ka2-translation.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const exists = (rel: string) => fs.existsSync(path.join(root, rel));

for (const rel of [
  'assurance/ka2/translation-relation.json',
  'assurance/ka2/translation-obligations-delta.json',
  'assurance/ka2/translation-soundness-skeleton.lean',
  'assurance/ka2/KA2_REPORT.md',
]) assert.ok(exists(rel), `missing KA-2 artifact ${rel}`);

const lvl = translateLevel({ tag: 'max', left: { tag: 'zero' }, right: { tag: 'succ', of: { tag: 'param', name: 'u' } } });
assert.equal(lvl.status, 'translated');
assert.deepEqual(lvl.value, { tag: 'max', left: { tag: 'zero' }, right: { tag: 'succ', of: { tag: 'param', name: 'u' } } });

const blockedLevel = translateLevel({ tag: 'mvar', name: '?u' });
assert.equal(blockedLevel.status, 'blocked');
assert.match(blockedLevel.reason, /metavariable/);

const term = translateTerm({
  tag: 'pi',
  binderInfo: 'implicit',
  domain: { tag: 'sort', level: { tag: 'zero' } },
  body: { tag: 'const', name: 'Nat', levels: [] },
});
assert.equal(term.status, 'translated');
assert.equal(term.value.tag, 'forallE');
assert.equal(term.value.binderInfo, 'implicit');

const blockedTerm = translateTerm({ tag: 'const', name: 'T', levels: [{ tag: 'mvar', name: '?bad' }] });
assert.equal(blockedTerm.status, 'blocked');
assert.match(blockedTerm.reason, /level/);

const decl = translateDeclaration({
  kind: 'definition',
  name: 'idNat',
  levelParams: [],
  reducibility: 'regular',
  type: { tag: 'const', name: 'Nat', levels: [] },
  value: { tag: 'const', name: 'Nat.zero', levels: [] },
});
assert.equal(decl.status, 'translated');
assert.equal(decl.value.kind, 'defnInfo');
assert.equal(decl.value.hints.kind, 'regular');

const cov = translationCoverage();
for (const tag of ['zero','succ','max','imax','param']) assert.ok(cov.levelTags.translated.includes(tag));
assert.ok(cov.levelTags.blocked.includes('mvar'));
for (const tag of ['sort','bvar','const','app','lam','pi','let','lit','proj']) assert.ok(cov.termTags.translated.includes(tag));
assert.ok(cov.exprTags.blocked.includes('mvar'));
assert.ok(cov.declarationKinds.translated.includes('definition'));
assert.ok(cov.declarationKinds.translated.includes('mutualInductive'));

const gate = runKA2Assurance();
assert.equal(gate.status, 'passed');
assert.equal(gate.publicVersion, readJson('package.json').version);
assert.equal(gate.coreFormat, 71);
assert.equal(gate.fullLean4Equivalence, false);
assert.equal(gate.formalLean4EquivalenceProvenObligations, 0);
assert.equal(gate.translatedLevelTags, 5);
assert.equal(gate.blockedLevelTags, 1);

const relation = readJson('assurance/ka2/translation-relation.json');
assert.equal(relation.schema, 'proofscript.assurance.ka2.translation-relation/v1');
assert.equal(relation.status, 'executable-translation-scaffold-not-equivalence-proof');
assert.equal(relation.targetLean.version, '4.33.1');
assert.equal(relation.pscore.formatVersion, 71);
assert.equal(relation.fullLean4Equivalence, false);
assert.equal(relation.formalLean4EquivalenceProvenObligations, 0);
assert.ok(relation.mapping.levelTags.length >= 6);
assert.ok(relation.mapping.termTags.length >= 9);
assert.ok(relation.mapping.declarationKinds.length >= 8);

const delta = readJson('assurance/ka2/translation-obligations-delta.json');
assert.equal(delta.schema, 'proofscript.assurance.ka2.translation-obligations-delta/v1');
assert.ok(delta.closedByKA2.includes('translation.level.shape'));
assert.ok(delta.closedByKA2.includes('translation.term.shape'));
assert.ok(delta.stillOpen.includes('soundness.checkDecl'));
assert.ok(delta.stillOpen.includes('soundness.defEq'));

const versions = readJson('versions.json');
assert.equal(versions.implementation, readJson('package.json').version);
assert.ok(String(versions.ka2Assurance).includes('translation'));
assert.ok(String(versions.latestLocalLineageCheckpoint).startsWith('proofscript-v1-'));
assert.equal(versions.ka2TrustedSemanticChange, false);

console.log('PSKERNEL_KA2_TRANSLATION=PASS');

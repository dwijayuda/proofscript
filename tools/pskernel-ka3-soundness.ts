#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { translateDeclaration, type TranslationResult, type LeanRefDecl } from './pskernel-ka2-translation.ts';

type AnyRecord = Record<string, any>;

type Classification =
  | { status: 'supported-noninductive'; kind: string; obligations: string[] }
  | { status: 'outside-ka3-noninductive-slice'; kind: string; obligations: string[] }
  | { status: 'unknown-declaration-kind'; kind: string; obligations: string[] };

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel: string) => fs.existsSync(path.join(root, rel));

const supportedNonInductive = new Set(['axiom', 'definition', 'theorem', 'example', 'opaque']);
const excludedFromKA3 = new Set(['quot', 'inductive', 'mutualInductive']);

export function classifyDeclarationForKA3(decl: AnyRecord): Classification {
  const kind = String(decl?.kind ?? '');
  if (supportedNonInductive.has(kind)) {
    return {
      status: 'supported-noninductive',
      kind,
      obligations: ['ka3.soundness.noninductive.classifier-totality'],
    };
  }
  if (excludedFromKA3.has(kind)) {
    return {
      status: 'outside-ka3-noninductive-slice',
      kind,
      obligations: ['ka3.soundness.noninductive.slice-boundary'],
    };
  }
  return {
    status: 'unknown-declaration-kind',
    kind,
    obligations: ['ka3.soundness.noninductive.classifier-totality'],
  };
}

function addObligation<T>(result: TranslationResult<T>, obligation: string): TranslationResult<T> {
  return { ...result, obligations: [...new Set([...result.obligations, obligation])] } as TranslationResult<T>;
}

export function translateNonInductiveDeclaration(decl: AnyRecord): TranslationResult<LeanRefDecl> {
  const classification = classifyDeclarationForKA3(decl);
  if (classification.status !== 'supported-noninductive') {
    return {
      status: 'blocked',
      sourceTag: classification.kind,
      reason: `declaration kind ${classification.kind || '<missing>'} is outside KA-3 non-inductive slice`,
      obligations: classification.obligations,
    };
  }

  const translated = translateDeclaration(decl);
  if (translated.status === 'blocked') {
    return addObligation(translated, 'ka3.soundness.noninductive.metavariable-exclusion') as TranslationResult<LeanRefDecl>;
  }

  if (translated.value.kind === 'quotInfo' || translated.value.kind === 'inductInfo' || translated.value.kind === 'mutualInductInfo') {
    return {
      status: 'blocked',
      sourceTag: classification.kind,
      reason: `KA-3 classifier admitted non-inductive kind ${classification.kind}, but translator produced ${translated.value.kind}`,
      obligations: ['ka3.soundness.noninductive.translation-shape'],
    };
  }

  return {
    status: 'translated',
    value: translated.value,
    obligations: [
      ...new Set([
        ...translated.obligations,
        ...classification.obligations,
        'ka3.soundness.noninductive.translation-shape',
        'ka3.soundness.noninductive.no-trusted-kernel-change',
      ]),
    ],
  };
}

function sampleDeclarations(): AnyRecord[] {
  const nat = { tag: 'const', name: 'Nat', levels: [] };
  const zero = { tag: 'const', name: 'Nat.zero', levels: [] };
  return [
    { kind: 'axiom', name: 'A', levelParams: [], type: nat },
    { kind: 'definition', name: 'zeroAlias', levelParams: [], type: nat, value: zero },
    { kind: 'theorem', name: 'zeroThm', levelParams: [], type: nat, value: zero },
    { kind: 'example', name: 'zeroExample', levelParams: [], type: nat, value: zero },
    { kind: 'opaque', name: 'opaqueZero', levelParams: [], type: nat, value: zero },
    { kind: 'inductive', name: 'T', type: nat, constructors: [] },
    { kind: 'quot', name: 'Quot' },
    { kind: 'definition', name: 'badMVar', type: nat, value: { tag: 'mvar', name: '?bad' } },
  ];
}

export function nonInductiveSampleSuite() {
  const samples = sampleDeclarations();
  let translatedSupported = 0;
  let blockedExcluded = 0;
  let wronglyTranslated = 0;
  const details = samples.map((decl) => {
    const classification = classifyDeclarationForKA3(decl);
    const result = translateNonInductiveDeclaration(decl);
    if (classification.status === 'supported-noninductive' && result.status === 'translated') translatedSupported += 1;
    if (result.status === 'blocked') blockedExcluded += 1;
    if (classification.status !== 'supported-noninductive' && result.status === 'translated') wronglyTranslated += 1;
    return {
      kind: decl.kind,
      name: decl.name ?? null,
      classification: classification.status,
      translation: result.status,
      reason: result.status === 'blocked' ? result.reason : null,
    };
  });
  return {
    total: samples.length,
    translatedSupported,
    blockedExcluded,
    wronglyTranslated,
    details,
  };
}

export function runKA3Assurance() {
  const required = [
    'assurance/ka1/lean-4.33.1-kernel-inventory.json',
    'assurance/ka1/pscore-v71-spec.json',
    'assurance/ka2/translation-relation.json',
    'assurance/ka2/translation-obligations-delta.json',
    'assurance/ka3/reference-model.json',
    'assurance/ka3/noninductive-soundness.json',
    'assurance/ka3/noninductive-soundness-skeleton.lean',
    'assurance/ka3/KA3_REPORT.md',
  ];
  for (const rel of required) assert.ok(exists(rel), `missing ${rel}`);

  const pkg = readJson('package.json');
  const versions = readJson('versions.json');
  const model = readJson('assurance/ka3/reference-model.json');
  const soundness = readJson('assurance/ka3/noninductive-soundness.json');
  const skeleton = read('assurance/ka3/noninductive-soundness-skeleton.lean');
  const samples = nonInductiveSampleSuite();

  assert.match(pkg.version, /^1\.0\.0-pskernel\.\d+$/);
  assert.equal(versions.implementation, pkg.version);
  assert.equal(versions.defaultKernelCoreFormat, 71);
  assert.equal(versions.ka3TrustedSemanticChange, false);
  assert.equal(model.schema, 'proofscript.assurance.ka3.reference-model/v1');
  assert.equal(model.nonInductiveSlice.enabled, true);
  assert.equal(model.proofBoundary.leanCheckedHere, false);
  assert.equal(soundness.schema, 'proofscript.assurance.ka3.noninductive-soundness/v1');
  assert.equal(soundness.claimBoundary.formalLean4EquivalenceProvenObligations, 0);
  assert.equal(samples.total, soundness.sampleSuite.total);
  assert.equal(samples.translatedSupported, soundness.sampleSuite.supportedNonInductive);
  assert.equal(samples.blockedExcluded, soundness.sampleSuite.excludedOrBlocked);
  assert.equal(samples.wronglyTranslated, 0);
  assert.match(skeleton, /namespace PSKernelKA3/);
  assert.match(skeleton, /theorem noninductive_kind_translation_sound/);
  assert.match(skeleton, /theorem unsupported_kind_translation_blocked/);
  assert.match(skeleton, /theorem mdata_erasure_shape/);
  assert.doesNotMatch(skeleton, /sorry/);

  return {
    status: 'passed',
    checkpoint: 'proofscript-v1-ka3-noninductive-soundness0',
    publicVersion: pkg.version,
    coreFormat: 71,
    trustedKernelSemanticChange: false,
    kernelCodecChange: false,
    newTrustedComputationRule: false,
    leanCheckedHere: false,
    fullLean4Equivalence: false,
    sameTheoryAsFullLean4: false,
    fullyFormalK3: false,
    formalLean4EquivalenceProvenObligations: 0,
    supportedNonInductiveKinds: supportedNonInductive.size,
    excludedDeclarationKinds: excludedFromKA3.size,
    sampleTotal: samples.total,
    sampleTranslatedSupported: samples.translatedSupported,
    sampleBlockedExcluded: samples.blockedExcluded,
    sampleWronglyTranslated: samples.wronglyTranslated,
    ka3ClosedObligations: soundness.closedByKA3.length,
    ka3StillOpenObligations: soundness.stillOpen.length,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(runKA3Assurance(), null, 2));
}

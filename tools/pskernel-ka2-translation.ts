#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

export type TranslationResult<T> =
  | { status: 'translated'; value: T; obligations: string[] }
  | { status: 'blocked'; reason: string; sourceTag?: string; obligations: string[] };

type AnyRecord = Record<string, any>;

export type LeanRefLevel =
  | { tag: 'zero' }
  | { tag: 'succ'; of: LeanRefLevel }
  | { tag: 'max'; left: LeanRefLevel; right: LeanRefLevel }
  | { tag: 'imax'; left: LeanRefLevel; right: LeanRefLevel }
  | { tag: 'param'; name: string };

export type LeanRefExpr =
  | { tag: 'sort'; level: LeanRefLevel }
  | { tag: 'bvar'; index: number }
  | { tag: 'const'; name: string; levels: LeanRefLevel[] }
  | { tag: 'app'; fn: LeanRefExpr; arg: LeanRefExpr }
  | { tag: 'lam'; name: string; type: LeanRefExpr; body: LeanRefExpr; binderInfo: string }
  | { tag: 'forallE'; name: string; type: LeanRefExpr; body: LeanRefExpr; binderInfo: string }
  | { tag: 'letE'; name: string; type: LeanRefExpr; value: LeanRefExpr; body: LeanRefExpr; nondep: boolean }
  | { tag: 'lit'; literal: AnyRecord }
  | { tag: 'proj'; structName: string; idx: number; expr: LeanRefExpr };

export type LeanRefDecl =
  | { kind: 'axiomInfo'; name: string; levelParams: string[]; type: LeanRefExpr }
  | { kind: 'defnInfo'; name: string; levelParams: string[]; type: LeanRefExpr; value: LeanRefExpr; hints: { kind: 'regular' | 'abbrev' }; safety: 'safe' }
  | { kind: 'thmInfo'; name: string; levelParams: string[]; type: LeanRefExpr; value: LeanRefExpr }
  | { kind: 'opaqueInfo'; name: string; levelParams: string[]; type: LeanRefExpr; value: LeanRefExpr }
  | { kind: 'quotInfo'; name: string; levelParams: string[] }
  | { kind: 'inductInfo'; name: string; levelParams: string[]; type: LeanRefExpr; numParams: number; numIndices: number; constructors: { name: string; type: LeanRefExpr }[] }
  | { kind: 'mutualInductInfo'; name: string; levelParams: string[]; inductives: Extract<LeanRefDecl, { kind: 'inductInfo' }>[] };

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel: string) => fs.existsSync(path.join(root, rel));

function translated<T>(value: T, obligations: string[] = []): TranslationResult<T> {
  return { status: 'translated', value, obligations };
}
function blocked<T>(reason: string, sourceTag: string | undefined, obligations: string[] = []): TranslationResult<T> {
  return { status: 'blocked', reason, sourceTag, obligations };
}
function combineObligations(...parts: TranslationResult<any>[]): string[] {
  return [...new Set(parts.flatMap(p => p.obligations))];
}

export function translateLevel(level: AnyRecord): TranslationResult<LeanRefLevel> {
  switch (level?.tag) {
    case 'zero': return translated({ tag: 'zero' }, ['translation.level.shape']);
    case 'param': return translated({ tag: 'param', name: String(level.name) }, ['translation.level.shape', 'translation.level.param-scope']);
    case 'succ': {
      const of = translateLevel(level.of);
      if (of.status === 'blocked') return of;
      return translated({ tag: 'succ', of: of.value }, combineObligations(of, translated(null, ['translation.level.shape'])));
    }
    case 'max':
    case 'imax': {
      const left = translateLevel(level.left);
      const right = translateLevel(level.right);
      if (left.status === 'blocked') return left;
      if (right.status === 'blocked') return right;
      return translated({ tag: level.tag, left: left.value, right: right.value }, combineObligations(left, right, translated(null, ['translation.level.shape', 'translation.level.normalization-compatibility'])));
    }
    case 'mvar':
      return blocked('unresolved universe metavariable is excluded from trusted PSCore v71', 'mvar', ['translation.level.metavariable-exclusion']);
    default:
      return blocked(`unknown level tag: ${level?.tag}`, level?.tag, ['translation.level.totality']);
  }
}

function translateLevels(levels: readonly AnyRecord[] = []): TranslationResult<LeanRefLevel[]> {
  const out: LeanRefLevel[] = [];
  const obligations: string[] = [];
  for (const level of levels) {
    const r = translateLevel(level);
    if (r.status === 'blocked') return blocked(`blocked level in universe argument list: ${r.reason}`, r.sourceTag, r.obligations);
    out.push(r.value);
    obligations.push(...r.obligations);
  }
  return translated(out, [...new Set(obligations)]);
}

export function translateTerm(term: AnyRecord): TranslationResult<LeanRefExpr> {
  switch (term?.tag) {
    case 'sort': {
      const level = translateLevel(term.level);
      if (level.status === 'blocked') return blocked(`sort level blocked: ${level.reason}`, level.sourceTag, level.obligations);
      return translated({ tag: 'sort', level: level.value }, combineObligations(level, translated(null, ['translation.term.sort'])));
    }
    case 'bvar': return translated({ tag: 'bvar', index: Number(term.index) }, ['translation.term.bound-variable']);
    case 'const': {
      const levels = translateLevels(term.levels ?? []);
      if (levels.status === 'blocked') return blocked(`const level blocked: ${levels.reason}`, levels.sourceTag, levels.obligations);
      return translated({ tag: 'const', name: String(term.name), levels: levels.value }, combineObligations(levels, translated(null, ['translation.term.constant'])));
    }
    case 'app': {
      const fn = translateTerm(term.fn);
      const arg = translateTerm(term.arg);
      if (fn.status === 'blocked') return fn;
      if (arg.status === 'blocked') return arg;
      return translated({ tag: 'app', fn: fn.value, arg: arg.value }, combineObligations(fn, arg, translated(null, ['translation.term.application'])));
    }
    case 'lam': {
      const domain = translateTerm(term.domain ?? term.type);
      const body = translateTerm(term.body);
      if (domain.status === 'blocked') return domain;
      if (body.status === 'blocked') return body;
      return translated({ tag: 'lam', name: String(term.name ?? '_'), type: domain.value, body: body.value, binderInfo: String(term.binderInfo ?? 'explicit') }, combineObligations(domain, body, translated(null, ['translation.term.lambda'])));
    }
    case 'pi':
    case 'forallE': {
      const domain = translateTerm(term.domain ?? term.type);
      const body = translateTerm(term.body);
      if (domain.status === 'blocked') return domain;
      if (body.status === 'blocked') return body;
      return translated({ tag: 'forallE', name: String(term.name ?? '_'), type: domain.value, body: body.value, binderInfo: String(term.binderInfo ?? 'explicit') }, combineObligations(domain, body, translated(null, ['translation.term.forall'])));
    }
    case 'let':
    case 'letE': {
      const type = translateTerm(term.type);
      const value = translateTerm(term.value);
      const body = translateTerm(term.body);
      if (type.status === 'blocked') return type;
      if (value.status === 'blocked') return value;
      if (body.status === 'blocked') return body;
      return translated({ tag: 'letE', name: String(term.name ?? '_'), type: type.value, value: value.value, body: body.value, nondep: Boolean(term.nondep) }, combineObligations(type, value, body, translated(null, ['translation.term.let'])));
    }
    case 'lit': return translated({ tag: 'lit', literal: term.literal }, ['translation.term.literal-adapter']);
    case 'proj': {
      const expr = translateTerm(term.expr);
      if (expr.status === 'blocked') return expr;
      return translated({ tag: 'proj', structName: String(term.structName ?? term.typeName), idx: Number(term.idx ?? term.index), expr: expr.value }, combineObligations(expr, translated(null, ['translation.term.projection'])));
    }
    case 'mdata': {
      const expr = translateTerm(term.expr);
      if (expr.status === 'blocked') return expr;
      return translated(expr.value, combineObligations(expr, translated(null, ['translation.term.metadata-erasure'])));
    }
    case 'fvar': return blocked('free variables are adapter-normalized before trusted Core translation', 'fvar', ['translation.expr.fvar-exclusion']);
    case 'mvar': return blocked('expression metavariables are forbidden before trusted Core translation', 'mvar', ['translation.expr.mvar-exclusion']);
    default: return blocked(`unknown term tag: ${term?.tag}`, term?.tag, ['translation.term.totality']);
  }
}

function translateTypeValue(type: AnyRecord, value?: AnyRecord): TranslationResult<{ type: LeanRefExpr; value?: LeanRefExpr }> {
  const t = translateTerm(type);
  if (t.status === 'blocked') return blocked(`declaration type blocked: ${t.reason}`, t.sourceTag, t.obligations);
  if (value === undefined) return translated({ type: t.value }, t.obligations);
  const v = translateTerm(value);
  if (v.status === 'blocked') return blocked(`declaration value blocked: ${v.reason}`, v.sourceTag, v.obligations);
  return translated({ type: t.value, value: v.value }, combineObligations(t, v));
}

export function translateDeclaration(decl: AnyRecord): TranslationResult<LeanRefDecl> {
  const levelParams = Array.isArray(decl?.levelParams) ? decl.levelParams.map(String) : [];
  switch (decl?.kind) {
    case 'quot': return translated({ kind: 'quotInfo', name: String(decl.name), levelParams }, ['translation.declaration.quotient-primitive']);
    case 'axiom': {
      const tv = translateTypeValue(decl.type);
      if (tv.status === 'blocked') return tv as TranslationResult<LeanRefDecl>;
      return translated({ kind: 'axiomInfo', name: String(decl.name), levelParams, type: tv.value.type }, combineObligations(tv, translated(null, ['translation.declaration.axiom'])));
    }
    case 'definition': {
      const tv = translateTypeValue(decl.type, decl.value);
      if (tv.status === 'blocked') return tv as TranslationResult<LeanRefDecl>;
      const hint = decl.reducibility === 'abbrev' ? 'abbrev' : 'regular';
      return translated({ kind: 'defnInfo', name: String(decl.name), levelParams, type: tv.value.type, value: tv.value.value!, hints: { kind: hint }, safety: 'safe' }, combineObligations(tv, translated(null, ['translation.declaration.definition'])));
    }
    case 'theorem':
    case 'example': {
      const tv = translateTypeValue(decl.type, decl.value);
      if (tv.status === 'blocked') return tv as TranslationResult<LeanRefDecl>;
      return translated({ kind: 'thmInfo', name: String(decl.name), levelParams, type: tv.value.type, value: tv.value.value! }, combineObligations(tv, translated(null, ['translation.declaration.theorem'])));
    }
    case 'opaque': {
      const tv = translateTypeValue(decl.type, decl.value);
      if (tv.status === 'blocked') return tv as TranslationResult<LeanRefDecl>;
      return translated({ kind: 'opaqueInfo', name: String(decl.name), levelParams, type: tv.value.type, value: tv.value.value! }, combineObligations(tv, translated(null, ['translation.declaration.opaque'])));
    }
    case 'inductive': {
      const type = translateTerm(decl.type);
      if (type.status === 'blocked') return type as TranslationResult<LeanRefDecl>;
      const constructors: { name: string; type: LeanRefExpr }[] = [];
      const obligations = [...type.obligations, 'translation.declaration.inductive'];
      for (const c of decl.constructors ?? []) {
        const ct = translateTerm(c.type);
        if (ct.status === 'blocked') return ct as TranslationResult<LeanRefDecl>;
        constructors.push({ name: String(c.name), type: ct.value });
        obligations.push(...ct.obligations);
      }
      return translated({ kind: 'inductInfo', name: String(decl.name), levelParams, type: type.value, numParams: Number(decl.numParams ?? 0), numIndices: Number(decl.numIndices ?? 0), constructors }, [...new Set(obligations)]);
    }
    case 'mutualInductive': {
      const inductives: Extract<LeanRefDecl, { kind: 'inductInfo' }>[] = [];
      const obligations = ['translation.declaration.mutual-inductive'];
      for (const ind of decl.inductives ?? []) {
        const r = translateDeclaration({ ...ind, kind: 'inductive', levelParams });
        if (r.status === 'blocked') return r as TranslationResult<LeanRefDecl>;
        inductives.push(r.value as Extract<LeanRefDecl, { kind: 'inductInfo' }>);
        obligations.push(...r.obligations);
      }
      return translated({ kind: 'mutualInductInfo', name: String(decl.name), levelParams, inductives }, [...new Set(obligations)]);
    }
    default: return blocked(`unknown declaration kind: ${decl?.kind}`, decl?.kind, ['translation.declaration.totality']);
  }
}

export function translationCoverage() {
  return {
    levelTags: { translated: ['zero', 'succ', 'max', 'imax', 'param'], blocked: ['mvar'] },
    termTags: { translated: ['sort', 'bvar', 'const', 'app', 'lam', 'pi', 'let', 'lit', 'proj'], adapterErased: ['mdata'] },
    exprTags: { blocked: ['fvar', 'mvar'], adapterErased: ['mdata'] },
    declarationKinds: { translated: ['quot', 'axiom', 'definition', 'theorem', 'example', 'opaque', 'inductive', 'mutualInductive'] },
  };
}

export function runKA2Assurance() {
  const required = [
    'assurance/ka1/lean-4.33.1-kernel-inventory.json',
    'assurance/ka1/pscore-v71-spec.json',
    'assurance/ka2/translation-relation.json',
    'assurance/ka2/translation-obligations-delta.json',
    'assurance/ka2/translation-soundness-skeleton.lean',
    'assurance/ka2/KA2_REPORT.md',
  ];
  for (const rel of required) assert.ok(exists(rel), `missing ${rel}`);
  const pkg = readJson('package.json');
  const versions = readJson('versions.json');
  const relation = readJson('assurance/ka2/translation-relation.json');
  const delta = readJson('assurance/ka2/translation-obligations-delta.json');
  const skeleton = read('assurance/ka2/translation-soundness-skeleton.lean');
  const coverage = translationCoverage();

  assert.equal(pkg.version, versions.implementation);
  assert.equal(relation.publicVersion, '1.0.0-pskernel.4');
  assert.equal(versions.defaultKernelCoreFormat, 71);
  assert.equal(versions.ka2TrustedSemanticChange, false);
  assert.equal(relation.schema, 'proofscript.assurance.ka2.translation-relation/v1');
  assert.equal(relation.fullLean4Equivalence, false);
  assert.equal(relation.formalLean4EquivalenceProvenObligations, 0);
  assert.ok(delta.stillOpen.includes('soundness.checkDecl'));
  assert.match(skeleton, /namespace PSKernelKA2/);
  assert.match(skeleton, /def translateLevel/);
  assert.match(skeleton, /theorem target_noninductive_checkDecl_sound/);
  assert.doesNotMatch(skeleton, /sorry/);

  return {
    status: 'passed',
    checkpoint: 'proofscript-v1-ka2-translation-relation0',
    publicVersion: pkg.version,
    coreFormat: 71,
    trustedKernelSemanticChange: false,
    kernelCodecChange: false,
    fullLean4Equivalence: false,
    sameTheoryAsFullLean4: false,
    fullyFormalK3: false,
    formalLean4EquivalenceProvenObligations: 0,
    translatedLevelTags: coverage.levelTags.translated.length,
    blockedLevelTags: coverage.levelTags.blocked.length,
    translatedTermTags: coverage.termTags.translated.length,
    translatedDeclarationKinds: coverage.declarationKinds.translated.length,
    closedByKA2: delta.closedByKA2.length,
    stillOpen: delta.stillOpen.length,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(runKA2Assurance(), null, 2));
}

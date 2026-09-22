import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  Environment,
  KernelUnsupportedError,
  LevelZero,
  getUndefParam,
  checkCoreDeclarations,
  replayCoreArtifact,
  certifyCoreArtifact,
  verifyCoreReplayCertificate,
  checkCoreDeclarationsWithPrelude,
  defEq,
  infer,
  whnf,
  ensureSort,
  levelOfNat,
  levelParam,
  levelSucc,
  levelMax,
  checkAndAddDeclaration,
  levelDefEq,
  pretty,
  replaceNoCacheTerm,
  generateEqDeclaration,
  generateNatDeclaration,
  generateBoolDeclaration,
  generateUnitDeclaration,
  installCorePrimitives,
  pskernelStatus,
  pskernelCheckCore,
  pskernelVerifyCoreCertificate,
  pskernelProofObligations,
  pskernelAuditCoreArtifact,
  proofObligationReport,
  verifyProofObligationCatalog,
  TypeChecker,
  whnfWithTransparency,
  defEqWithTransparency,
} from '@proofscript/kernel';

console.error('SMOKE_PROGRESS before original line 42: const type0 = { tag: "sort", level: levelSucc(LevelZero) };');
const type0 = { tag: 'sort', level: levelSucc(LevelZero) };
console.error('SMOKE_PROGRESS before original line 43: assert.equal(levelDefEq(levelOfNat(1), levelSucc(LevelZero)), true, "level smoke');
assert.equal(levelDefEq(levelOfNat(1), levelSucc(LevelZero)), true, 'level smoke');
console.error('SMOKE_PROGRESS before original line 44: assert.equal(levelDefEq({ tag: "max", left: levelOfNat(1), right: LevelZero }, l');
assert.equal(levelDefEq({ tag: 'max', left: levelOfNat(1), right: LevelZero }, levelOfNat(1)), true, 'max zero normalization');
console.error('SMOKE_PROGRESS before original line 45: assert.equal(getUndefParam({ tag: "max", left: levelParam("u"), right: levelPara');
assert.equal(getUndefParam({ tag: 'max', left: levelParam('u'), right: levelParam('v') }, ['u']), 'v', 'undefined level parameter detection');

console.error('SMOKE_PROGRESS before original line 47: const axiom = { kind: "axiom", name: "A", levelParams: [], type: type0 };');
const axiom = { kind: 'axiom', name: 'A', levelParams: [], type: type0 };
console.error('SMOKE_PROGRESS before original line 48: const idType = { tag: "pi", domain: { tag: "const", name: "A", levels: [] }, bod');
const idType = { tag: 'pi', domain: { tag: 'const', name: 'A', levels: [] }, body: { tag: 'const', name: 'A', levels: [] } };
console.error('SMOKE_PROGRESS before original line 49: const idVal = { tag: "lam", domain: { tag: "const", name: "A", levels: [] }, bod');
const idVal = { tag: 'lam', domain: { tag: 'const', name: 'A', levels: [] }, body: { tag: 'bvar', index: 0 } };
console.error('SMOKE_PROGRESS before original line 50: const definition = { kind: "definition", name: "idA", levelParams: [], type: idT');
const definition = { kind: 'definition', name: 'idA', levelParams: [], type: idType, value: idVal, reducibility: 'regular' };

console.error('SMOKE_PROGRESS before original line 52: const summary = checkCoreDeclarations([axiom, definition], "pskernel-ts-phase2-');
const summary = checkCoreDeclarations([axiom, definition], 'pskernel-ts-phase2-smoke');
console.error('SMOKE_PROGRESS before original line 53: assert.equal(summary.status, "accepted", summary.message);');
assert.equal(summary.status, 'accepted', summary.message);
console.error('SMOKE_PROGRESS before original line 54: assert.equal(summary.declarations.length, 2);');
assert.equal(summary.declarations.length, 2);
console.error('SMOKE_PROGRESS before original line 55: assert.deepEqual(summary.declarations[1].assumptions, ["A"], "definition assumpt');
assert.deepEqual(summary.declarations[1].assumptions, ['A'], 'definition assumptions should include referenced axiom dependencies');

console.error('SMOKE_PROGRESS before original line 57: const summaryDup = checkCoreDeclarations([axiom, axiom], "pskernel-ts-phase2-sm');
const summaryDup = checkCoreDeclarations([axiom, axiom], 'pskernel-ts-phase2-smoke');
console.error('SMOKE_PROGRESS before original line 58: assert.equal(summaryDup.status, "rejected", "duplicate declaration must reject")');
assert.equal(summaryDup.status, 'rejected', 'duplicate declaration must reject');

console.error('SMOKE_PROGRESS before original line 60: const nonTypeDeclaration = checkCoreDeclarations([');
const nonTypeDeclaration = checkCoreDeclarations([
  axiom,
  { kind: 'axiom', name: 'a', levelParams: [], type: { tag: 'const', name: 'A', levels: [] } },
  { kind: 'axiom', name: 'badType', levelParams: [], type: { tag: 'const', name: 'a', levels: [] } },
], 'pskernel-ts-phase2-smoke');
console.error('SMOKE_PROGRESS before original line 65: assert.equal(nonTypeDeclaration.status, "rejected", "declaration type must itsel');
assert.equal(nonTypeDeclaration.status, 'rejected', 'declaration type must itself infer to a Sort');

console.error('SMOKE_PROGRESS before original line 67: const mvarLevelDeclaration = checkCoreDeclarations([');
const mvarLevelDeclaration = checkCoreDeclarations([
  { kind: 'axiom', name: 'BadLevel', levelParams: [], type: { tag: 'sort', level: { tag: 'mvar', name: '?u' } } },
], 'pskernel-ts-phase2-smoke');
console.error('SMOKE_PROGRESS before original line 70: assert.equal(mvarLevelDeclaration.status, "rejected", "universe metavariables mu');
assert.equal(mvarLevelDeclaration.status, 'rejected', 'universe metavariables must fail closed');



console.error('SMOKE_PROGRESS before original line 74: const badInductiveType = checkCoreDeclarations([');
const badInductiveType = checkCoreDeclarations([
  axiom,
  { kind: 'axiom', name: 'a2', levelParams: [], type: { tag: 'const', name: 'A', levels: [] } },
  {
    kind: 'inductive',
    name: 'BadIndType',
    levelParams: [],
    type: { tag: 'const', name: 'a2', levels: [] },
    numParams: 0,
    numIndices: 0,
    constructors: [],
  },
], 'pskernel-ts-phase2-smoke');
console.error('SMOKE_PROGRESS before original line 87: assert.equal(badInductiveType.status, "rejected", "inductive type must itself in');
assert.equal(badInductiveType.status, 'rejected', 'inductive type must itself infer to a Sort');

console.error('SMOKE_PROGRESS before original line 89: const duplicateGenerated = checkCoreDeclarations([');
const duplicateGenerated = checkCoreDeclarations([
  {
    kind: 'inductive',
    name: 'BadInd',
    levelParams: [],
    type: type0,
    numParams: 0,
    numIndices: 0,
    constructors: [
      { name: 'BadInd.mk', type: { tag: 'const', name: 'BadInd', levels: [] } },
      { name: 'BadInd.mk', type: { tag: 'const', name: 'BadInd', levels: [] } },
    ],
  },
], 'pskernel-ts-phase2-smoke');
console.error('SMOKE_PROGRESS before original line 103: assert.equal(duplicateGenerated.status, "rejected", "duplicate generated constru');
assert.equal(duplicateGenerated.status, 'rejected', 'duplicate generated constructor names must reject');

console.error('SMOKE_PROGRESS before original line 105: const badConstructorTarget = checkCoreDeclarations([');
const badConstructorTarget = checkCoreDeclarations([
  axiom,
  { kind: 'axiom', name: 'a3', levelParams: [], type: { tag: 'const', name: 'A', levels: [] } },
  {
    kind: 'inductive',
    name: 'BadCtorTarget',
    levelParams: [],
    type: type0,
    numParams: 0,
    numIndices: 0,
    constructors: [
      { name: 'BadCtorTarget.mk', type: { tag: 'const', name: 'a3', levels: [] } },
    ],
  },
], 'pskernel-ts-phase2-smoke');
console.error('SMOKE_PROGRESS before original line 120: assert.equal(badConstructorTarget.status, "rejected", "constructor type codomain');
assert.equal(badConstructorTarget.status, 'rejected', 'constructor type codomain must target its inductive family');

console.error('SMOKE_PROGRESS before original line 122: const badConstructorDependency = checkCoreDeclarations([');
const badConstructorDependency = checkCoreDeclarations([
  {
    kind: 'inductive',
    name: 'BadCtorDep',
    levelParams: [],
    type: type0,
    numParams: 0,
    numIndices: 0,
    constructors: [
      {
        name: 'BadCtorDep.mk',
        type: {
          tag: 'pi',
          domain: { tag: 'const', name: 'MissingDomain', levels: [] },
          body: { tag: 'const', name: 'BadCtorDep', levels: [] },
        },
      },
    ],
  },
], 'pskernel-ts-phase2-smoke');
console.error('SMOKE_PROGRESS before original line 142: assert.equal(badConstructorDependency.status, "rejected", "constructor domain de');
assert.equal(badConstructorDependency.status, 'rejected', 'constructor domain dependencies must be known or part of the inductive block');

console.error('SMOKE_PROGRESS before original line 144: const env = new Environment();');
const env = new Environment();
console.error('SMOKE_PROGRESS before original line 145: assert.ok(env, "Environment constructor smoke");');
assert.ok(env, 'Environment constructor smoke');
console.error('SMOKE_PROGRESS before original line 146: checkAndAddDeclaration(env, { kind: "axiom", name: "U", levelParams: ["u"], type');
checkAndAddDeclaration(env, { kind: 'axiom', name: 'U', levelParams: ['u'], type: { tag: 'sort', level: levelSucc(levelParam('u')) } });
console.error('SMOKE_PROGRESS before original line 147: assert.equal(');
assert.equal(
  defEq(
    env,
    [],
    { tag: 'const', name: 'U', levels: [levelMax(levelParam('u'), LevelZero)] },
    { tag: 'const', name: 'U', levels: [levelParam('u')] },
  ),
  true,
  'constant universe arguments should compare by level definitional equality',
);

console.error('SMOKE_PROGRESS before original line 158: const unitEnv = new Environment();');
const unitEnv = new Environment();
console.error('SMOKE_PROGRESS before original line 159: checkAndAddDeclaration(unitEnv, {');
checkAndAddDeclaration(unitEnv, {
  kind: 'inductive',
  name: 'UnitLike',
  levelParams: [],
  type: type0,
  numParams: 0,
  numIndices: 0,
  constructors: [{ name: 'UnitLike.unit', type: { tag: 'const', name: 'UnitLike', levels: [] } }],
});
console.error('SMOKE_PROGRESS before original line 168: assert.ok(');
assert.ok(
  unitEnv.findConstant('UnitLike.rec'),
  'generated recursor must be registered as a constant entry',
);
console.error('SMOKE_PROGRESS before original line 172: const unitRecursorEntry = unitEnv.find("UnitLike.rec");');
const unitRecursorEntry = unitEnv.find('UnitLike.rec');
console.error('SMOKE_PROGRESS before original line 173: assert.deepEqual(');
assert.deepEqual(
  unitRecursorEntry?.declaration.metadata?.rules,
  [{ ctor: 'UnitLike.unit', nfields: 0, recursiveFields: [] }],
  'generated recursor metadata should record constructor field arity',
);
console.error('SMOKE_PROGRESS before original line 178: const unitRecursorType = infer(unitEnv, [], { tag: "const", name: "UnitLike.rec"');
const unitRecursorType = infer(unitEnv, [], { tag: 'const', name: 'UnitLike.rec', levels: [levelSucc(LevelZero)] });
console.error('SMOKE_PROGRESS before original line 179: assert.equal(unitRecursorType.tag, "pi", "simple non-indexed recursor must synth');
assert.equal(unitRecursorType.tag, 'pi', 'simple non-indexed recursor must synthesize a usable type');
console.error('SMOKE_PROGRESS before original line 180: assert.match(pretty(unitRecursorType), /UnitLike\.unit/, "UnitLike recursor type');
assert.match(pretty(unitRecursorType), /UnitLike\.unit/, 'UnitLike recursor type should mention the zero-field constructor minor premise');
console.error('SMOKE_PROGRESS before original line 181: assert.equal(ensureSort(unitEnv, [], infer(unitEnv, [], unitRecursorType)).tag, ');
assert.equal(ensureSort(unitEnv, [], infer(unitEnv, [], unitRecursorType)).tag, 'sort', 'synthesized UnitLike recursor type must itself be a valid type');

console.error('SMOKE_PROGRESS before original line 183: const unitRecMotive = { tag: "lam", domain: { tag: "const", name: "UnitLike", le');
const unitRecMotive = { tag: 'lam', domain: { tag: 'const', name: 'UnitLike', levels: [] }, body: { tag: 'const', name: 'UnitLike', levels: [] } };
console.error('SMOKE_PROGRESS before original line 184: const unitRecMinor = { tag: "const", name: "UnitLike.unit", levels: [] };');
const unitRecMinor = { tag: 'const', name: 'UnitLike.unit', levels: [] };
console.error('SMOKE_PROGRESS before original line 185: const unitRecIota = {');
const unitRecIota = {
  tag: 'app',
  fn: {
    tag: 'app',
    fn: {
      tag: 'app',
      fn: { tag: 'const', name: 'UnitLike.rec', levels: [levelSucc(LevelZero)] },
      arg: unitRecMotive,
    },
    arg: unitRecMinor,
  },
  arg: { tag: 'const', name: 'UnitLike.unit', levels: [] },
};
console.error('SMOKE_PROGRESS before original line 198: assert.deepEqual(');
assert.deepEqual(
  whnf(unitEnv, [], unitRecIota),
  unitRecMinor,
  'simple zero-field recursor iota reduction should reduce to the matching minor premise',
);
console.error('SMOKE_PROGRESS before original line 203: assert.deepEqual(');
assert.deepEqual(
  whnf(unitEnv, [], {
    tag: 'app',
    fn: {
      tag: 'app',
      fn: {
        tag: 'app',
        fn: { tag: 'const', name: 'UnitLike.rec', levels: [levelSucc(LevelZero)] },
        arg: { tag: 'const', name: 'UnitLike.unit', levels: [] },
      },
      arg: unitRecMinor,
    },
    arg: { tag: 'const', name: 'UnitLike.unit', levels: [] },
  }),
  {
    tag: 'app',
    fn: {
      tag: 'app',
      fn: {
        tag: 'app',
        fn: { tag: 'const', name: 'UnitLike.rec', levels: [levelSucc(LevelZero)] },
        arg: { tag: 'const', name: 'UnitLike.unit', levels: [] },
      },
      arg: unitRecMinor,
    },
    arg: { tag: 'const', name: 'UnitLike.unit', levels: [] },
  },
  'malformed recursor applications must not iota-reduce through raw whnf',
);

console.error('SMOKE_PROGRESS before original line 233: const betaEnv = new Environment();');
const betaEnv = new Environment();
console.error('SMOKE_PROGRESS before original line 234: assert.ok(betaEnv, "second Environment constructor smoke");');
assert.ok(betaEnv, 'second Environment constructor smoke');
console.error('SMOKE_PROGRESS before original line 235: const betaTerm = { tag: "app", fn: idVal, arg: { tag: "const", name: "A", levels');
const betaTerm = { tag: 'app', fn: idVal, arg: { tag: 'const', name: 'A', levels: [] } };
console.error('SMOKE_PROGRESS before original line 236: assert.equal(pretty(betaTerm).includes("fun"), true, "pre-beta term is visible")');
assert.equal(pretty(betaTerm).includes('fun'), true, 'pre-beta term is visible');
console.error('SMOKE_PROGRESS before original line 237: const replaced = replaceNoCacheTerm(betaTerm, term => term.tag === "const" && te');
const replaced = replaceNoCacheTerm(betaTerm, term => term.tag === 'const' && term.name === 'A' ? { tag: 'const', name: 'B', levels: [] } : undefined);
console.error('SMOKE_PROGRESS before original line 238: assert.equal(pretty(replaced).includes("B"), true, "replaceNoCacheTerm rewrites ');
assert.equal(pretty(replaced).includes('B'), true, 'replaceNoCacheTerm rewrites nested constants');


console.error('SMOKE_PROGRESS before original line 241: const recursorEnv = new Environment();');
const recursorEnv = new Environment();
console.error('SMOKE_PROGRESS before original line 242: checkAndAddDeclaration(recursorEnv, {');
checkAndAddDeclaration(recursorEnv, {
  kind: 'inductive',
  name: 'ClosedRecursorFamily',
  levelParams: [],
  type: type0,
  numParams: 0,
  numIndices: 0,
  constructors: [{ name: 'ClosedRecursorFamily.mk', type: { tag: 'const', name: 'ClosedRecursorFamily', levels: [] } }],
});
console.error('SMOKE_PROGRESS before original line 251: assert.ok(recursorEnv.findConstant("ClosedRecursorFamily.rec"), "generated recur');
assert.ok(recursorEnv.findConstant('ClosedRecursorFamily.rec'), 'generated recursor should remain registered for replay/inventory');
console.error('SMOKE_PROGRESS before original line 252: const closedRecursorType = infer(recursorEnv, [], { tag: "const", name: "ClosedR');
const closedRecursorType = infer(recursorEnv, [], { tag: 'const', name: 'ClosedRecursorFamily.rec', levels: [LevelZero] });
console.error('SMOKE_PROGRESS before original line 253: assert.equal(closedRecursorType.tag, "pi", "closed zero-field recursor should sy');
assert.equal(closedRecursorType.tag, 'pi', 'closed zero-field recursor should synthesize a usable type');

console.error('SMOKE_PROGRESS before original line 255: const badArtifactSummary = replayCoreArtifact({');
const badArtifactSummary = replayCoreArtifact({
  format: 'not-proofscript-core',
  formatVersion: 1,
  proofscriptReference: 'v0.2.1',
  leanSemanticBaseline: '4.33.1',
  implementationProfile: 'bad-artifact-smoke',
  declarations: [],
  typeclasses: { classes: [], instances: [] },
});
console.error('SMOKE_PROGRESS before original line 264: assert.equal(badArtifactSummary.status, "rejected", "replay must reject artifact');
assert.equal(badArtifactSummary.status, 'rejected', 'replay must reject artifacts with an invalid format marker');

console.error('SMOKE_PROGRESS before original line 266: const badBaselineSummary = replayCoreArtifact({');
const badBaselineSummary = replayCoreArtifact({
  format: 'proofscript-core',
  formatVersion: 1,
  proofscriptReference: 'v0.2.1',
  leanSemanticBaseline: '4.34.0',
  implementationProfile: 'bad-baseline-smoke',
  declarations: [],
  typeclasses: { classes: [], instances: [] },
});
console.error('SMOKE_PROGRESS before original line 275: assert.equal(badBaselineSummary.status, "rejected", "replay must reject non-pinn');
assert.equal(badBaselineSummary.status, 'rejected', 'replay must reject non-pinned Lean semantic baselines');


console.error('SMOKE_PROGRESS before original line 278: const malformedTermSummary = replayCoreArtifact({');
const malformedTermSummary = replayCoreArtifact({
  format: 'proofscript-core',
  formatVersion: 1,
  proofscriptReference: 'v0.2.1',
  leanSemanticBaseline: '4.33.1',
  implementationProfile: 'malformed-term-smoke',
  declarations: [
    { kind: 'axiom', name: 'MalformedSort', levelParams: [], type: { tag: 'sort' } },
  ],
  typeclasses: { classes: [], instances: [] },
});
console.error('SMOKE_PROGRESS before original line 289: assert.equal(malformedTermSummary.status, "rejected", "replay must reject malfor');
assert.equal(malformedTermSummary.status, 'rejected', 'replay must reject malformed term shapes instead of crashing');

console.error('SMOKE_PROGRESS before original line 291: const malformedDeclarationSummary = replayCoreArtifact({');
const malformedDeclarationSummary = replayCoreArtifact({
  format: 'proofscript-core',
  formatVersion: 1,
  proofscriptReference: 'v0.2.1',
  leanSemanticBaseline: '4.33.1',
  implementationProfile: 'malformed-declaration-smoke',
  declarations: [
    { kind: 'definition', name: 'BadDef', levelParams: [], type: type0, reducibility: 'regular' },
  ],
  typeclasses: { classes: [], instances: [] },
});
console.error('SMOKE_PROGRESS before original line 302: assert.equal(malformedDeclarationSummary.status, "rejected", "replay must reject');
assert.equal(malformedDeclarationSummary.status, 'rejected', 'replay must reject malformed declaration shapes before checking');

console.error('SMOKE_PROGRESS before original line 304: const badConstructorDomainNotType = checkCoreDeclarations([');
const badConstructorDomainNotType = checkCoreDeclarations([
  axiom,
  { kind: 'axiom', name: 'aCtorDomain', levelParams: [], type: { tag: 'const', name: 'A', levels: [] } },
  {
    kind: 'inductive',
    name: 'BadCtorDomainNotType',
    levelParams: [],
    type: type0,
    numParams: 0,
    numIndices: 0,
    constructors: [
      {
        name: 'BadCtorDomainNotType.mk',
        type: {
          tag: 'pi',
          domain: { tag: 'const', name: 'aCtorDomain', levels: [] },
          body: { tag: 'const', name: 'BadCtorDomainNotType', levels: [] },
        },
      },
    ],
  },
], 'constructor-domain-type-smoke');
console.error('SMOKE_PROGRESS before original line 326: assert.equal(badConstructorDomainNotType.status, "rejected", "constructor telesc');
assert.equal(badConstructorDomainNotType.status, 'rejected', 'constructor telescope domains must themselves infer to Sort/Type');

console.error('SMOKE_PROGRESS before original line 328: const badConstructorUniverseArity = checkCoreDeclarations([');
const badConstructorUniverseArity = checkCoreDeclarations([
  {
    kind: 'inductive',
    name: 'BadCtorUniverseArity',
    levelParams: ['u'],
    type: { tag: 'sort', level: levelSucc(levelParam('u')) },
    numParams: 0,
    numIndices: 0,
    constructors: [
      { name: 'BadCtorUniverseArity.mk', type: { tag: 'const', name: 'BadCtorUniverseArity', levels: [] } },
    ],
  },
], 'constructor-universe-arity-smoke');
console.error('SMOKE_PROGRESS before original line 341: assert.equal(badConstructorUniverseArity.status, "rejected", "constructor codoma');
assert.equal(badConstructorUniverseArity.status, 'rejected', 'constructor codomain must use the inductive family with correct universe arity');

console.error('SMOKE_PROGRESS before original line 343: const negativeInductiveCounters = checkCoreDeclarations([');
const negativeInductiveCounters = checkCoreDeclarations([
  {
    kind: 'inductive',
    name: 'NegativeCounters',
    levelParams: [],
    type: type0,
    numParams: -1,
    numIndices: 0,
    constructors: [],
  },
], 'negative-inductive-counters-smoke');
console.error('SMOKE_PROGRESS before original line 354: assert.equal(negativeInductiveCounters.status, "rejected", "direct inductive adm');
assert.equal(negativeInductiveCounters.status, 'rejected', 'direct inductive admission must reject negative numParams/numIndices');

console.error('SMOKE_PROGRESS before original line 356: const directMalformedTermSummary = checkCoreDeclarations([');
const directMalformedTermSummary = checkCoreDeclarations([
  { kind: 'axiom', name: 'DirectMalformedSort', levelParams: [], type: { tag: 'sort' } },
], 'direct-malformed-term-smoke');
console.error('SMOKE_PROGRESS before original line 359: assert.equal(directMalformedTermSummary.status, "rejected", "direct checkCoreDec');
assert.equal(directMalformedTermSummary.status, 'rejected', 'direct checkCoreDeclarations must reject malformed term shapes instead of implementation_error');

console.error('SMOKE_PROGRESS before original line 361: const directMalformedBinderInfoSummary = checkCoreDeclarations([');
const directMalformedBinderInfoSummary = checkCoreDeclarations([
  {
    kind: 'axiom',
    name: 'DirectMalformedBinderInfo',
    levelParams: [],
    type: { tag: 'pi', domain: type0, body: type0, binderInfo: 'javascriptOptional' },
  },
], 'direct-malformed-binder-info-smoke');
console.error('SMOKE_PROGRESS before original line 369: assert.equal(directMalformedBinderInfoSummary.status, "rejected", "direct checkC');
assert.equal(directMalformedBinderInfoSummary.status, 'rejected', 'direct checkCoreDeclarations must reject invalid binderInfo values');

console.error('SMOKE_PROGRESS before original line 371: const badFamilyCounterMismatch = checkCoreDeclarations([');
const badFamilyCounterMismatch = checkCoreDeclarations([
  {
    kind: 'inductive',
    name: 'BadFamilyCounterMismatch',
    levelParams: [],
    type: type0,
    numParams: 1,
    numIndices: 0,
    constructors: [],
  },
], 'family-counter-mismatch-smoke');
console.error('SMOKE_PROGRESS before original line 382: assert.equal(badFamilyCounterMismatch.status, "rejected", "inductive numParams/n');
assert.equal(badFamilyCounterMismatch.status, 'rejected', 'inductive numParams/numIndices must match the family type telescope arity');

console.error('SMOKE_PROGRESS before original line 384: const paramFamilySummary = checkCoreDeclarations([');
const paramFamilySummary = checkCoreDeclarations([
  {
    kind: 'inductive',
    name: 'ParamFamily',
    levelParams: [],
    type: { tag: 'pi', domain: type0, body: type0 },
    numParams: 1,
    numIndices: 0,
    constructors: [
      {
        name: 'ParamFamily.mk',
        type: {
          tag: 'pi',
          domain: type0,
          body: {
            tag: 'app',
            fn: { tag: 'const', name: 'ParamFamily', levels: [] },
            arg: { tag: 'bvar', index: 0 },
          },
        },
      },
    ],
  },
], 'parameterized-family-positive-smoke');
console.error('SMOKE_PROGRESS before original line 408: assert.equal(paramFamilySummary.status, "accepted", paramFamilySummary.message);');
assert.equal(paramFamilySummary.status, 'accepted', paramFamilySummary.message);

console.error('SMOKE_PROGRESS before original line 410: const positiveRecursiveField = checkCoreDeclarations([');
const positiveRecursiveField = checkCoreDeclarations([
  {
    kind: 'inductive',
    name: 'PositiveRecursiveField',
    levelParams: [],
    type: type0,
    numParams: 0,
    numIndices: 0,
    constructors: [
      {
        name: 'PositiveRecursiveField.mk',
        type: {
          tag: 'pi',
          domain: { tag: 'const', name: 'PositiveRecursiveField', levels: [] },
          body: { tag: 'const', name: 'PositiveRecursiveField', levels: [] },
        },
      },
    ],
  },
], 'positive-recursive-field-smoke');
console.error('SMOKE_PROGRESS before original line 430: assert.equal(positiveRecursiveField.status, "accepted", positiveRecursiveField.m');
assert.equal(positiveRecursiveField.status, 'accepted', positiveRecursiveField.message);
console.error('SMOKE_PROGRESS before original line 431: assert.deepEqual(');
assert.deepEqual(
  positiveRecursiveField.declarations.find(d => d.name === 'PositiveRecursiveField')?.generated.sort(),
  ['PositiveRecursiveField.mk', 'PositiveRecursiveField.rec'].sort(),
  'inductive summary should report constructor and recursor generated names',
);

console.error('SMOKE_PROGRESS before original line 437: const positiveRecursiveEnv = new Environment();');
const positiveRecursiveEnv = new Environment();
console.error('SMOKE_PROGRESS before original line 438: checkAndAddDeclaration(positiveRecursiveEnv, {');
checkAndAddDeclaration(positiveRecursiveEnv, {
  kind: 'inductive',
  name: 'PositiveRecursiveMeta',
  levelParams: [],
  type: type0,
  numParams: 0,
  numIndices: 0,
  constructors: [
    {
      name: 'PositiveRecursiveMeta.mk',
      type: {
        tag: 'pi',
        domain: { tag: 'const', name: 'PositiveRecursiveMeta', levels: [] },
        body: { tag: 'const', name: 'PositiveRecursiveMeta', levels: [] },
      },
    },
  ],
});
console.error('SMOKE_PROGRESS before original line 456: assert.deepEqual(');
assert.deepEqual(
  positiveRecursiveEnv.find('PositiveRecursiveMeta.rec')?.declaration.metadata?.rules,
  [{ ctor: 'PositiveRecursiveMeta.mk', nfields: 1, recursiveFields: [true] }],
  'generated recursor metadata should record constructor field count and direct recursive fields',
);
console.error('SMOKE_PROGRESS before original line 461: assert.deepEqual(');
assert.deepEqual(
  positiveRecursiveEnv.findConstant('PositiveRecursiveMeta.rec')?.metadata?.rules,
  [{ ctor: 'PositiveRecursiveMeta.mk', nfields: 1, recursiveFields: [true] }],
  'recInfo constant metadata should match checked recursor metadata',
);
console.error('SMOKE_PROGRESS before original line 466: const positiveRecursiveRecType = infer(positiveRecursiveEnv, [], { tag: "const",');
const positiveRecursiveRecType = infer(positiveRecursiveEnv, [], { tag: 'const', name: 'PositiveRecursiveMeta.rec', levels: [LevelZero] });
console.error('SMOKE_PROGRESS before original line 467: assert.equal(positiveRecursiveRecType.tag, "pi", "direct positive recursive-fiel');
assert.equal(positiveRecursiveRecType.tag, 'pi', 'direct positive recursive-field recursor should synthesize a usable type');
console.error('SMOKE_PROGRESS before original line 468: assert.match(pretty(positiveRecursiveRecType), /PositiveRecursiveMeta\.mk/, "rec');
assert.match(pretty(positiveRecursiveRecType), /PositiveRecursiveMeta\.mk/, 'recursive-field recursor minor premise should mention the constructor application');

console.error('SMOKE_PROGRESS before original line 470: const paramRecursorEnv = new Environment();');
const paramRecursorEnv = new Environment();
console.error('SMOKE_PROGRESS before original line 471: checkAndAddDeclaration(paramRecursorEnv, {');
checkAndAddDeclaration(paramRecursorEnv, {
  kind: 'inductive',
  name: 'ParamRecursorStillUnsupported',
  levelParams: [],
  type: { tag: 'pi', domain: type0, body: type0 },
  numParams: 1,
  numIndices: 0,
  constructors: [
    {
      name: 'ParamRecursorStillUnsupported.mk',
      type: {
        tag: 'pi',
        domain: type0,
        body: { tag: 'app', fn: { tag: 'const', name: 'ParamRecursorStillUnsupported', levels: [] }, arg: { tag: 'bvar', index: 0 } },
      },
    },
  ],
});
console.error('SMOKE_PROGRESS before original line 489: const paramRecursorNowTyped = infer(paramRecursorEnv, [], { tag: "const", name: ');
const paramRecursorNowTyped = infer(paramRecursorEnv, [], { tag: 'const', name: 'ParamRecursorStillUnsupported.rec', levels: [LevelZero] });
console.error('SMOKE_PROGRESS before original line 490: assert.equal(paramRecursorNowTyped.tag, "pi", "parameterized non-indexed recurso');
assert.equal(paramRecursorNowTyped.tag, 'pi', 'parameterized non-indexed recursor type synthesis should now be supported for the simple uniform slice');
console.error('SMOKE_PROGRESS before original line 491: assert.equal(paramRecursorEnv.findConstant("ParamRecursorStillUnsupported.rec")?');
assert.equal(paramRecursorEnv.findConstant('ParamRecursorStillUnsupported.rec')?.metadata?.numParams, 1, 'parameterized recursor metadata should record one uniform parameter');

console.error('SMOKE_PROGRESS before original line 493: const badNegativeRecursiveField = checkCoreDeclarations([');
const badNegativeRecursiveField = checkCoreDeclarations([
  axiom,
  {
    kind: 'inductive',
    name: 'BadNegativeRecursiveField',
    levelParams: [],
    type: type0,
    numParams: 0,
    numIndices: 0,
    constructors: [
      {
        name: 'BadNegativeRecursiveField.mk',
        type: {
          tag: 'pi',
          domain: {
            tag: 'pi',
            domain: { tag: 'const', name: 'BadNegativeRecursiveField', levels: [] },
            body: { tag: 'const', name: 'A', levels: [] },
          },
          body: { tag: 'const', name: 'BadNegativeRecursiveField', levels: [] },
        },
      },
    ],
  },
], 'negative-recursive-field-smoke');
console.error('SMOKE_PROGRESS before original line 518: assert.equal(badNegativeRecursiveField.status, "rejected", "negative recursive o');
assert.equal(badNegativeRecursiveField.status, 'rejected', 'negative recursive occurrences in constructor field types must fail closed');

console.error('SMOKE_PROGRESS before original line 520: const badFamilyCodomainNotSort = checkCoreDeclarations([');
const badFamilyCodomainNotSort = checkCoreDeclarations([
  {
    kind: 'inductive',
    name: 'BadFamilyCodomainNotSort',
    levelParams: [],
    type: { tag: 'pi', domain: type0, body: { tag: 'bvar', index: 0 } },
    numParams: 1,
    numIndices: 0,
    constructors: [],
  },
], 'family-codomain-not-sort-smoke');
console.error('SMOKE_PROGRESS before original line 531: assert.equal(badFamilyCodomainNotSort.status, "rejected", "inductive family tele');
assert.equal(badFamilyCodomainNotSort.status, 'rejected', 'inductive family telescope codomain must be a Sort/Type expression');

console.error('SMOKE_PROGRESS before original line 533: const arbitraryQuotSummary = checkCoreDeclarations([');
const arbitraryQuotSummary = checkCoreDeclarations([
  { kind: 'quot', name: 'FakeQuot', levelParams: [] },
], 'arbitrary-quot-smoke');
console.error('SMOKE_PROGRESS before original line 536: assert.equal(arbitraryQuotSummary.status, "rejected", "quotient kernel marker mu');
assert.equal(arbitraryQuotSummary.status, 'rejected', 'quotient kernel marker must be the canonical Quot initializer only');

console.error('SMOKE_PROGRESS before original line 538: const quotWithoutEqSummary = checkCoreDeclarations([');
const quotWithoutEqSummary = checkCoreDeclarations([
  { kind: 'quot', name: 'Quot', levelParams: [] },
], 'quot-without-eq-smoke');
console.error('SMOKE_PROGRESS before original line 541: assert.equal(quotWithoutEqSummary.status, "rejected", "quotient initialization m');
assert.equal(quotWithoutEqSummary.status, 'rejected', 'quotient initialization must fail closed unless canonical Eq is already present');


console.error('SMOKE_PROGRESS before original line 544: const primitivePreludeSummary = checkCoreDeclarations([');
const primitivePreludeSummary = checkCoreDeclarations([
  generateUnitDeclaration(),
  generateBoolDeclaration(),
  generateNatDeclaration(),
  generateEqDeclaration(),
  { kind: 'quot', name: 'Quot', levelParams: [] },
], 'primitive-prelude-quot-smoke');
console.error('SMOKE_PROGRESS before original line 551: assert.equal(primitivePreludeSummary.status, "accepted", primitivePreludeSummary');
assert.equal(primitivePreludeSummary.status, 'accepted', primitivePreludeSummary.message);
console.error('SMOKE_PROGRESS before original line 552: assert.ok(');
assert.ok(
  primitivePreludeSummary.declarations.some(d => d.name === 'Quot' && d.generated.includes('Quot.mk') && d.generated.includes('Quot.lift') && d.generated.includes('Quot.ind')),
  'canonical quotient marker should install quotient primitive constants after Eq is admitted',
);

console.error('SMOKE_PROGRESS before original line 557: const natConstructorSummary = checkCoreDeclarations([');
const natConstructorSummary = checkCoreDeclarations([
  generateNatDeclaration(),
  {
    kind: 'definition',
    name: 'oneViaSucc',
    levelParams: [],
    type: { tag: 'const', name: 'Nat', levels: [] },
    value: { tag: 'app', fn: { tag: 'const', name: 'Nat.succ', levels: [] }, arg: { tag: 'const', name: 'Nat.zero', levels: [] } },
    reducibility: 'regular',
  },
], 'nat-constructor-admission-smoke');
console.error('SMOKE_PROGRESS before original line 568: assert.equal(natConstructorSummary.status, "accepted", natConstructorSummary.mes');
assert.equal(natConstructorSummary.status, 'accepted', natConstructorSummary.message);

console.error('SMOKE_PROGRESS before original line 570: const natRecursorEnv = new Environment();');
const natRecursorEnv = new Environment();
console.error('SMOKE_PROGRESS before original line 571: checkAndAddDeclaration(natRecursorEnv, generateNatDeclaration());');
checkAndAddDeclaration(natRecursorEnv, generateNatDeclaration());
console.error('SMOKE_PROGRESS before original line 572: const natRecursorType = infer(natRecursorEnv, [], { tag: "const", name: "Nat.rec');
const natRecursorType = infer(natRecursorEnv, [], { tag: 'const', name: 'Nat.rec', levels: [levelSucc(LevelZero)] });
console.error('SMOKE_PROGRESS before original line 573: assert.equal(natRecursorType.tag, "pi", "Nat.rec should synthesize a simple non-');
assert.equal(natRecursorType.tag, 'pi', 'Nat.rec should synthesize a simple non-indexed recursive-field recursor type');
console.error('SMOKE_PROGRESS before original line 574: assert.match(pretty(natRecursorType), /Nat\.succ/, "Nat.rec minor premise should');
assert.match(pretty(natRecursorType), /Nat\.succ/, 'Nat.rec minor premise should mention Nat.succ');
console.error('SMOKE_PROGRESS before original line 575: assert.equal(ensureSort(natRecursorEnv, [], infer(natRecursorEnv, [], natRecurso');
assert.equal(ensureSort(natRecursorEnv, [], infer(natRecursorEnv, [], natRecursorType)).tag, 'sort', 'synthesized Nat.rec type must itself be a valid type');

console.error('SMOKE_PROGRESS before original line 577: const natMotive = { tag: "lam", domain: { tag: "const", name: "Nat", levels: [] ');
const natMotive = { tag: 'lam', domain: { tag: 'const', name: 'Nat', levels: [] }, body: { tag: 'const', name: 'Nat', levels: [] } };
console.error('SMOKE_PROGRESS before original line 578: const natZeroMinor = { tag: "const", name: "Nat.zero", levels: [] };');
const natZeroMinor = { tag: 'const', name: 'Nat.zero', levels: [] };
console.error('SMOKE_PROGRESS before original line 579: const natSuccMinor = {');
const natSuccMinor = {
  tag: 'lam',
  domain: { tag: 'const', name: 'Nat', levels: [] },
  body: {
    tag: 'lam',
    domain: { tag: 'const', name: 'Nat', levels: [] },
    body: { tag: 'app', fn: { tag: 'const', name: 'Nat.succ', levels: [] }, arg: { tag: 'bvar', index: 0 } },
  },
};
console.error('SMOKE_PROGRESS before original line 588: const natRecHead = { tag: "const", name: "Nat.rec", levels: [levelSucc(LevelZero');
const natRecHead = { tag: 'const', name: 'Nat.rec', levels: [levelSucc(LevelZero)] };
console.error('SMOKE_PROGRESS before original line 589: const natRecPrefix = { tag: "app", fn: { tag: "app", fn: { tag: "app", fn: natRe');
const natRecPrefix = { tag: 'app', fn: { tag: 'app', fn: { tag: 'app', fn: natRecHead, arg: natMotive }, arg: natZeroMinor }, arg: natSuccMinor };
console.error('SMOKE_PROGRESS before original line 590: const natRecZero = {');
const natRecZero = {
  tag: 'app',
  fn: natRecPrefix,
  arg: { tag: 'const', name: 'Nat.zero', levels: [] },
};
console.error('SMOKE_PROGRESS before original line 595: assert.deepEqual(');
assert.deepEqual(
  whnf(natRecursorEnv, [], natRecZero),
  natZeroMinor,
  'Nat.rec on Nat.zero should iota-reduce to the zero minor premise',
);
console.error('SMOKE_PROGRESS before original line 600: const natRecSuccApp = { tag: "app", fn: natRecPrefix, arg: { tag: "app", fn: nat');
const natRecSuccApp = { tag: 'app', fn: natRecPrefix, arg: { tag: 'app', fn: natSuccMinor, arg: { tag: 'const', name: 'Nat.zero', levels: [] } } };
console.error('SMOKE_PROGRESS before original line 601: const natSuccReduced = whnf(natRecursorEnv, [], natRecSuccApp);');
const natSuccReduced = whnf(natRecursorEnv, [], natRecSuccApp);
console.error('SMOKE_PROGRESS before original line 602: assert.match(pretty(natSuccReduced), /Nat\.succ/, "Nat.rec on Nat.succ should re');
assert.match(pretty(natSuccReduced), /Nat\.succ/, 'Nat.rec on Nat.succ should reduce through the succ minor premise');
console.error('SMOKE_PROGRESS before original line 603: assert.match(pretty(natSuccReduced), /Nat\.rec/, "Nat.rec succ iota result shoul');
assert.match(pretty(natSuccReduced), /Nat\.rec/, 'Nat.rec succ iota result should expose the recursive-call induction hypothesis');





console.error('SMOKE_PROGRESS before original line 609: const transparencyEnv = new Environment();');
const transparencyEnv = new Environment();
console.error('SMOKE_PROGRESS before original line 610: checkAndAddDeclaration(transparencyEnv, { kind: "axiom", name: "TA", levelParams');
checkAndAddDeclaration(transparencyEnv, { kind: 'axiom', name: 'TA', levelParams: [], type: type0 });
console.error('SMOKE_PROGRESS before original line 611: checkAndAddDeclaration(transparencyEnv, { kind: "axiom", name: "ta", levelParams');
checkAndAddDeclaration(transparencyEnv, { kind: 'axiom', name: 'ta', levelParams: [], type: { tag: 'const', name: 'TA', levels: [] } });
console.error('SMOKE_PROGRESS before original line 612: checkAndAddDeclaration(transparencyEnv, {');
checkAndAddDeclaration(transparencyEnv, {
  kind: 'definition',
  name: 'regularTA',
  levelParams: [],
  type: { tag: 'const', name: 'TA', levels: [] },
  value: { tag: 'const', name: 'ta', levels: [] },
  reducibility: 'regular',
});
console.error('SMOKE_PROGRESS before original line 620: checkAndAddDeclaration(transparencyEnv, {');
checkAndAddDeclaration(transparencyEnv, {
  kind: 'definition',
  name: 'abbrevTA',
  levelParams: [],
  type: { tag: 'const', name: 'TA', levels: [] },
  value: { tag: 'const', name: 'ta', levels: [] },
  reducibility: 'abbrev',
});
console.error('SMOKE_PROGRESS before original line 628: checkAndAddDeclaration(transparencyEnv, {');
checkAndAddDeclaration(transparencyEnv, {
  kind: 'opaque',
  name: 'opaqueTA',
  levelParams: [],
  type: { tag: 'const', name: 'TA', levels: [] },
  value: { tag: 'const', name: 'ta', levels: [] },
});
console.error('SMOKE_PROGRESS before original line 635: assert.deepEqual(');
assert.deepEqual(
  whnfWithTransparency(transparencyEnv, [], { tag: 'const', name: 'regularTA', levels: [] }, 'default'),
  { tag: 'const', name: 'ta', levels: [] },
  'default transparency should unfold regular definitions',
);
console.error('SMOKE_PROGRESS before original line 640: assert.deepEqual(');
assert.deepEqual(
  whnfWithTransparency(transparencyEnv, [], { tag: 'const', name: 'regularTA', levels: [] }, 'reducible'),
  { tag: 'const', name: 'regularTA', levels: [] },
  'reducible transparency must not unfold regular definitions in this conservative slice',
);
console.error('SMOKE_PROGRESS before original line 645: assert.deepEqual(');
assert.deepEqual(
  whnfWithTransparency(transparencyEnv, [], { tag: 'const', name: 'abbrevTA', levels: [] }, 'reducible'),
  { tag: 'const', name: 'ta', levels: [] },
  'reducible transparency should unfold abbrev definitions',
);
console.error('SMOKE_PROGRESS before original line 650: assert.deepEqual(');
assert.deepEqual(
  whnfWithTransparency(transparencyEnv, [], { tag: 'const', name: 'opaqueTA', levels: [] }, 'all'),
  { tag: 'const', name: 'opaqueTA', levels: [] },
  'opaque declarations must remain closed even at all transparency in this trusted slice',
);
console.error('SMOKE_PROGRESS before original line 655: assert.equal(');
assert.equal(
  defEqWithTransparency(transparencyEnv, [], { tag: 'const', name: 'regularTA', levels: [] }, { tag: 'const', name: 'ta', levels: [] }, 'reducible'),
  false,
  'reducible defeq should respect the regular-definition transparency boundary',
);
console.error('SMOKE_PROGRESS before original line 660: assert.deepEqual(');
assert.deepEqual(
  whnfWithTransparency(transparencyEnv, [], { tag: 'const', name: 'regularTA', levels: [LevelZero] }, 'all'),
  { tag: 'const', name: 'regularTA', levels: [LevelZero] },
  'delta reduction must remain neutral when constant universe arity is malformed',
);
console.error('SMOKE_PROGRESS before original line 665: assert.equal(');
assert.equal(
  defEqWithTransparency(transparencyEnv, [], { tag: 'const', name: 'regularTA', levels: [LevelZero] }, { tag: 'const', name: 'ta', levels: [] }, 'all'),
  false,
  'malformed constant universe arity must not become definitionally equal by unfolding',
);
console.error('SMOKE_PROGRESS before original line 670: assert.equal(');
assert.equal(
  new TypeChecker(transparencyEnv, { transparency: 'reducible' }).isDefEq(
    { tag: 'const', name: 'abbrevTA', levels: [] },
    { tag: 'const', name: 'ta', levels: [] },
  ),
  true,
  'TypeChecker instance transparency option should route through whnf/defeq',
);

console.error('SMOKE_PROGRESS before original line 679: const theoremPropGuardSummary = checkCoreDeclarations([');
const theoremPropGuardSummary = checkCoreDeclarations([
  generateNatDeclaration(),
  {
    kind: 'theorem',
    name: 'badNatTheorem',
    levelParams: [],
    type: { tag: 'const', name: 'Nat', levels: [] },
    value: { tag: 'const', name: 'Nat.zero', levels: [] },
  },
], 'theorem-prop-guard-smoke');
console.error('SMOKE_PROGRESS before original line 689: assert.equal(theoremPropGuardSummary.status, "rejected", "theorem declarations m');
assert.equal(theoremPropGuardSummary.status, 'rejected', 'theorem declarations must prove Prop, not arbitrary Type terms');

console.error('SMOKE_PROGRESS before original line 691: const theoremDeltaEnv = new Environment();');
const theoremDeltaEnv = new Environment();
console.error('SMOKE_PROGRESS before original line 692: checkAndAddDeclaration(theoremDeltaEnv, { kind: "axiom", name: "P", levelParams:');
checkAndAddDeclaration(theoremDeltaEnv, { kind: 'axiom', name: 'P', levelParams: [], type: { tag: 'sort', level: LevelZero } });
console.error('SMOKE_PROGRESS before original line 693: checkAndAddDeclaration(theoremDeltaEnv, { kind: "axiom", name: "pAx", levelParam');
checkAndAddDeclaration(theoremDeltaEnv, { kind: 'axiom', name: 'pAx', levelParams: [], type: { tag: 'const', name: 'P', levels: [] } });
console.error('SMOKE_PROGRESS before original line 694: checkAndAddDeclaration(theoremDeltaEnv, {');
checkAndAddDeclaration(theoremDeltaEnv, {
  kind: 'theorem',
  name: 'pThm',
  levelParams: [],
  type: { tag: 'const', name: 'P', levels: [] },
  value: { tag: 'const', name: 'pAx', levels: [] },
});
console.error('SMOKE_PROGRESS before original line 701: assert.deepEqual(');
assert.deepEqual(
  whnf(theoremDeltaEnv, [], { tag: 'const', name: 'pThm', levels: [] }),
  { tag: 'const', name: 'pAx', levels: [] },
  'theorem constants should delta-unfold like pskernel ConstantInfo.deltaValue?',
);

console.error('SMOKE_PROGRESS before original line 707: const installedPreludeEnv = new Environment();');
const installedPreludeEnv = new Environment();
console.error('SMOKE_PROGRESS before original line 708: const installedPrelude = installCorePrimitives(installedPreludeEnv, { quotients:');
const installedPrelude = installCorePrimitives(installedPreludeEnv, { quotients: true });
console.error('SMOKE_PROGRESS before original line 709: assert.equal(installedPrelude.indexOf("Unit") < installedPrelude.indexOf("Bool")');
assert.equal(installedPrelude.indexOf('Unit') < installedPrelude.indexOf('Bool') && installedPrelude.indexOf('Bool') < installedPrelude.indexOf('Nat') && installedPrelude.indexOf('Nat') < installedPrelude.indexOf('Eq'), true, 'primitive installer should add the canonical primitive families in deterministic order');
console.error('SMOKE_PROGRESS before original line 710: assert.ok(installedPreludeEnv.findConstant("Nat.succ"), "primitive installer sho');
assert.ok(installedPreludeEnv.findConstant('Nat.succ'), 'primitive installer should register Nat.succ');
console.error('SMOKE_PROGRESS before original line 711: assert.ok(installedPreludeEnv.findConstant("Quot.lift"), "primitive installer sh');
assert.ok(installedPreludeEnv.findConstant('Quot.lift'), 'primitive installer should install quotient primitives when requested');

console.error('SMOKE_PROGRESS before original line 713: const natReplayWithoutPrelude = replayCoreArtifact({');
const natReplayWithoutPrelude = replayCoreArtifact({
  format: 'proofscript-core',
  formatVersion: 1,
  proofscriptReference: 'v0.2.1',
  leanSemanticBaseline: '4.33.1',
  implementationProfile: 'nat-replay-no-prelude-smoke',
  declarations: [
    {
      kind: 'definition',
      name: 'oneWithoutPrelude',
      levelParams: [],
      type: { tag: 'const', name: 'Nat', levels: [] },
      value: { tag: 'app', fn: { tag: 'const', name: 'Nat.succ', levels: [] }, arg: { tag: 'const', name: 'Nat.zero', levels: [] } },
      reducibility: 'regular',
    },
  ],
  typeclasses: { classes: [], instances: [] },
});
console.error('SMOKE_PROGRESS before original line 731: assert.equal(natReplayWithoutPrelude.status, "rejected", "replay without declare');
assert.equal(natReplayWithoutPrelude.status, 'rejected', 'replay without declared prelude must not implicitly trust Nat');

console.error('SMOKE_PROGRESS before original line 733: const natReplayWithPrelude = replayCoreArtifact({');
const natReplayWithPrelude = replayCoreArtifact({
  format: 'proofscript-core',
  formatVersion: 1,
  proofscriptReference: 'v0.2.1',
  leanSemanticBaseline: '4.33.1',
  implementationProfile: 'nat-replay-core-prelude-smoke',
  prelude: 'core',
  declarations: [
    {
      kind: 'definition',
      name: 'oneWithPrelude',
      levelParams: [],
      type: { tag: 'const', name: 'Nat', levels: [] },
      value: { tag: 'app', fn: { tag: 'const', name: 'Nat.succ', levels: [] }, arg: { tag: 'const', name: 'Nat.zero', levels: [] } },
      reducibility: 'regular',
    },
  ],
  typeclasses: { classes: [], instances: [] },
});
console.error('SMOKE_PROGRESS before original line 752: assert.equal(natReplayWithPrelude.status, "accepted", natReplayWithPrelude.messa');
assert.equal(natReplayWithPrelude.status, 'accepted', natReplayWithPrelude.message);
console.error('SMOKE_PROGRESS before original line 753: assert.deepEqual(natReplayWithPrelude.prelude?.profile, "core", "replay summary ');
assert.deepEqual(natReplayWithPrelude.prelude?.profile, 'core', 'replay summary records deterministic prelude profile');
console.error('SMOKE_PROGRESS before original line 754: assert.ok(natReplayWithPrelude.prelude?.installed.includes("Nat.succ"), "replay ');
assert.ok(natReplayWithPrelude.prelude?.installed.includes('Nat.succ'), 'replay summary records installed primitive declarations');

console.error('SMOKE_PROGRESS before original line 756: const quotReplayWithPrelude = replayCoreArtifact({');
const quotReplayWithPrelude = replayCoreArtifact({
  format: 'proofscript-core',
  formatVersion: 1,
  proofscriptReference: 'v0.2.1',
  leanSemanticBaseline: '4.33.1',
  implementationProfile: 'quot-replay-core-quot-prelude-smoke',
  prelude: 'core+quot',
  declarations: [],
  typeclasses: { classes: [], instances: [] },
});
console.error('SMOKE_PROGRESS before original line 766: assert.equal(quotReplayWithPrelude.status, "accepted", quotReplayWithPrelude.mes');
assert.equal(quotReplayWithPrelude.status, 'accepted', quotReplayWithPrelude.message);
console.error('SMOKE_PROGRESS before original line 767: assert.ok(quotReplayWithPrelude.prelude?.installed.includes("Quot.ind"), "core+q');
assert.ok(quotReplayWithPrelude.prelude?.installed.includes('Quot.ind'), 'core+quot replay prelude installs quotient primitives deterministically');

console.error('SMOKE_PROGRESS before original line 769: const invalidPreludeReplay = replayCoreArtifact({');
const invalidPreludeReplay = replayCoreArtifact({
  format: 'proofscript-core',
  formatVersion: 1,
  proofscriptReference: 'v0.2.1',
  leanSemanticBaseline: '4.33.1',
  implementationProfile: 'invalid-prelude-smoke',
  prelude: 'javascript-global-object',
  declarations: [],
  typeclasses: { classes: [], instances: [] },
});
console.error('SMOKE_PROGRESS before original line 779: assert.equal(invalidPreludeReplay.status, "rejected", "replay must reject unknow');
assert.equal(invalidPreludeReplay.status, 'rejected', 'replay must reject unknown prelude profiles');

console.error('SMOKE_PROGRESS before original line 781: const malformedTypeclassReplay = replayCoreArtifact({');
const malformedTypeclassReplay = replayCoreArtifact({
  format: 'proofscript-core',
  formatVersion: 1,
  proofscriptReference: 'v0.2.1',
  leanSemanticBaseline: '4.33.1',
  implementationProfile: 'malformed-typeclass-smoke',
  declarations: [],
  typeclasses: { classes: [{ name: '', numParams: -1, params: [], fields: [], declarationOrder: 0 }], instances: [] },
});
console.error('SMOKE_PROGRESS before original line 790: assert.equal(malformedTypeclassReplay.status, "rejected", "replay must reject ma');
assert.equal(malformedTypeclassReplay.status, 'rejected', 'replay must reject malformed typeclass metadata shapes');

console.error('SMOKE_PROGRESS before original line 792: const malformedModulesReplay = replayCoreArtifact({');
const malformedModulesReplay = replayCoreArtifact({
  format: 'proofscript-core',
  formatVersion: 1,
  proofscriptReference: 'v0.2.1',
  leanSemanticBaseline: '4.33.1',
  implementationProfile: 'malformed-modules-smoke',
  declarations: [],
  typeclasses: { classes: [], instances: [] },
  modules: { entry: '', interfaceFormatVersion: 2, cacheKeyFormatVersion: 1, baseEnvironmentSha256: '', modules: [] },
});
console.error('SMOKE_PROGRESS before original line 802: assert.equal(malformedModulesReplay.status, "rejected", "replay must reject malf');
assert.equal(malformedModulesReplay.status, 'rejected', 'replay must reject malformed module metadata shapes');


console.error('SMOKE_PROGRESS before original line 805: const proofIrrelEnv = new Environment();');
const proofIrrelEnv = new Environment();
console.error('SMOKE_PROGRESS before original line 806: checkAndAddDeclaration(proofIrrelEnv, { kind: "axiom", name: "ProofIrrelP", leve');
checkAndAddDeclaration(proofIrrelEnv, { kind: 'axiom', name: 'ProofIrrelP', levelParams: [], type: { tag: 'sort', level: LevelZero } });
console.error('SMOKE_PROGRESS before original line 807: checkAndAddDeclaration(proofIrrelEnv, { kind: "axiom", name: "proofIrrelP1", lev');
checkAndAddDeclaration(proofIrrelEnv, { kind: 'axiom', name: 'proofIrrelP1', levelParams: [], type: { tag: 'const', name: 'ProofIrrelP', levels: [] } });
console.error('SMOKE_PROGRESS before original line 808: checkAndAddDeclaration(proofIrrelEnv, { kind: "axiom", name: "proofIrrelP2", lev');
checkAndAddDeclaration(proofIrrelEnv, { kind: 'axiom', name: 'proofIrrelP2', levelParams: [], type: { tag: 'const', name: 'ProofIrrelP', levels: [] } });
console.error('SMOKE_PROGRESS before original line 809: assert.equal(');
assert.equal(
  defEq(proofIrrelEnv, [], { tag: 'const', name: 'proofIrrelP1', levels: [] }, { tag: 'const', name: 'proofIrrelP2', levels: [] }),
  true,
  'proof irrelevance should make proofs of the same proposition definitionally equal in the trusted kernel slice',
);

console.error('SMOKE_PROGRESS before original line 815: const badConstructorFamilyUniverseArgs = checkCoreDeclarations([');
const badConstructorFamilyUniverseArgs = checkCoreDeclarations([
  {
    kind: 'inductive',
    name: 'BadCtorFamilyUniverseArgs',
    levelParams: ['u'],
    type: { tag: 'sort', level: levelSucc(levelParam('u')) },
    numParams: 0,
    numIndices: 0,
    constructors: [
      { name: 'BadCtorFamilyUniverseArgs.mk', type: { tag: 'const', name: 'BadCtorFamilyUniverseArgs', levels: [LevelZero] } },
    ],
  },
], 'constructor-family-universe-args-smoke');
console.error('SMOKE_PROGRESS before original line 828: assert.equal(badConstructorFamilyUniverseArgs.status, "rejected", "constructor c');
assert.equal(badConstructorFamilyUniverseArgs.status, 'rejected', 'constructor codomain must use the inductive family at its declared universe parameters');

console.error('SMOKE_PROGRESS before original line 830: const badConstructorSwappedParams = checkCoreDeclarations([');
const badConstructorSwappedParams = checkCoreDeclarations([
  {
    kind: 'inductive',
    name: 'BadConstructorSwappedParams',
    levelParams: [],
    type: { tag: 'pi', domain: type0, body: { tag: 'pi', domain: type0, body: type0 } },
    numParams: 2,
    numIndices: 0,
    constructors: [
      {
        name: 'BadConstructorSwappedParams.mk',
        type: {
          tag: 'pi',
          domain: type0,
          body: {
            tag: 'pi',
            domain: type0,
            body: {
              tag: 'app',
              fn: { tag: 'app', fn: { tag: 'const', name: 'BadConstructorSwappedParams', levels: [] }, arg: { tag: 'bvar', index: 0 } },
              arg: { tag: 'bvar', index: 1 },
            },
          },
        },
      },
    ],
  },
], 'constructor-swapped-params-smoke');
console.error('SMOKE_PROGRESS before original line 858: assert.equal(badConstructorSwappedParams.status, "rejected", "constructor codoma');
assert.equal(badConstructorSwappedParams.status, 'rejected', 'constructor codomain parameters must be applied uniformly in family telescope order');


console.error('SMOKE_PROGRESS before original line 861: const cumulativeSortDefinition = checkCoreDeclarations([');
const cumulativeSortDefinition = checkCoreDeclarations([
  {
    kind: 'definition',
    name: 'PropAsHigherSort',
    levelParams: [],
    type: { tag: 'sort', level: levelSucc(levelSucc(LevelZero)) },
    value: { tag: 'sort', level: LevelZero },
    reducibility: 'regular',
  },
], 'sort-cumulativity-smoke');
console.error('SMOKE_PROGRESS before original line 871: assert.equal(cumulativeSortDefinition.status, "accepted", cumulativeSortDefiniti');
assert.equal(cumulativeSortDefinition.status, 'accepted', cumulativeSortDefinition.message);

console.error('SMOKE_PROGRESS before original line 873: const badLetAnnotationSummary = checkCoreDeclarations([');
const badLetAnnotationSummary = checkCoreDeclarations([
  axiom,
  { kind: 'axiom', name: 'letBadTypeValue', levelParams: [], type: { tag: 'const', name: 'A', levels: [] } },
  { kind: 'axiom', name: 'letBadValue', levelParams: [], type: { tag: 'const', name: 'letBadTypeValue', levels: [] } },
  {
    kind: 'definition',
    name: 'badLetAnnotation',
    levelParams: [],
    type: { tag: 'const', name: 'A', levels: [] },
    value: {
      tag: 'let',
      type: { tag: 'const', name: 'letBadTypeValue', levels: [] },
      value: { tag: 'const', name: 'letBadValue', levels: [] },
      body: { tag: 'const', name: 'letBadTypeValue', levels: [] },
      nondep: false,
    },
    reducibility: 'regular',
  },
], 'bad-let-annotation-smoke');
console.error('SMOKE_PROGRESS before original line 892: assert.equal(badLetAnnotationSummary.status, "rejected", "let annotation types m');
assert.equal(badLetAnnotationSummary.status, 'rejected', 'let annotation types must themselves infer to Sort/Type');

console.error('SMOKE_PROGRESS before original line 894: const highFormatVersionReplay = replayCoreArtifact({');
const highFormatVersionReplay = replayCoreArtifact({
  format: 'proofscript-core',
  formatVersion: 999,
  proofscriptReference: 'v0.2.1',
  leanSemanticBaseline: '4.33.1',
  implementationProfile: 'high-format-version-smoke',
  declarations: [],
  typeclasses: { classes: [], instances: [] },
});
console.error('SMOKE_PROGRESS before original line 903: assert.equal(highFormatVersionReplay.status, "rejected", "replay must reject unk');
assert.equal(highFormatVersionReplay.status, 'rejected', 'replay must reject unknown future core artifact format versions');

console.error('SMOKE_PROGRESS before original line 905: const malformedTypeclassParamCountReplay = replayCoreArtifact({');
const malformedTypeclassParamCountReplay = replayCoreArtifact({
  format: 'proofscript-core',
  formatVersion: 1,
  proofscriptReference: 'v0.2.1',
  leanSemanticBaseline: '4.33.1',
  implementationProfile: 'malformed-typeclass-param-count-smoke',
  declarations: [],
  typeclasses: {
    classes: [{ name: 'TCBadParams', numParams: 2, params: [{ name: 'α', binderInfo: 'explicit' }], fields: [], declarationOrder: 0 }],
    instances: [],
  },
});
console.error('SMOKE_PROGRESS before original line 917: assert.equal(malformedTypeclassParamCountReplay.status, "rejected", "typeclass m');
assert.equal(malformedTypeclassParamCountReplay.status, 'rejected', 'typeclass metadata numParams must match params length');

console.error('SMOKE_PROGRESS before original line 919: const malformedTypeclassMissingClassReplay = replayCoreArtifact({');
const malformedTypeclassMissingClassReplay = replayCoreArtifact({
  format: 'proofscript-core',
  formatVersion: 1,
  proofscriptReference: 'v0.2.1',
  leanSemanticBaseline: '4.33.1',
  implementationProfile: 'malformed-typeclass-missing-class-smoke',
  declarations: [],
  typeclasses: {
    classes: [],
    instances: [{ name: 'missingClassInst', className: 'MissingClass', priority: 1000, declarationOrder: 0, scope: 'global', anonymous: false }],
  },
});
console.error('SMOKE_PROGRESS before original line 931: assert.equal(malformedTypeclassMissingClassReplay.status, "rejected", "typeclass');
assert.equal(malformedTypeclassMissingClassReplay.status, 'rejected', 'typeclass instance metadata must reference a declared typeclass metadata entry');

console.error('SMOKE_PROGRESS before original line 933: const malformedModuleEntryReplay = replayCoreArtifact({');
const malformedModuleEntryReplay = replayCoreArtifact({
  format: 'proofscript-core',
  formatVersion: 1,
  proofscriptReference: 'v0.2.1',
  leanSemanticBaseline: '4.33.1',
  implementationProfile: 'malformed-module-entry-smoke',
  declarations: [],
  typeclasses: { classes: [], instances: [] },
  modules: {
    entry: 'Missing.Entry',
    interfaceFormatVersion: 1,
    cacheKeyFormatVersion: 1,
    baseEnvironmentSha256: 'base-sha',
    modules: [{
      name: 'Actual.Entry',
      sourceSha256: 'source-sha',
      imports: [],
      declarations: [],
      exports: [],
      interfaceSha256: 'interface-sha',
      cacheKeySha256: 'cache-sha',
    }],
  },
});
console.error('SMOKE_PROGRESS before original line 957: assert.equal(malformedModuleEntryReplay.status, "rejected", "module metadata ent');
assert.equal(malformedModuleEntryReplay.status, 'rejected', 'module metadata entry must reference one of the serialized modules');

console.error('SMOKE_PROGRESS before original line 959: assert.match(pskernelStatus(), /trusted-boundary/, "pskernel status should expos');
assert.match(pskernelStatus(), /trusted-boundary/, 'pskernel status should expose conservative trust label');
console.error('SMOKE_PROGRESS before original line 960: assert.equal(');
assert.equal(
  pskernelCheckCore([generateNatDeclaration()], 'main-entry-smoke').status,
  'accepted',
  'pskernelCheckCore main entry should route through the active pskernel kernel',
);

console.error('SMOKE_PROGRESS before original line 966: const helperPreludeSummary = checkCoreDeclarationsWithPrelude([');
const helperPreludeSummary = checkCoreDeclarationsWithPrelude([
  {
    kind: 'definition',
    name: 'oneWithHelperPrelude',
    levelParams: [],
    type: { tag: 'const', name: 'Nat', levels: [] },
    value: { tag: 'app', fn: { tag: 'const', name: 'Nat.succ', levels: [] }, arg: { tag: 'const', name: 'Nat.zero', levels: [] } },
    reducibility: 'regular',
  },
], 'helper-prelude-smoke', 'core');
console.error('SMOKE_PROGRESS before original line 976: assert.equal(helperPreludeSummary.status, "accepted", helperPreludeSummary.messa');
assert.equal(helperPreludeSummary.status, 'accepted', helperPreludeSummary.message);


console.error('SMOKE_PROGRESS before original line 979: const quotientReductionEnv = new Environment();');
const quotientReductionEnv = new Environment();
installCorePrimitives(quotientReductionEnv, { quotients: true });
console.error('SMOKE_PROGRESS before original line 981: const qConst = (name, levels = []) => ({ tag: "const", name, levels });');
const qConst = (name, levels = []) => ({ tag: 'const', name, levels });
console.error('SMOKE_PROGRESS before original line 982: const qApp = (fn, arg) => ({ tag: "app", fn, arg });');
const qApp = (fn, arg) => ({ tag: 'app', fn, arg });
console.error('SMOKE_PROGRESS before original line 983: const qApps = (fn, args) => args.reduce((acc, arg) => qApp(acc, arg), fn);');
const qApps = (fn, args) => args.reduce((acc, arg) => qApp(acc, arg), fn);
console.error('SMOKE_PROGRESS before original line 984: const qPi = (domain, body, binderInfo = "explicit") => ({ tag: "pi", domain, bod');
const qPi = (domain, body, binderInfo = 'explicit') => ({ tag: 'pi', domain, body, binderInfo });
console.error('SMOKE_PROGRESS before original line 985: const natTerm = qConst("Nat");');
const natTerm = qConst('Nat');
console.error('SMOKE_PROGRESS before original line 986: const natUniverse = levelSucc(LevelZero);');
const natUniverse = levelSucc(LevelZero);
console.error('SMOKE_PROGRESS before original line 987: checkAndAddDeclaration(quotientReductionEnv, {');
checkAndAddDeclaration(quotientReductionEnv, {
  kind: 'axiom',
  name: 'NatRel',
  levelParams: [],
  type: qPi(natTerm, qPi(natTerm, { tag: 'sort', level: LevelZero })),
});
console.error('SMOKE_PROGRESS before original line 993: const relAB = qApps(qConst("NatRel"), [{ tag: "bvar", index: 1 }, { tag: "bvar",');
const relAB = qApps(qConst('NatRel'), [{ tag: 'bvar', index: 1 }, { tag: 'bvar', index: 0 }]);
console.error('SMOKE_PROGRESS before original line 994: const succA = qApp(qConst("Nat.succ"), { tag: "bvar", index: 2 });');
const succA = qApp(qConst('Nat.succ'), { tag: 'bvar', index: 2 });
console.error('SMOKE_PROGRESS before original line 995: const succB = qApp(qConst("Nat.succ"), { tag: "bvar", index: 1 });');
const succB = qApp(qConst('Nat.succ'), { tag: 'bvar', index: 1 });
console.error('SMOKE_PROGRESS before original line 996: const succSoundType = qPi(');
const succSoundType = qPi(
  natTerm,
  qPi(
    natTerm,
    qPi(relAB, qApps(qConst('Eq', [natUniverse]), [natTerm, succA, succB])),
  ),
);
console.error('SMOKE_PROGRESS before original line 1003: checkAndAddDeclaration(quotientReductionEnv, {');
checkAndAddDeclaration(quotientReductionEnv, {
  kind: 'axiom',
  name: 'NatSuccSound',
  levelParams: [],
  type: succSoundType,
});
console.error('SMOKE_PROGRESS before original line 1009: const quotNatRelZero = qApps(qConst("Quot.mk", [natUniverse]), [natTerm, qConst(');
const quotNatRelZero = qApps(qConst('Quot.mk', [natUniverse]), [natTerm, qConst('NatRel'), qConst('Nat.zero')]);
console.error('SMOKE_PROGRESS before original line 1010: const quotLiftSucc = qApps(qConst("Quot.lift", [natUniverse, natUniverse]), [');
const quotLiftSucc = qApps(qConst('Quot.lift', [natUniverse, natUniverse]), [
  natTerm,
  qConst('NatRel'),
  natTerm,
  qConst('Nat.succ'),
  qConst('NatSuccSound'),
  quotNatRelZero,
]);
console.error('SMOKE_PROGRESS before original line 1018: assert.deepEqual(');
assert.deepEqual(
  whnf(quotientReductionEnv, [], quotLiftSucc),
  qApp(qConst('Nat.succ'), qConst('Nat.zero')),
  'Quot.lift over a Quot.mk major premise should reduce to f applied to the representative in the supported quotient slice',
);


console.error('SMOKE_PROGRESS before original line 1025: checkAndAddDeclaration(quotientReductionEnv, { kind: "axiom", name: "QuotIndP", ');
checkAndAddDeclaration(quotientReductionEnv, { kind: 'axiom', name: 'QuotIndP', levelParams: [], type: { tag: 'sort', level: LevelZero } });
console.error('SMOKE_PROGRESS before original line 1026: checkAndAddDeclaration(quotientReductionEnv, {');
checkAndAddDeclaration(quotientReductionEnv, {
  kind: 'axiom',
  name: 'QuotIndMkProof',
  levelParams: [],
  type: qPi(natTerm, qConst('QuotIndP')),
});
console.error('SMOKE_PROGRESS before original line 1032: const quotNatRel = qApps(qConst("Quot", [natUniverse]), [natTerm, qConst("NatRel');
const quotNatRel = qApps(qConst('Quot', [natUniverse]), [natTerm, qConst('NatRel')]);
console.error('SMOKE_PROGRESS before original line 1033: const quotIndMotive = { tag: "lam", domain: quotNatRel, body: qConst("QuotIndP")');
const quotIndMotive = { tag: 'lam', domain: quotNatRel, body: qConst('QuotIndP') };
console.error('SMOKE_PROGRESS before original line 1034: const quotIndOverMk = qApps(qConst("Quot.ind", [natUniverse]), [');
const quotIndOverMk = qApps(qConst('Quot.ind', [natUniverse]), [
  natTerm,
  qConst('NatRel'),
  quotIndMotive,
  qConst('QuotIndMkProof'),
  quotNatRelZero,
]);
console.error('SMOKE_PROGRESS before original line 1041: assert.deepEqual(');
assert.deepEqual(
  whnf(quotientReductionEnv, [], quotIndOverMk),
  qApp(qConst('QuotIndMkProof'), qConst('Nat.zero')),
  'Quot.ind over a Quot.mk major premise should reduce to the mk proof applied to the representative in the supported quotient slice',
);

console.error('SMOKE_PROGRESS before original line 1047: const natLiteralTwo = { tag: "lit", literal: { tag: "nat", value: 2 } };');
const natLiteralTwo = { tag: 'lit', literal: { tag: 'nat', value: 2 } };
console.error('SMOKE_PROGRESS before original line 1048: assert.deepEqual(');
assert.deepEqual(
  infer(quotientReductionEnv, [], natLiteralTwo),
  qConst('Nat'),
  'trusted Core Nat literal should infer Nat only after Nat is in the trusted environment',
);
console.error('SMOKE_PROGRESS before original line 1053: assert.deepEqual(');
assert.deepEqual(
  whnf(quotientReductionEnv, [], natLiteralTwo),
  qApp(qConst('Nat.succ'), qApp(qConst('Nat.succ'), qConst('Nat.zero'))),
  'trusted Core Nat literal should normalize to Nat constructors',
);
console.error('SMOKE_PROGRESS before original line 1058: assert.equal(');
assert.equal(
  defEq(quotientReductionEnv, [], natLiteralTwo, qApp(qConst('Nat.succ'), qApp(qConst('Nat.succ'), qConst('Nat.zero')))),
  true,
  'trusted Core Nat literal should participate in definitional equality against constructor-expanded Nat values',
);
console.error('SMOKE_PROGRESS before original line 1063: const unsupportedStringLiteral = checkCoreDeclarationsWithPrelude([');
const badStringLiteral = checkCoreDeclarationsWithPrelude([
  { kind: 'definition', name: 'badStringLiteral', levelParams: [], type: qConst('Nat'), value: { tag: 'lit', literal: { tag: 'str', value: 'x' } }, reducibility: 'regular' },
], 'string-literal-typecheck-smoke', 'core');
console.error('SMOKE_PROGRESS before string literal typecheck assertion');
assert.equal(badStringLiteral.status, 'rejected', 'trusted Core String literals must be checked as String and reject Nat expectations');

console.error('SMOKE_PROGRESS before original line 1068: const pskernelStatusOutput = execFileSync(process.execPath, ["tools/pskernel.ts');
const pskernelStatusOutput = execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'status'], { encoding: 'utf8' });
console.error('SMOKE_PROGRESS before original line 1069: assert.match(pskernelStatusOutput, /trusted-boundary/, "pskernel CLI status shou');
assert.match(pskernelStatusOutput, /trusted-boundary/, 'pskernel CLI status should expose conservative trust label');
console.error('SMOKE_PROGRESS before original line 1070: const pskernelStatusJson = JSON.parse(execFileSync(process.execPath, ["tools/psk');
const pskernelStatusJson = JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'status', '--json'], { encoding: 'utf8' }));
console.error('SMOKE_PROGRESS before original line 1071: assert.equal(pskernelStatusJson.status, "trusted-boundary", "pskernel CLI JSON s');
assert.equal(pskernelStatusJson.status, 'trusted-boundary', 'pskernel CLI JSON status should expose trust status');
console.error('SMOKE_PROGRESS before original line 1072: assert.ok(pskernelStatusJson.supportedSlices.some((slice) => slice.includes("pro');
assert.ok(pskernelStatusJson.supportedSlices.some((slice) => slice.includes('projection')), 'pskernel CLI JSON status should include new projection support slice');

console.error('SMOKE_PROGRESS before original line 1074: const cliCheckCoreInput = "artifacts/pskernel-cli-check-core-smoke.json";');
const cliCheckCoreInput = 'artifacts/pskernel-cli-check-core-smoke.json';
console.error('SMOKE_PROGRESS before original line 1075: await import("node:fs").then(fs => fs.writeFileSync(cliCheckCoreInput, JSON.stri');
await import('node:fs').then(fs => fs.writeFileSync(cliCheckCoreInput, JSON.stringify([generateNatDeclaration()])));
console.error('SMOKE_PROGRESS before original line 1076: const pskernelCheckCoreOutput = execFileSync(process.execPath, ["tools/pskernel.');
const pskernelCheckCoreOutput = execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'check-core', cliCheckCoreInput, 'cli-smoke'], { encoding: 'utf8' });
console.error('SMOKE_PROGRESS before original line 1077: assert.equal(JSON.parse(pskernelCheckCoreOutput).status, "accepted", "pskernel C');
assert.equal(JSON.parse(pskernelCheckCoreOutput).status, 'accepted', 'pskernel CLI check-core should check declaration arrays');


console.error('SMOKE_PROGRESS before original line 1080: const paramRecursorTypedEnv = new Environment();');
const paramRecursorTypedEnv = new Environment();
installCorePrimitives(paramRecursorTypedEnv);
console.error('SMOKE_PROGRESS before original line 1082: const boxUniverse = levelSucc(LevelZero);');
const boxUniverse = levelSucc(LevelZero);
console.error('SMOKE_PROGRESS before original line 1083: checkAndAddDeclaration(paramRecursorTypedEnv, {');
checkAndAddDeclaration(paramRecursorTypedEnv, {
  kind: 'inductive',
  name: 'Box',
  levelParams: ['u'],
  type: {
    tag: 'pi',
    domain: { tag: 'sort', level: levelParam('u') },
    body: { tag: 'sort', level: levelParam('u') },
  },
  numParams: 1,
  numIndices: 0,
  constructors: [
    {
      name: 'Box.mk',
      type: {
        tag: 'pi',
        domain: { tag: 'sort', level: levelParam('u') },
        body: {
          tag: 'pi',
          domain: { tag: 'bvar', index: 0 },
          body: {
            tag: 'app',
            fn: { tag: 'const', name: 'Box', levels: [levelParam('u')] },
            arg: { tag: 'bvar', index: 1 },
          },
        },
      },
    },
  ],
});
console.error('SMOKE_PROGRESS before original line 1113: const boxRecType = infer(paramRecursorTypedEnv, [], { tag: "const", name: "Box.r');
const boxRecType = infer(paramRecursorTypedEnv, [], { tag: 'const', name: 'Box.rec', levels: [boxUniverse, boxUniverse] });
console.error('SMOKE_PROGRESS before original line 1114: assert.equal(boxRecType.tag, "pi", "parameterized non-indexed Box.rec should syn');
assert.equal(boxRecType.tag, 'pi', 'parameterized non-indexed Box.rec should synthesize a usable type');
console.error('SMOKE_PROGRESS before original line 1115: assert.equal(ensureSort(paramRecursorTypedEnv, [], infer(paramRecursorTypedEnv, ');
assert.equal(ensureSort(paramRecursorTypedEnv, [], infer(paramRecursorTypedEnv, [], boxRecType)).tag, 'sort', 'synthesized parameterized Box.rec type must itself be a valid type');
console.error('SMOKE_PROGRESS before original line 1116: assert.equal(');
assert.equal(
  paramRecursorTypedEnv.findConstant('Box.rec')?.metadata?.status,
  'typed-simple-nonindexed',
  'parameterized non-indexed recursor metadata should be marked typed for the supported slice',
);
console.error('SMOKE_PROGRESS before original line 1121: assert.equal(');
assert.equal(
  paramRecursorTypedEnv.findConstant('Box.rec')?.metadata?.numParams,
  1,
  'parameterized recursor metadata should record the number of uniform family parameters',
);
console.error('SMOKE_PROGRESS before original line 1126: assert.deepEqual(');
assert.deepEqual(
  paramRecursorTypedEnv.findConstant('Box.rec')?.metadata?.rules,
  [{ ctor: 'Box.mk', nfields: 1, recursiveFields: [false] }],
  'parameterized recursor metadata should count constructor fields after uniform parameters, not the parameters themselves',
);
console.error('SMOKE_PROGRESS before original line 1131: const boxNat = qApps(qConst("Box", [boxUniverse]), [qConst("Nat")]);');
const boxNat = qApps(qConst('Box', [boxUniverse]), [qConst('Nat')]);
console.error('SMOKE_PROGRESS before original line 1132: const boxMkNatZero = qApps(qConst("Box.mk", [boxUniverse]), [qConst("Nat"), qCon');
const boxMkNatZero = qApps(qConst('Box.mk', [boxUniverse]), [qConst('Nat'), qConst('Nat.zero')]);
console.error('SMOKE_PROGRESS before original line 1133: const boxMotive = { tag: "lam", domain: boxNat, body: qConst("Nat") };');
const boxMotive = { tag: 'lam', domain: boxNat, body: qConst('Nat') };
console.error('SMOKE_PROGRESS before original line 1134: const boxMinor = { tag: "lam", domain: qConst("Nat"), body: { tag: "bvar", index');
const boxMinor = { tag: 'lam', domain: qConst('Nat'), body: { tag: 'bvar', index: 0 } };
console.error('SMOKE_PROGRESS before original line 1135: const boxRecOnMk = qApps(qConst("Box.rec", [boxUniverse, boxUniverse]), [qConst(');
const boxRecOnMk = qApps(qConst('Box.rec', [boxUniverse, boxUniverse]), [qConst('Nat'), boxMotive, boxMinor, boxMkNatZero]);
console.error('SMOKE_PROGRESS before original line 1136: assert.deepEqual(');
assert.deepEqual(
  whnf(paramRecursorTypedEnv, [], boxRecOnMk),
  qConst('Nat.zero'),
  'parameterized simple recursor should iota-reduce when the major premise is the matching constructor',
);


console.error('SMOKE_PROGRESS before original line 1143: const boxProjection = { tag: "proj", typeName: "Box", index: 0, expr: boxMkNatZe');
const boxProjection = { tag: 'proj', typeName: 'Box', index: 0, expr: boxMkNatZero };
console.error('SMOKE_PROGRESS before original line 1144: assert.deepEqual(');
assert.deepEqual(
  infer(paramRecursorTypedEnv, [], boxProjection),
  qConst('Nat'),
  'simple single-constructor projection should infer the instantiated field type',
);
console.error('SMOKE_PROGRESS before original line 1149: assert.deepEqual(');
assert.deepEqual(
  whnf(paramRecursorTypedEnv, [], boxProjection),
  qConst('Nat.zero'),
  'simple single-constructor projection should reduce on a constructor major premise',
);
console.error('SMOKE_PROGRESS before original line 1154: assert.equal(');
assert.equal(
  defEq(paramRecursorTypedEnv, [], boxProjection, qConst('Nat.zero')),
  true,
  'projection reduction should participate in definitional equality',
);

console.error('SMOKE_PROGRESS before original line 1160: const boxEtaVar = { tag: "bvar", index: 0 };');
const boxEtaVar = { tag: 'bvar', index: 0 };
console.error('SMOKE_PROGRESS before original line 1161: const boxEtaExpansion = qApps(qConst("Box.mk", [boxUniverse]), [');
const boxEtaExpansion = qApps(qConst('Box.mk', [boxUniverse]), [
  qConst('Nat'),
  { tag: 'proj', typeName: 'Box', index: 0, expr: boxEtaVar },
]);
console.error('SMOKE_PROGRESS before original line 1165: assert.equal(');
assert.equal(
  defEq(paramRecursorTypedEnv, [boxNat], boxEtaVar, boxEtaExpansion),
  true,
  'simple single-constructor structure eta should make x defeq to Box.mk Nat (proj Box 0 x)',
);
console.error('SMOKE_PROGRESS before original line 1170: assert.equal(');
assert.equal(
  defEq(paramRecursorTypedEnv, [boxNat], boxEtaExpansion, boxEtaVar),
  true,
  'simple single-constructor structure eta should work symmetrically',
);

console.error('SMOKE_PROGRESS before original line 1176: const badProjectionSummary = checkCoreDeclarationsWithPrelude([');
const badProjectionSummary = checkCoreDeclarationsWithPrelude([
  {
    kind: 'inductive',
    name: 'BadProjectionBox',
    levelParams: ['u'],
    type: qPi({ tag: 'sort', level: levelParam('u') }, { tag: 'sort', level: levelParam('u') }),
    numParams: 1,
    numIndices: 0,
    constructors: [
      {
        name: 'BadProjectionBox.mk',
        type: qPi(
          { tag: 'sort', level: levelParam('u') },
          qPi(
            { tag: 'bvar', index: 0 },
            qApps(qConst('BadProjectionBox', [levelParam('u')]), [{ tag: 'bvar', index: 1 }]),
          ),
        ),
      },
    ],
  },
  {
    kind: 'definition',
    name: 'badProjectionOutOfRange',
    levelParams: [],
    type: qConst('Nat'),
    value: {
      tag: 'proj',
      typeName: 'BadProjectionBox',
      index: 1,
      expr: qApps(qConst('BadProjectionBox.mk', [levelSucc(LevelZero)]), [qConst('Nat'), qConst('Nat.zero')]),
    },
    reducibility: 'regular',
  },
], 'projection-out-of-range-smoke', 'core');
console.error('SMOKE_PROGRESS before original line 1211: assert.equal(badProjectionSummary.status, "rejected", "out-of-range projection m');
assert.equal(badProjectionSummary.status, 'rejected', 'out-of-range projection must reject before declaration admission');

console.error('SMOKE_PROGRESS before original line 1213: const listRecursorEnv = new Environment();');
const listRecursorEnv = new Environment();
installCorePrimitives(listRecursorEnv);
console.error('SMOKE_PROGRESS before original line 1215: checkAndAddDeclaration(listRecursorEnv, {');
checkAndAddDeclaration(listRecursorEnv, {
  kind: 'inductive',
  name: 'ListLike',
  levelParams: ['u'],
  type: qPi({ tag: 'sort', level: levelParam('u') }, { tag: 'sort', level: levelParam('u') }),
  numParams: 1,
  numIndices: 0,
  constructors: [
    {
      name: 'ListLike.nil',
      type: qPi(
        { tag: 'sort', level: levelParam('u') },
        qApps(qConst('ListLike', [levelParam('u')]), [{ tag: 'bvar', index: 0 }]),
      ),
    },
    {
      name: 'ListLike.cons',
      type: qPi(
        { tag: 'sort', level: levelParam('u') },
        qPi(
          { tag: 'bvar', index: 0 },
          qPi(
            qApps(qConst('ListLike', [levelParam('u')]), [{ tag: 'bvar', index: 1 }]),
            qApps(qConst('ListLike', [levelParam('u')]), [{ tag: 'bvar', index: 2 }]),
          ),
        ),
      ),
    },
  ],
});
console.error('SMOKE_PROGRESS before original line 1245: assert.deepEqual(');
assert.deepEqual(
  listRecursorEnv.findConstant('ListLike.rec')?.metadata?.rules,
  [
    { ctor: 'ListLike.nil', nfields: 0, recursiveFields: [] },
    { ctor: 'ListLike.cons', nfields: 2, recursiveFields: [false, true] },
  ],
  'List-like recursor metadata should mark the tail field as directly recursive',
);
console.error('SMOKE_PROGRESS before original line 1253: const listNat = qApps(qConst("ListLike", [levelSucc(LevelZero)]), [qConst("Nat")');
const listNat = qApps(qConst('ListLike', [levelSucc(LevelZero)]), [qConst('Nat')]);
console.error('SMOKE_PROGRESS before original line 1254: const listNilNat = qApps(qConst("ListLike.nil", [levelSucc(LevelZero)]), [qConst');
const listNilNat = qApps(qConst('ListLike.nil', [levelSucc(LevelZero)]), [qConst('Nat')]);
console.error('SMOKE_PROGRESS before original line 1255: const listConsNat = qApps(qConst("ListLike.cons", [levelSucc(LevelZero)]), [qCon');
const listConsNat = qApps(qConst('ListLike.cons', [levelSucc(LevelZero)]), [qConst('Nat'), qConst('Nat.zero'), listNilNat]);
console.error('SMOKE_PROGRESS before original line 1256: const listMotive = { tag: "lam", domain: listNat, body: qConst("Nat") };');
const listMotive = { tag: 'lam', domain: listNat, body: qConst('Nat') };
console.error('SMOKE_PROGRESS before original line 1257: const listNilMinor = qConst("Nat.zero");');
const listNilMinor = qConst('Nat.zero');
console.error('SMOKE_PROGRESS before original line 1258: const listConsMinor = {');
const listConsMinor = {
  tag: 'lam',
  domain: qConst('Nat'),
  body: {
    tag: 'lam',
    domain: listNat,
    body: {
      tag: 'lam',
      domain: qConst('Nat'),
      body: qApp(qConst('Nat.succ'), { tag: 'bvar', index: 0 }),
    },
  },
};
console.error('SMOKE_PROGRESS before original line 1271: const listRecOnCons = qApps(qConst("ListLike.rec", [levelSucc(LevelZero), levelS');
const listRecOnCons = qApps(qConst('ListLike.rec', [levelSucc(LevelZero), levelSucc(LevelZero)]), [
  qConst('Nat'),
  listMotive,
  listNilMinor,
  listConsMinor,
  listConsNat,
]);
console.error('SMOKE_PROGRESS before original line 1278: assert.equal(');
assert.equal(
  defEq(listRecursorEnv, [], listRecOnCons, qApp(qConst('Nat.succ'), qConst('Nat.zero'))),
  true,
  'parameterized recursive List-like recursor should iota-reduce recursively under definitional equality',
);

console.error('SMOKE_PROGRESS before original line 1284: const indexedFamilyRecursorSummary = checkCoreDeclarationsWithPrelude([');
const indexedFamilyRecursorSummary = checkCoreDeclarationsWithPrelude([
  {
    kind: 'inductive',
    name: 'IndexedLike',
    levelParams: [],
    type: qPi(qConst('Nat'), type0),
    numParams: 0,
    numIndices: 1,
    constructors: [
      { name: 'IndexedLike.zero', type: qApps(qConst('IndexedLike'), [qConst('Nat.zero')]) },
    ],
  },
  {
    kind: 'definition',
    name: 'badIndexedRecursorUse',
    levelParams: [],
    type: qConst('Nat'),
    value: qConst('IndexedLike.rec'),
    reducibility: 'regular',
  },
], 'indexed-recursor-fail-closed-smoke', 'core');
console.error('SMOKE_PROGRESS before original line 1305: assert.equal(indexedFamilyRecursorSummary.status, "unsupported", "indexed family');
assert.equal(indexedFamilyRecursorSummary.status, 'unsupported', 'indexed family recursors must remain fail-closed until indexed recursor typing is implemented');


console.error('SMOKE_PROGRESS before original line 1308: const eqRecursorEnv = new Environment();');
const eqRecursorEnv = new Environment();
installCorePrimitives(eqRecursorEnv);
console.error('SMOKE_PROGRESS before original line 1310: const eqRecLevels = [natUniverse, natUniverse];');
const eqRecLevels = [natUniverse, natUniverse];
console.error('SMOKE_PROGRESS before original line 1311: const eqRecType = infer(eqRecursorEnv, [], qConst("Eq.rec", eqRecLevels));');
const eqRecType = infer(eqRecursorEnv, [], qConst('Eq.rec', eqRecLevels));
console.error('SMOKE_PROGRESS before original line 1312: assert.equal(eqRecType.tag, "pi", "Eq.rec should synthesize a typed indexed equa');
assert.equal(eqRecType.tag, 'pi', 'Eq.rec should synthesize a typed indexed equality recursor');
console.error('SMOKE_PROGRESS before original line 1313: assert.equal(ensureSort(eqRecursorEnv, [], infer(eqRecursorEnv, [], eqRecType)).');
assert.equal(ensureSort(eqRecursorEnv, [], infer(eqRecursorEnv, [], eqRecType)).tag, 'sort', 'synthesized Eq.rec type must itself typecheck as a Sort');
console.error('SMOKE_PROGRESS before original line 1314: const eqRecMotive = {');
const eqRecMotive = {
  tag: 'lam',
  domain: qConst('Nat'),
  body: {
    tag: 'lam',
    domain: qApps(qConst('Eq', [natUniverse]), [qConst('Nat'), qConst('Nat.zero'), { tag: 'bvar', index: 0 }]),
    body: qConst('Nat'),
  },
};
console.error('SMOKE_PROGRESS before original line 1323: const eqReflZero = qApps(qConst("Eq.refl", [natUniverse]), [qConst("Nat"), qCons');
const eqReflZero = qApps(qConst('Eq.refl', [natUniverse]), [qConst('Nat'), qConst('Nat.zero')]);
console.error('SMOKE_PROGRESS before original line 1324: const eqRecOnRefl = qApps(qConst("Eq.rec", eqRecLevels), [');
const eqRecOnRefl = qApps(qConst('Eq.rec', eqRecLevels), [
  qConst('Nat'),
  qConst('Nat.zero'),
  eqRecMotive,
  qConst('Nat.zero'),
  qConst('Nat.zero'),
  eqReflZero,
]);
console.error('SMOKE_PROGRESS before original line 1332: assert.deepEqual(');
assert.deepEqual(
  whnf(eqRecursorEnv, [], eqRecOnRefl),
  qConst('Nat.zero'),
  'Eq.rec should iota-reduce on Eq.refl in the supported indexed equality slice',
);
console.error('SMOKE_PROGRESS before original line 1337: const eqRecOnNeutral = qApps(qConst("Eq.rec", eqRecLevels), [');
const eqRecOnNeutral = qApps(qConst('Eq.rec', eqRecLevels), [
  qConst('Nat'),
  qConst('Nat.zero'),
  eqRecMotive,
  qConst('Nat.zero'),
  qConst('Nat.zero'),
  qConst('someEqualityProof'),
]);
console.error('SMOKE_PROGRESS before original line 1345: checkAndAddDeclaration(eqRecursorEnv, {');
checkAndAddDeclaration(eqRecursorEnv, {
  kind: 'axiom',
  name: 'someEqualityProof',
  levelParams: [],
  type: qApps(qConst('Eq', [natUniverse]), [qConst('Nat'), qConst('Nat.zero'), qConst('Nat.zero')]),
});
console.error('SMOKE_PROGRESS before original line 1351: assert.deepEqual(');
assert.deepEqual(
  whnf(eqRecursorEnv, [], eqRecOnNeutral),
  eqRecOnNeutral,
  'Eq.rec must remain neutral when the equality proof is not Eq.refl',
);


console.error('SMOKE_PROGRESS before original line 1358: const replayNatLiteralArtifact = {');
const replayNatLiteralArtifact = {
  format: 'proofscript-core',
  formatVersion: 1,
  proofscriptReference: 'v0.2.1',
  leanSemanticBaseline: '4.33.1',
  implementationProfile: 'nat-literal-replay-shape-smoke',
  prelude: 'core',
  declarations: [
    { kind: 'definition', name: 'twoByLiteralReplay', levelParams: [], type: qConst('Nat'), value: { tag: 'lit', literal: { tag: 'nat', value: 2 } }, reducibility: 'regular' },
  ],
  typeclasses: { classes: [], instances: [] },
};
console.error('SMOKE_PROGRESS before original line 1370: const natLiteralReplay = replayCoreArtifact(replayNatLiteralArtifact);');
const natLiteralReplay = replayCoreArtifact(replayNatLiteralArtifact);
console.error('SMOKE_PROGRESS before original line 1371: assert.equal(natLiteralReplay.status, "accepted", natLiteralReplay.message);');
assert.equal(natLiteralReplay.status, 'accepted', natLiteralReplay.message);
console.error('SMOKE_PROGRESS before original line 1372: assert.match(natLiteralReplay.semanticSha256, /^[0-9a-f]{64}$/, "accepted replay');
assert.match(natLiteralReplay.semanticSha256, /^[0-9a-f]{64}$/, 'accepted replay summary should include deterministic semantic hash');
console.error('SMOKE_PROGRESS before original line 1373: const natLiteralCertificate = certifyCoreArtifact(replayNatLiteralArtifact);');
const natLiteralCertificate = certifyCoreArtifact(replayNatLiteralArtifact);
console.error('SMOKE_PROGRESS before original line 1374: assert.equal(natLiteralCertificate.status, "accepted", natLiteralCertificate.mes');
assert.equal(natLiteralCertificate.status, 'accepted', natLiteralCertificate.message);
console.error('SMOKE_PROGRESS before original line 1375: assert.match(natLiteralCertificate.certificate?.semanticSha256, /^[0-9a-f]{64}$/');
assert.match(natLiteralCertificate.certificate?.semanticSha256, /^[0-9a-f]{64}$/, 'certificate should include semantic hash');
console.error('SMOKE_PROGRESS before original line 1376: assert.equal(natLiteralCertificate.certificate?.semanticSha256, natLiteralReplay');
assert.equal(natLiteralCertificate.certificate?.semanticSha256, natLiteralReplay.semanticSha256, 'certificate hash should match replay summary hash');

console.error('SMOKE_PROGRESS before original line 1378: const malformedLiteralReplay = replayCoreArtifact({');
const malformedLiteralReplay = replayCoreArtifact({
  ...replayNatLiteralArtifact,
  implementationProfile: 'bad-literal-replay-shape-smoke',
  declarations: [
    { kind: 'definition', name: 'badNatLiteralReplay', levelParams: [], type: qConst('Nat'), value: { tag: 'lit', literal: { tag: 'nat', value: -1 } }, reducibility: 'regular' },
  ],
});
console.error('SMOKE_PROGRESS before original line 1385: assert.equal(malformedLiteralReplay.status, "rejected", "replay validation must ');
assert.equal(malformedLiteralReplay.status, 'rejected', 'replay validation must reject malformed Nat literal shapes before checking');

console.error('SMOKE_PROGRESS before original line 1387: const moduleMismatchReplay = replayCoreArtifact({');
const moduleMismatchReplay = replayCoreArtifact({
  ...replayNatLiteralArtifact,
  implementationProfile: 'module-mismatch-replay-smoke',
  modules: {
    entry: 'Main',
    interfaceFormatVersion: 1,
    cacheKeyFormatVersion: 1,
    baseEnvironmentSha256: '0'.repeat(64),
    modules: [{
      name: 'Main',
      sourceSha256: '1'.repeat(64),
      imports: [],
      declarations: ['missingDeclaration'],
      exports: ['twoByLiteralReplay'],
      interfaceSha256: '2'.repeat(64),
      cacheKeySha256: '3'.repeat(64),
    }],
  },
});
console.error('SMOKE_PROGRESS before original line 1406: assert.equal(moduleMismatchReplay.status, "rejected", "replay must reject module');
assert.equal(moduleMismatchReplay.status, 'rejected', 'replay must reject module metadata that references missing checked declarations');

console.error('SMOKE_PROGRESS before original line 1408: const certInput = "artifacts/pskernel-cli-certify-smoke.json";');
const certInput = 'artifacts/pskernel-cli-certify-smoke.json';
console.error('SMOKE_PROGRESS before original line 1409: await import("node:fs").then(fs => fs.writeFileSync(certInput, JSON.stringify(re');
await import('node:fs').then(fs => fs.writeFileSync(certInput, JSON.stringify(replayNatLiteralArtifact)));
console.error('SMOKE_PROGRESS before original line 1410: const pskernelCertifyOutput = execFileSync(process.execPath, ["tools/pskernel.mj');
const pskernelCertifyOutput = execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'certify', certInput], { encoding: 'utf8' });
console.error('SMOKE_PROGRESS before original line 1411: const pskernelCertifyJson = JSON.parse(pskernelCertifyOutput);');
const pskernelCertifyJson = JSON.parse(pskernelCertifyOutput);
console.error('SMOKE_PROGRESS before original line 1412: assert.equal(pskernelCertifyJson.status, "accepted", "pskernel CLI certify shoul');
assert.equal(pskernelCertifyJson.status, 'accepted', 'pskernel CLI certify should accept a replayable artifact');
console.error('SMOKE_PROGRESS before original line 1413: assert.match(pskernelCertifyJson.certificate.semanticSha256, /^[0-9a-f]{64}$/, "');
assert.match(pskernelCertifyJson.certificate.semanticSha256, /^[0-9a-f]{64}$/, 'pskernel CLI certify should emit a deterministic semantic hash');


console.error('SMOKE_PROGRESS before original line 1416: const certificateVerification = verifyCoreReplayCertificate(replayNatLiteralArti');
const certificateVerification = verifyCoreReplayCertificate(replayNatLiteralArtifact, natLiteralCertificate.certificate);
console.error('SMOKE_PROGRESS before original line 1417: assert.equal(certificateVerification.status, "accepted", certificateVerification');
assert.equal(certificateVerification.status, 'accepted', certificateVerification.message);
console.error('SMOKE_PROGRESS before original line 1418: assert.equal(certificateVerification.semanticSha256, natLiteralCertificate.certi');
assert.equal(certificateVerification.semanticSha256, natLiteralCertificate.certificate.semanticSha256, 'verified certificate should preserve semantic hash');
console.error('SMOKE_PROGRESS before original line 1419: assert.equal(pskernelVerifyCoreCertificate(replayNatLiteralArtifact, natLiteralC');
assert.equal(pskernelVerifyCoreCertificate(replayNatLiteralArtifact, natLiteralCertificate.certificate).status, 'accepted', 'Main entry certificate verifier should accept matching certificate');
console.error('SMOKE_PROGRESS before original line 1420: const forgedCertificate = { ...natLiteralCertificate.certificate, semanticSha256');
const forgedCertificate = { ...natLiteralCertificate.certificate, semanticSha256: 'f'.repeat(64) };
console.error('SMOKE_PROGRESS before original line 1421: assert.equal(');
assert.equal(
  verifyCoreReplayCertificate(replayNatLiteralArtifact, forgedCertificate).status,
  'rejected',
  'certificate verifier must reject forged semantic hashes',
);
console.error('SMOKE_PROGRESS before original line 1426: const changedArtifactVerification = verifyCoreReplayCertificate(');
const changedArtifactVerification = verifyCoreReplayCertificate(
  {
    ...replayNatLiteralArtifact,
    declarations: [
      { kind: 'definition', name: 'threeByLiteralReplay', levelParams: [], type: qConst('Nat'), value: { tag: 'lit', literal: { tag: 'nat', value: 3 } }, reducibility: 'regular' },
    ],
  },
  natLiteralCertificate.certificate,
);
console.error('SMOKE_PROGRESS before original line 1435: assert.equal(changedArtifactVerification.status, "rejected", "certificate verifi');
assert.equal(changedArtifactVerification.status, 'rejected', 'certificate verifier must reject artifacts changed after certification');
console.error('SMOKE_PROGRESS before original line 1436: const verifyCertInput = "artifacts/pskernel-cli-verify-cert-smoke.json";');
const verifyCertInput = 'artifacts/pskernel-cli-verify-cert-smoke.json';
console.error('SMOKE_PROGRESS before original line 1437: await import("node:fs").then(fs => fs.writeFileSync(verifyCertInput, JSON.string');
await import('node:fs').then(fs => fs.writeFileSync(verifyCertInput, JSON.stringify({ artifact: replayNatLiteralArtifact, certificate: natLiteralCertificate.certificate })));
console.error('SMOKE_PROGRESS before original line 1438: const pskernelVerifyCertOutput = execFileSync(process.execPath, ["tools/pskernel');
const pskernelVerifyCertOutput = execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'verify-cert', verifyCertInput], { encoding: 'utf8' });
console.error('SMOKE_PROGRESS before original line 1439: const pskernelVerifyCertJson = JSON.parse(pskernelVerifyCertOutput);');
const pskernelVerifyCertJson = JSON.parse(pskernelVerifyCertOutput);
console.error('SMOKE_PROGRESS before original line 1440: assert.equal(pskernelVerifyCertJson.status, "accepted", "pskernel CLI verify-cer');
assert.equal(pskernelVerifyCertJson.status, 'accepted', 'pskernel CLI verify-cert should accept a matching certificate');


console.error('SMOKE_PROGRESS before original line 1443: const obligationCatalogCheck = verifyProofObligationCatalog();');
const obligationCatalogCheck = verifyProofObligationCatalog();
console.error('SMOKE_PROGRESS before original line 1444: assert.equal(obligationCatalogCheck.status, "accepted", obligationCatalogCheck.m');
assert.equal(obligationCatalogCheck.status, 'accepted', obligationCatalogCheck.message);
console.error('SMOKE_PROGRESS before original line 1445: const obligationReport = proofObligationReport();');
const obligationReport = proofObligationReport();
console.error('SMOKE_PROGRESS before original line 1446: assert.ok(obligationReport.total >= 30, "proof-obligation catalog should expose ');
assert.ok(obligationReport.total >= 30, 'proof-obligation catalog should expose machine-readable porting obligations');
console.error('SMOKE_PROGRESS before original line 1447: assert.equal(obligationReport.byProofStatus["proven"], undefined, "trusted-bound');
assert.equal(obligationReport.byProofStatus['proven'], undefined, 'trusted-boundary catalog must not claim proven obligations yet');
console.error('SMOKE_PROGRESS before original line 1448: assert.equal(pskernelProofObligations().total, obligationReport.total, "Main pro');
assert.equal(pskernelProofObligations().total, obligationReport.total, 'Main proof-obligation entry should expose same catalog');
console.error('SMOKE_PROGRESS before original line 1449: const pskernelObligationsJson = JSON.parse(execFileSync(process.execPath, ["tool');
const pskernelObligationsJson = JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'obligations', '--json'], { encoding: 'utf8' }));
console.error('SMOKE_PROGRESS before original line 1450: assert.equal(pskernelObligationsJson.total, obligationReport.total, "pskernel CL');
assert.equal(pskernelObligationsJson.total, obligationReport.total, 'pskernel CLI obligations --json should expose catalog');

console.error('SMOKE_PROGRESS before original line 1452: const auditBundle = pskernelAuditCoreArtifact(replayNatLiteralArtifact);');
const auditBundle = pskernelAuditCoreArtifact(replayNatLiteralArtifact);
console.error('SMOKE_PROGRESS before original line 1453: assert.equal(auditBundle.status, "accepted", auditBundle.message);');
assert.equal(auditBundle.status, 'accepted', auditBundle.message);
console.error('SMOKE_PROGRESS before original line 1454: assert.equal(auditBundle.certificateVerification?.status, "accepted", "audit bun');
assert.equal(auditBundle.certificateVerification?.status, 'accepted', 'audit bundle should verify its own freshly produced certificate');
console.error('SMOKE_PROGRESS before original line 1455: assert.match(auditBundle.auditSha256, /^[0-9a-f]{64}$/, "audit bundle should hav');
assert.match(auditBundle.auditSha256, /^[0-9a-f]{64}$/, 'audit bundle should have deterministic audit hash');
console.error('SMOKE_PROGRESS before original line 1456: const pskernelAuditOutput = execFileSync(process.execPath, ["tools/pskernel.ts"');
const pskernelAuditOutput = execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'audit', certInput], { encoding: 'utf8' });
console.error('SMOKE_PROGRESS before original line 1457: const pskernelAuditJson = JSON.parse(pskernelAuditOutput);');
const pskernelAuditJson = JSON.parse(pskernelAuditOutput);
console.error('SMOKE_PROGRESS before original line 1458: assert.equal(pskernelAuditJson.status, "accepted", "pskernel CLI audit should ac');
assert.equal(pskernelAuditJson.status, 'accepted', 'pskernel CLI audit should accept a replayable artifact');
console.error('SMOKE_PROGRESS before original line 1459: assert.match(pskernelAuditJson.auditSha256, /^[0-9a-f]{64}$/, "pskernel CLI audi');
assert.match(pskernelAuditJson.auditSha256, /^[0-9a-f]{64}$/, 'pskernel CLI audit should emit deterministic audit hash');


console.error('SMOKE_PROGRESS before original line 1462: const pskernelPreflightOutput = execFileSync(process.execPath, ["tools/pskernel.');
const pskernelPreflightOutput = execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'preflight', '--json'], { encoding: 'utf8' });
console.error('SMOKE_PROGRESS before original line 1463: const pskernelPreflightJson = JSON.parse(pskernelPreflightOutput);');
const pskernelPreflightJson = JSON.parse(pskernelPreflightOutput);
console.error('SMOKE_PROGRESS before original line 1464: assert.equal(pskernelPreflightJson.status, "accepted", "pskernel CLI preflight s');
assert.equal(pskernelPreflightJson.status, 'accepted', 'pskernel CLI preflight should accept the release-readiness mirror/audit gate');
console.error('SMOKE_PROGRESS before original line 1465: assert.equal(pskernelPreflightJson.requiredFailureCount, 0, "pskernel CLI prefli');
assert.equal(pskernelPreflightJson.requiredFailureCount, 0, 'pskernel CLI preflight should have zero required failures');
console.error('SMOKE_PROGRESS before original line 1466: assert.equal(pskernelPreflightJson.mirror.entryCount, 112, "pskernel CLI preflig');
assert.equal(pskernelPreflightJson.mirror.entryCount, 112, 'pskernel CLI preflight should confirm all pskernel source files are mirrored');
console.error('SMOKE_PROGRESS before original line 1467: assert.match(pskernelPreflightJson.preflightSha256, /^[0-9a-f]{64}$/, "pskernel ');
assert.match(pskernelPreflightJson.preflightSha256, /^[0-9a-f]{64}$/, 'pskernel CLI preflight should emit deterministic preflight hash');


console.error('SMOKE_PROGRESS before original line 1470: const pskernelPackageAuditOutput = execFileSync(process.execPath, ["tools/pskern');
const pskernelPackageAuditOutput = execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'package-audit', '--json'], { encoding: 'utf8' });
console.error('SMOKE_PROGRESS before original line 1471: const pskernelPackageAuditJson = JSON.parse(pskernelPackageAuditOutput);');
const pskernelPackageAuditJson = JSON.parse(pskernelPackageAuditOutput);
console.error('SMOKE_PROGRESS before original line 1472: assert.equal(pskernelPackageAuditJson.status, "accepted", "pskernel CLI package-');
assert.equal(pskernelPackageAuditJson.status, 'accepted', 'pskernel CLI package-audit should accept publishable package contents');
console.error('SMOKE_PROGRESS before original line 1473: assert.equal(pskernelPackageAuditJson.requiredFailureCount, 0, "package-audit sh');
assert.equal(pskernelPackageAuditJson.requiredFailureCount, 0, 'package-audit should have zero required failures');
console.error('SMOKE_PROGRESS before original line 1474: assert.match(pskernelPackageAuditJson.packageAuditSha256, /^[0-9a-f]{64}$/, "pac');
assert.match(pskernelPackageAuditJson.packageAuditSha256, /^[0-9a-f]{64}$/, 'package-audit should emit deterministic audit hash');
console.error('SMOKE_PROGRESS before original line 1475: assert.ok(');
assert.ok(
  pskernelPackageAuditJson.checks.some(check => check.id === 'pack.doc.TRUST_BOUNDARY.md' && check.status === 'accepted'),
  'package-audit should prove trust-boundary docs are included in npm package contents',
);

console.error('SMOKE_PROGRESS before original line 1480: const pskernelTarballSmokeOutput = execFileSync(process.execPath, ["tools/pskern');
const pskernelTarballSmokeOutput = execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'tarball-smoke', '--json'], { encoding: 'utf8' });
console.error('SMOKE_PROGRESS before original line 1481: const pskernelTarballSmokeJson = JSON.parse(pskernelTarballSmokeOutput);');
const pskernelTarballSmokeJson = JSON.parse(pskernelTarballSmokeOutput);
console.error('SMOKE_PROGRESS before original line 1482: assert.equal(pskernelTarballSmokeJson.status, "accepted", "pskernel CLI tarball-');
assert.equal(pskernelTarballSmokeJson.status, 'accepted', 'pskernel CLI tarball-smoke should install the packed package and run dist API smoke');
console.error('SMOKE_PROGRESS before original line 1483: assert.equal(pskernelTarballSmokeJson.requiredFailureCount, 0, "tarball-smoke sh');
assert.equal(pskernelTarballSmokeJson.requiredFailureCount, 0, 'tarball-smoke should have zero required failures');
console.error('SMOKE_PROGRESS before original line 1484: assert.match(pskernelTarballSmokeJson.tarballSmokeSha256, /^[0-9a-f]{64}$/, "tar');
assert.match(pskernelTarballSmokeJson.tarballSmokeSha256, /^[0-9a-f]{64}$/, 'tarball-smoke should emit deterministic evidence hash');
console.error('SMOKE_PROGRESS before original line 1485: assert.ok(');
assert.ok(
  pskernelTarballSmokeJson.checks.some(check => check.id === 'runtime.api-smoke' && check.status === 'accepted'),
  'tarball-smoke should prove installed runtime APIs work outside the monorepo',
);


console.error('SMOKE_PROGRESS before original line 1491: if (process.env.PS_KERNEL_SMOKE_HEAVY === "1") {');
if (process.env.PS_KERNEL_SMOKE_HEAVY === '1') {
  const pskernelReleaseManifestOutput = execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'release-manifest', '--json'], { encoding: 'utf8' });
  const pskernelReleaseManifestJson = JSON.parse(pskernelReleaseManifestOutput);
  assert.equal(pskernelReleaseManifestJson.status, 'accepted', 'pskernel CLI release-manifest should accept the combined release evidence bundle');
  assert.equal(pskernelReleaseManifestJson.requiredFailureCount, 0, 'release-manifest should have zero required failures');
  assert.match(pskernelReleaseManifestJson.releaseManifestSha256, /^[0-9a-f]{64}$/, 'release-manifest should emit a deterministic release hash');
  assert.ok(
    pskernelReleaseManifestJson.checks.some(check => check.id === 'component.tarball-smoke.deterministic' && check.status === 'accepted'),
    'release-manifest should prove tarball smoke evidence is deterministic across repeated runs',
  );
  assert.match(pskernelReleaseManifestJson.componentHashes.tarballSha256, /^[0-9a-f]{64}$/, 'release-manifest should record packed tarball sha256');
}

console.log('PSKERNEL_TS_KERNEL_SMOKE=PASS');

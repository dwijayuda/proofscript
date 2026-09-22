import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { loadKernel } from './local-kernel-loader.ts';

const {
  Environment,
  KernelUnsupportedError,
  LevelZero,
  getUndefParam,
  checkCoreDeclarations,
  replayCoreArtifact,
  certifyCoreArtifact,
  verifyCoreReplayCertificate,
  createCoreReplayCertificateBundle,
  verifyCoreReplayCertificateBundle,
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
  snapshotEnvironment,
  checkCoreDeclarationsWithSnapshot,
  replayCoreArtifactWithSnapshot,
  pskernelStatus,
  pskernelCheckCore,
  pskernelVerifyCoreCertificate,
  pskernelCreateCoreCertificateBundle,
  pskernelVerifyCoreCertificateBundle,
  pskernelProofObligations,
  pskernelAuditCoreArtifact,
  proofObligationReport,
  verifyProofObligationCatalog,
  TypeChecker,
  whnfWithTransparency,
  defEqWithTransparency,
  stableSha256,
} = loadKernel();

const type0 = { tag: 'sort', level: levelSucc(LevelZero) };
assert.equal(levelDefEq(levelOfNat(1), levelSucc(LevelZero)), true, 'level smoke');
assert.equal(levelDefEq({ tag: 'max', left: levelOfNat(1), right: LevelZero }, levelOfNat(1)), true, 'max zero normalization');
assert.equal(getUndefParam({ tag: 'max', left: levelParam('u'), right: levelParam('v') }, ['u']), 'v', 'undefined level parameter detection');

const axiom = { kind: 'axiom', name: 'A', levelParams: [], type: type0 };
const idType = { tag: 'pi', domain: { tag: 'const', name: 'A', levels: [] }, body: { tag: 'const', name: 'A', levels: [] } };
const idVal = { tag: 'lam', domain: { tag: 'const', name: 'A', levels: [] }, body: { tag: 'bvar', index: 0 } };
const definition = { kind: 'definition', name: 'idA', levelParams: [], type: idType, value: idVal, reducibility: 'regular' };

const summary = checkCoreDeclarations([axiom, definition], 'pskernel-ts-phase2-smoke');
assert.equal(summary.status, 'accepted', summary.message);
assert.equal(summary.declarations.length, 2);
assert.deepEqual(summary.declarations[1].assumptions, ['A'], 'definition assumptions should include referenced axiom dependencies');

const summaryDup = checkCoreDeclarations([axiom, axiom], 'pskernel-ts-phase2-smoke');
assert.equal(summaryDup.status, 'rejected', 'duplicate declaration must reject');

const nonTypeDeclaration = checkCoreDeclarations([
  axiom,
  { kind: 'axiom', name: 'a', levelParams: [], type: { tag: 'const', name: 'A', levels: [] } },
  { kind: 'axiom', name: 'badType', levelParams: [], type: { tag: 'const', name: 'a', levels: [] } },
], 'pskernel-ts-phase2-smoke');
assert.equal(nonTypeDeclaration.status, 'rejected', 'declaration type must itself infer to a Sort');

const mvarLevelDeclaration = checkCoreDeclarations([
  { kind: 'axiom', name: 'BadLevel', levelParams: [], type: { tag: 'sort', level: { tag: 'mvar', name: '?u' } } },
], 'pskernel-ts-phase2-smoke');
assert.equal(mvarLevelDeclaration.status, 'rejected', 'universe metavariables must fail closed');



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
assert.equal(badInductiveType.status, 'rejected', 'inductive type must itself infer to a Sort');

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
assert.equal(duplicateGenerated.status, 'rejected', 'duplicate generated constructor names must reject');

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
assert.equal(badConstructorTarget.status, 'rejected', 'constructor type codomain must target its inductive family');

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
assert.equal(badConstructorDependency.status, 'rejected', 'constructor domain dependencies must be known or part of the inductive block');

const env = new Environment();
assert.ok(env, 'Environment constructor smoke');
checkAndAddDeclaration(env, { kind: 'axiom', name: 'U', levelParams: ['u'], type: { tag: 'sort', level: levelSucc(levelParam('u')) } });
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

const unitEnv = new Environment();
checkAndAddDeclaration(unitEnv, {
  kind: 'inductive',
  name: 'UnitLike',
  levelParams: [],
  type: type0,
  numParams: 0,
  numIndices: 0,
  constructors: [{ name: 'UnitLike.unit', type: { tag: 'const', name: 'UnitLike', levels: [] } }],
});
assert.ok(
  unitEnv.findConstant('UnitLike.rec'),
  'generated recursor must be registered as a constant entry',
);
const unitRecursorEntry = unitEnv.find('UnitLike.rec');
assert.deepEqual(
  unitRecursorEntry?.declaration.metadata?.rules,
  [{ ctor: 'UnitLike.unit', nfields: 0, recursiveFields: [], recursiveFieldTypes: [] }],
  'generated recursor metadata should record constructor field arity and recursive field type slots',
);
const unitRecursorType = infer(unitEnv, [], { tag: 'const', name: 'UnitLike.rec', levels: [levelSucc(LevelZero)] });
assert.equal(unitRecursorType.tag, 'pi', 'simple non-indexed recursor must synthesize a usable type');
assert.match(pretty(unitRecursorType), /UnitLike\.unit/, 'UnitLike recursor type should mention the zero-field constructor minor premise');
assert.equal(ensureSort(unitEnv, [], infer(unitEnv, [], unitRecursorType)).tag, 'sort', 'synthesized UnitLike recursor type must itself be a valid type');

const unitRecMotive = { tag: 'lam', domain: { tag: 'const', name: 'UnitLike', levels: [] }, body: { tag: 'const', name: 'UnitLike', levels: [] } };
const unitRecMinor = { tag: 'const', name: 'UnitLike.unit', levels: [] };
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
assert.deepEqual(
  whnf(unitEnv, [], unitRecIota),
  unitRecMinor,
  'simple zero-field recursor iota reduction should reduce to the matching minor premise',
);
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

const betaEnv = new Environment();
assert.ok(betaEnv, 'second Environment constructor smoke');
const betaTerm = { tag: 'app', fn: idVal, arg: { tag: 'const', name: 'A', levels: [] } };
assert.equal(pretty(betaTerm).includes('fun'), true, 'pre-beta term is visible');
const replaced = replaceNoCacheTerm(betaTerm, term => term.tag === 'const' && term.name === 'A' ? { tag: 'const', name: 'B', levels: [] } : undefined);
assert.equal(pretty(replaced).includes('B'), true, 'replaceNoCacheTerm rewrites nested constants');


const recursorEnv = new Environment();
checkAndAddDeclaration(recursorEnv, {
  kind: 'inductive',
  name: 'ClosedRecursorFamily',
  levelParams: [],
  type: type0,
  numParams: 0,
  numIndices: 0,
  constructors: [{ name: 'ClosedRecursorFamily.mk', type: { tag: 'const', name: 'ClosedRecursorFamily', levels: [] } }],
});
assert.ok(recursorEnv.findConstant('ClosedRecursorFamily.rec'), 'generated recursor should remain registered for replay/inventory');
const closedRecursorType = infer(recursorEnv, [], { tag: 'const', name: 'ClosedRecursorFamily.rec', levels: [LevelZero] });
assert.equal(closedRecursorType.tag, 'pi', 'closed zero-field recursor should synthesize a usable type');

const badArtifactSummary = replayCoreArtifact({
  format: 'not-proofscript-core',
  formatVersion: 1,
  proofscriptReference: 'v0.2.1',
  leanSemanticBaseline: '4.33.1',
  implementationProfile: 'bad-artifact-smoke',
  declarations: [],
  typeclasses: { classes: [], instances: [] },
});
assert.equal(badArtifactSummary.status, 'rejected', 'replay must reject artifacts with an invalid format marker');

const badBaselineSummary = replayCoreArtifact({
  format: 'proofscript-core',
  formatVersion: 1,
  proofscriptReference: 'v0.2.1',
  leanSemanticBaseline: '4.34.0',
  implementationProfile: 'bad-baseline-smoke',
  declarations: [],
  typeclasses: { classes: [], instances: [] },
});
assert.equal(badBaselineSummary.status, 'rejected', 'replay must reject non-pinned Lean semantic baselines');


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
assert.equal(malformedTermSummary.status, 'rejected', 'replay must reject malformed term shapes instead of crashing');

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
assert.equal(malformedDeclarationSummary.status, 'rejected', 'replay must reject malformed declaration shapes before checking');

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
assert.equal(badConstructorDomainNotType.status, 'rejected', 'constructor telescope domains must themselves infer to Sort/Type');

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
assert.equal(badConstructorUniverseArity.status, 'rejected', 'constructor codomain must use the inductive family with correct universe arity');

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
assert.equal(negativeInductiveCounters.status, 'rejected', 'direct inductive admission must reject negative numParams/numIndices');

const directMalformedTermSummary = checkCoreDeclarations([
  { kind: 'axiom', name: 'DirectMalformedSort', levelParams: [], type: { tag: 'sort' } },
], 'direct-malformed-term-smoke');
assert.equal(directMalformedTermSummary.status, 'rejected', 'direct checkCoreDeclarations must reject malformed term shapes instead of implementation_error');

const directMalformedBinderInfoSummary = checkCoreDeclarations([
  {
    kind: 'axiom',
    name: 'DirectMalformedBinderInfo',
    levelParams: [],
    type: { tag: 'pi', domain: type0, body: type0, binderInfo: 'javascriptOptional' },
  },
], 'direct-malformed-binder-info-smoke');
assert.equal(directMalformedBinderInfoSummary.status, 'rejected', 'direct checkCoreDeclarations must reject invalid binderInfo values');

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
assert.equal(badFamilyCounterMismatch.status, 'rejected', 'inductive numParams/numIndices must match the family type telescope arity');

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
assert.equal(paramFamilySummary.status, 'accepted', paramFamilySummary.message);

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
assert.equal(positiveRecursiveField.status, 'accepted', positiveRecursiveField.message);
assert.deepEqual(
  positiveRecursiveField.declarations.find(d => d.name === 'PositiveRecursiveField')?.generated.sort(),
  ['PositiveRecursiveField.mk', 'PositiveRecursiveField.rec'].sort(),
  'inductive summary should report constructor and recursor generated names',
);

const positiveRecursiveEnv = new Environment();
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
assert.deepEqual(
  positiveRecursiveEnv.find('PositiveRecursiveMeta.rec')?.declaration.metadata?.rules,
  [{ ctor: 'PositiveRecursiveMeta.mk', nfields: 1, recursiveFields: [true], recursiveFieldTypes: [{ tag: 'const', name: 'PositiveRecursiveMeta', levels: [] }] }],
  'generated recursor metadata should record constructor field count, direct recursive fields, and recursive field types',
);
assert.deepEqual(
  positiveRecursiveEnv.findConstant('PositiveRecursiveMeta.rec')?.metadata?.rules,
  [{ ctor: 'PositiveRecursiveMeta.mk', nfields: 1, recursiveFields: [true], recursiveFieldTypes: [{ tag: 'const', name: 'PositiveRecursiveMeta', levels: [] }] }],
  'recInfo constant metadata should match checked recursor metadata including recursive field types',
);
const positiveRecursiveRecType = infer(positiveRecursiveEnv, [], { tag: 'const', name: 'PositiveRecursiveMeta.rec', levels: [LevelZero] });
assert.equal(positiveRecursiveRecType.tag, 'pi', 'direct positive recursive-field recursor should synthesize a usable type');
assert.match(pretty(positiveRecursiveRecType), /PositiveRecursiveMeta\.mk/, 'recursive-field recursor minor premise should mention the constructor application');

const paramRecursorEnv = new Environment();
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
const paramRecursorNowTyped = infer(paramRecursorEnv, [], { tag: 'const', name: 'ParamRecursorStillUnsupported.rec', levels: [LevelZero] });
assert.equal(paramRecursorNowTyped.tag, 'pi', 'parameterized non-indexed recursor type synthesis should now be supported for the simple uniform slice');
assert.equal(paramRecursorEnv.findConstant('ParamRecursorStillUnsupported.rec')?.metadata?.numParams, 1, 'parameterized recursor metadata should record one uniform parameter');

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
assert.equal(badNegativeRecursiveField.status, 'rejected', 'negative recursive occurrences in constructor field types must fail closed');

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
assert.equal(badFamilyCodomainNotSort.status, 'rejected', 'inductive family telescope codomain must be a Sort/Type expression');

const arbitraryQuotSummary = checkCoreDeclarations([
  { kind: 'quot', name: 'FakeQuot', levelParams: [] },
], 'arbitrary-quot-smoke');
assert.equal(arbitraryQuotSummary.status, 'rejected', 'quotient kernel marker must be the canonical Quot initializer only');

const quotWithoutEqSummary = checkCoreDeclarations([
  { kind: 'quot', name: 'Quot', levelParams: [] },
], 'quot-without-eq-smoke');
assert.equal(quotWithoutEqSummary.status, 'rejected', 'quotient initialization must fail closed unless canonical Eq is already present');


const primitivePreludeSummary = checkCoreDeclarations([
  generateUnitDeclaration(),
  generateBoolDeclaration(),
  generateNatDeclaration(),
  generateEqDeclaration(),
  { kind: 'quot', name: 'Quot', levelParams: [] },
], 'primitive-prelude-quot-smoke');
assert.equal(primitivePreludeSummary.status, 'accepted', primitivePreludeSummary.message);
assert.ok(
  primitivePreludeSummary.declarations.some(d => d.name === 'Quot' && d.generated.includes('Quot.mk') && d.generated.includes('Quot.lift') && d.generated.includes('Quot.ind')),
  'canonical quotient marker should install quotient primitive constants after Eq is admitted',
);

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
assert.equal(natConstructorSummary.status, 'accepted', natConstructorSummary.message);

const natRecursorEnv = new Environment();
checkAndAddDeclaration(natRecursorEnv, generateNatDeclaration());
const natRecursorType = infer(natRecursorEnv, [], { tag: 'const', name: 'Nat.rec', levels: [levelSucc(LevelZero)] });
assert.equal(natRecursorType.tag, 'pi', 'Nat.rec should synthesize a simple non-indexed recursive-field recursor type');
assert.match(pretty(natRecursorType), /Nat\.succ/, 'Nat.rec minor premise should mention Nat.succ');
assert.equal(ensureSort(natRecursorEnv, [], infer(natRecursorEnv, [], natRecursorType)).tag, 'sort', 'synthesized Nat.rec type must itself be a valid type');

const natMotive = { tag: 'lam', domain: { tag: 'const', name: 'Nat', levels: [] }, body: { tag: 'const', name: 'Nat', levels: [] } };
const natZeroMinor = { tag: 'const', name: 'Nat.zero', levels: [] };
const natSuccMinor = {
  tag: 'lam',
  domain: { tag: 'const', name: 'Nat', levels: [] },
  body: {
    tag: 'lam',
    domain: { tag: 'const', name: 'Nat', levels: [] },
    body: { tag: 'app', fn: { tag: 'const', name: 'Nat.succ', levels: [] }, arg: { tag: 'bvar', index: 0 } },
  },
};
const natRecHead = { tag: 'const', name: 'Nat.rec', levels: [levelSucc(LevelZero)] };
const natRecPrefix = { tag: 'app', fn: { tag: 'app', fn: { tag: 'app', fn: natRecHead, arg: natMotive }, arg: natZeroMinor }, arg: natSuccMinor };
const natRecZero = {
  tag: 'app',
  fn: natRecPrefix,
  arg: { tag: 'const', name: 'Nat.zero', levels: [] },
};
assert.deepEqual(
  whnf(natRecursorEnv, [], natRecZero),
  natZeroMinor,
  'Nat.rec on Nat.zero should iota-reduce to the zero minor premise',
);
const natRecSuccApp = { tag: 'app', fn: natRecPrefix, arg: { tag: 'app', fn: natSuccMinor, arg: { tag: 'const', name: 'Nat.zero', levels: [] } } };
const natSuccReduced = whnf(natRecursorEnv, [], natRecSuccApp);
assert.match(pretty(natSuccReduced), /Nat\.succ/, 'Nat.rec on Nat.succ should reduce through the succ minor premise');
assert.match(pretty(natSuccReduced), /Nat\.rec/, 'Nat.rec succ iota result should expose the recursive-call induction hypothesis');





const transparencyEnv = new Environment();
checkAndAddDeclaration(transparencyEnv, { kind: 'axiom', name: 'TA', levelParams: [], type: type0 });
checkAndAddDeclaration(transparencyEnv, { kind: 'axiom', name: 'ta', levelParams: [], type: { tag: 'const', name: 'TA', levels: [] } });
checkAndAddDeclaration(transparencyEnv, {
  kind: 'definition',
  name: 'regularTA',
  levelParams: [],
  type: { tag: 'const', name: 'TA', levels: [] },
  value: { tag: 'const', name: 'ta', levels: [] },
  reducibility: 'regular',
});
checkAndAddDeclaration(transparencyEnv, {
  kind: 'definition',
  name: 'abbrevTA',
  levelParams: [],
  type: { tag: 'const', name: 'TA', levels: [] },
  value: { tag: 'const', name: 'ta', levels: [] },
  reducibility: 'abbrev',
});
checkAndAddDeclaration(transparencyEnv, {
  kind: 'opaque',
  name: 'opaqueTA',
  levelParams: [],
  type: { tag: 'const', name: 'TA', levels: [] },
  value: { tag: 'const', name: 'ta', levels: [] },
});
assert.deepEqual(
  whnfWithTransparency(transparencyEnv, [], { tag: 'const', name: 'regularTA', levels: [] }, 'default'),
  { tag: 'const', name: 'ta', levels: [] },
  'default transparency should unfold regular definitions',
);
assert.deepEqual(
  whnfWithTransparency(transparencyEnv, [], { tag: 'const', name: 'regularTA', levels: [] }, 'reducible'),
  { tag: 'const', name: 'regularTA', levels: [] },
  'reducible transparency must not unfold regular definitions in this conservative slice',
);
assert.deepEqual(
  whnfWithTransparency(transparencyEnv, [], { tag: 'const', name: 'abbrevTA', levels: [] }, 'reducible'),
  { tag: 'const', name: 'ta', levels: [] },
  'reducible transparency should unfold abbrev definitions',
);
assert.deepEqual(
  whnfWithTransparency(transparencyEnv, [], { tag: 'const', name: 'opaqueTA', levels: [] }, 'all'),
  { tag: 'const', name: 'opaqueTA', levels: [] },
  'opaque declarations must remain closed even at all transparency in this trusted slice',
);
assert.equal(
  defEqWithTransparency(transparencyEnv, [], { tag: 'const', name: 'regularTA', levels: [] }, { tag: 'const', name: 'ta', levels: [] }, 'reducible'),
  false,
  'reducible defeq should respect the regular-definition transparency boundary',
);
assert.deepEqual(
  whnfWithTransparency(transparencyEnv, [], { tag: 'const', name: 'regularTA', levels: [LevelZero] }, 'all'),
  { tag: 'const', name: 'regularTA', levels: [LevelZero] },
  'delta reduction must remain neutral when constant universe arity is malformed',
);
assert.equal(
  defEqWithTransparency(transparencyEnv, [], { tag: 'const', name: 'regularTA', levels: [LevelZero] }, { tag: 'const', name: 'ta', levels: [] }, 'all'),
  false,
  'malformed constant universe arity must not become definitionally equal by unfolding',
);
assert.equal(
  new TypeChecker(transparencyEnv, { transparency: 'reducible' }).isDefEq(
    { tag: 'const', name: 'abbrevTA', levels: [] },
    { tag: 'const', name: 'ta', levels: [] },
  ),
  true,
  'TypeChecker instance transparency option should route through whnf/defeq',
);

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
assert.equal(theoremPropGuardSummary.status, 'rejected', 'theorem declarations must prove Prop, not arbitrary Type terms');

const theoremDeltaEnv = new Environment();
checkAndAddDeclaration(theoremDeltaEnv, { kind: 'axiom', name: 'P', levelParams: [], type: { tag: 'sort', level: LevelZero } });
checkAndAddDeclaration(theoremDeltaEnv, { kind: 'axiom', name: 'pAx', levelParams: [], type: { tag: 'const', name: 'P', levels: [] } });
checkAndAddDeclaration(theoremDeltaEnv, {
  kind: 'theorem',
  name: 'pThm',
  levelParams: [],
  type: { tag: 'const', name: 'P', levels: [] },
  value: { tag: 'const', name: 'pAx', levels: [] },
});
assert.deepEqual(
  whnf(theoremDeltaEnv, [], { tag: 'const', name: 'pThm', levels: [] }),
  { tag: 'const', name: 'pAx', levels: [] },
  'theorem constants should delta-unfold like pskernel ConstantInfo.deltaValue?',
);

const installedPreludeEnv = new Environment();
const installedPrelude = installCorePrimitives(installedPreludeEnv, { quotients: true });
assert.equal(installedPrelude.indexOf('Unit') < installedPrelude.indexOf('Bool') && installedPrelude.indexOf('Bool') < installedPrelude.indexOf('Nat') && installedPrelude.indexOf('Nat') < installedPrelude.indexOf('Eq') && installedPrelude.indexOf('Eq') < installedPrelude.indexOf('HEq'), true, 'primitive installer should add the canonical primitive families in deterministic order');
assert.ok(installedPreludeEnv.findConstant('HEq.refl'), 'primitive installer should register HEq.refl');
assert.ok(installedPreludeEnv.findConstant('HEq.rec'), 'primitive installer should register HEq.rec');
assert.ok(installedPreludeEnv.findConstant('Nat.succ'), 'primitive installer should register Nat.succ');
assert.ok(installedPreludeEnv.findConstant('Quot.lift'), 'primitive installer should install quotient primitives when requested');

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
assert.equal(natReplayWithoutPrelude.status, 'rejected', 'replay without declared prelude must not implicitly trust Nat');

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
assert.equal(natReplayWithPrelude.status, 'accepted', natReplayWithPrelude.message);
assert.deepEqual(natReplayWithPrelude.prelude?.profile, 'core', 'replay summary records deterministic prelude profile');
assert.ok(natReplayWithPrelude.prelude?.installed.includes('Nat.succ'), 'replay summary records installed primitive declarations');

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
assert.equal(quotReplayWithPrelude.status, 'accepted', quotReplayWithPrelude.message);
assert.ok(quotReplayWithPrelude.prelude?.installed.includes('Quot.ind'), 'core+quot replay prelude installs quotient primitives deterministically');

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
assert.equal(invalidPreludeReplay.status, 'rejected', 'replay must reject unknown prelude profiles');

const malformedTypeclassReplay = replayCoreArtifact({
  format: 'proofscript-core',
  formatVersion: 1,
  proofscriptReference: 'v0.2.1',
  leanSemanticBaseline: '4.33.1',
  implementationProfile: 'malformed-typeclass-smoke',
  declarations: [],
  typeclasses: { classes: [{ name: '', numParams: -1, params: [], fields: [], declarationOrder: 0 }], instances: [] },
});
assert.equal(malformedTypeclassReplay.status, 'rejected', 'replay must reject malformed typeclass metadata shapes');

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
assert.equal(malformedModulesReplay.status, 'rejected', 'replay must reject malformed module metadata shapes');


const proofIrrelEnv = new Environment();
checkAndAddDeclaration(proofIrrelEnv, { kind: 'axiom', name: 'ProofIrrelP', levelParams: [], type: { tag: 'sort', level: LevelZero } });
checkAndAddDeclaration(proofIrrelEnv, { kind: 'axiom', name: 'proofIrrelP1', levelParams: [], type: { tag: 'const', name: 'ProofIrrelP', levels: [] } });
checkAndAddDeclaration(proofIrrelEnv, { kind: 'axiom', name: 'proofIrrelP2', levelParams: [], type: { tag: 'const', name: 'ProofIrrelP', levels: [] } });
assert.equal(
  defEq(proofIrrelEnv, [], { tag: 'const', name: 'proofIrrelP1', levels: [] }, { tag: 'const', name: 'proofIrrelP2', levels: [] }),
  true,
  'proof irrelevance should make proofs of the same proposition definitionally equal in the trusted kernel slice',
);

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
assert.equal(badConstructorFamilyUniverseArgs.status, 'rejected', 'constructor codomain must use the inductive family at its declared universe parameters');

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
assert.equal(badConstructorSwappedParams.status, 'rejected', 'constructor codomain parameters must be applied uniformly in family telescope order');


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
assert.equal(cumulativeSortDefinition.status, 'accepted', cumulativeSortDefinition.message);

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
assert.equal(badLetAnnotationSummary.status, 'rejected', 'let annotation types must themselves infer to Sort/Type');

const highFormatVersionReplay = replayCoreArtifact({
  format: 'proofscript-core',
  formatVersion: 999,
  proofscriptReference: 'v0.2.1',
  leanSemanticBaseline: '4.33.1',
  implementationProfile: 'high-format-version-smoke',
  declarations: [],
  typeclasses: { classes: [], instances: [] },
});
assert.equal(highFormatVersionReplay.status, 'rejected', 'replay must reject unknown future core artifact format versions');

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
assert.equal(malformedTypeclassParamCountReplay.status, 'rejected', 'typeclass metadata numParams must match params length');

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
assert.equal(malformedTypeclassMissingClassReplay.status, 'rejected', 'typeclass instance metadata must reference a declared typeclass metadata entry');

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
assert.equal(malformedModuleEntryReplay.status, 'rejected', 'module metadata entry must reference one of the serialized modules');

assert.match(pskernelStatus(), /trusted-boundary/, 'pskernel status should expose conservative trust label');
assert.equal(
  pskernelCheckCore([generateNatDeclaration()], 'main-entry-smoke').status,
  'accepted',
  'pskernelCheckCore main entry should route through the active pskernel kernel',
);

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
assert.equal(helperPreludeSummary.status, 'accepted', helperPreludeSummary.message);


const quotientReductionEnv = new Environment();
installCorePrimitives(quotientReductionEnv, { quotients: true });
const qConst = (name, levels = []) => ({ tag: 'const', name, levels });
const qApp = (fn, arg) => ({ tag: 'app', fn, arg });
const qApps = (fn, args) => args.reduce((acc, arg) => qApp(acc, arg), fn);
const qPi = (domain, body, binderInfo = 'explicit') => ({ tag: 'pi', domain, body, binderInfo });
const natTerm = qConst('Nat');
const natUniverse = levelSucc(LevelZero);
checkAndAddDeclaration(quotientReductionEnv, {
  kind: 'axiom',
  name: 'NatRel',
  levelParams: [],
  type: qPi(natTerm, qPi(natTerm, { tag: 'sort', level: LevelZero })),
});
const relAB = qApps(qConst('NatRel'), [{ tag: 'bvar', index: 1 }, { tag: 'bvar', index: 0 }]);
const succA = qApp(qConst('Nat.succ'), { tag: 'bvar', index: 2 });
const succB = qApp(qConst('Nat.succ'), { tag: 'bvar', index: 1 });
const succSoundType = qPi(
  natTerm,
  qPi(
    natTerm,
    qPi(relAB, qApps(qConst('Eq', [natUniverse]), [natTerm, succA, succB])),
  ),
);
checkAndAddDeclaration(quotientReductionEnv, {
  kind: 'axiom',
  name: 'NatSuccSound',
  levelParams: [],
  type: succSoundType,
});
const quotNatRelZero = qApps(qConst('Quot.mk', [natUniverse]), [natTerm, qConst('NatRel'), qConst('Nat.zero')]);
const quotLiftSucc = qApps(qConst('Quot.lift', [natUniverse, natUniverse]), [
  natTerm,
  qConst('NatRel'),
  natTerm,
  qConst('Nat.succ'),
  qConst('NatSuccSound'),
  quotNatRelZero,
]);
assert.deepEqual(
  whnf(quotientReductionEnv, [], quotLiftSucc),
  qApp(qConst('Nat.succ'), qConst('Nat.zero')),
  'Quot.lift over a Quot.mk major premise should reduce to f applied to the representative in the supported quotient slice',
);


checkAndAddDeclaration(quotientReductionEnv, { kind: 'axiom', name: 'QuotIndP', levelParams: [], type: { tag: 'sort', level: LevelZero } });
checkAndAddDeclaration(quotientReductionEnv, {
  kind: 'axiom',
  name: 'QuotIndMkProof',
  levelParams: [],
  type: qPi(natTerm, qConst('QuotIndP')),
});
const quotNatRel = qApps(qConst('Quot', [natUniverse]), [natTerm, qConst('NatRel')]);
const quotIndMotive = { tag: 'lam', domain: quotNatRel, body: qConst('QuotIndP') };
const quotIndOverMk = qApps(qConst('Quot.ind', [natUniverse]), [
  natTerm,
  qConst('NatRel'),
  quotIndMotive,
  qConst('QuotIndMkProof'),
  quotNatRelZero,
]);
assert.deepEqual(
  whnf(quotientReductionEnv, [], quotIndOverMk),
  qApp(qConst('QuotIndMkProof'), qConst('Nat.zero')),
  'Quot.ind over a Quot.mk major premise should reduce to the mk proof applied to the representative in the supported quotient slice',
);

const natLiteralTwo = { tag: 'lit', literal: { tag: 'nat', value: 2 } };
assert.deepEqual(
  infer(quotientReductionEnv, [], natLiteralTwo),
  qConst('Nat'),
  'trusted Core Nat literal should infer Nat only after Nat is in the trusted environment',
);
assert.deepEqual(
  whnf(quotientReductionEnv, [], natLiteralTwo),
  qApp(qConst('Nat.succ'), qApp(qConst('Nat.succ'), qConst('Nat.zero'))),
  'trusted Core Nat literal should normalize to Nat constructors',
);
assert.equal(
  defEq(quotientReductionEnv, [], natLiteralTwo, qApp(qConst('Nat.succ'), qApp(qConst('Nat.succ'), qConst('Nat.zero')))),
  true,
  'trusted Core Nat literal should participate in definitional equality against constructor-expanded Nat values',
);
const badStringLiteral = checkCoreDeclarationsWithPrelude([
  { kind: 'definition', name: 'badStringLiteral', levelParams: [], type: qConst('Nat'), value: { tag: 'lit', literal: { tag: 'str', value: 'x' } }, reducibility: 'regular' },
], 'string-literal-typecheck-smoke', 'core');
assert.equal(badStringLiteral.status, 'rejected', 'trusted Core String literals must be checked as String and reject Nat expectations');

const pskernelStatusOutput = execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'status'], { encoding: 'utf8' });
assert.match(pskernelStatusOutput, /trusted-boundary/, 'pskernel CLI status should expose conservative trust label');

const pskernelBootstrapOutput = execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'bootstrap-local-workspaces', '--json'], { encoding: 'utf8' });
const pskernelBootstrapJson = JSON.parse(pskernelBootstrapOutput);
assert.equal(pskernelBootstrapJson.status, 'accepted', 'pskernel CLI bootstrap-local-workspaces should create local workspace links');
assert.ok(pskernelBootstrapJson.links.some(link => link.name === '@proofscript/kernel'), 'bootstrap-local-workspaces should link @proofscript/kernel');
assert.match(pskernelBootstrapJson.workspaceLinksSha256, /^[0-9a-f]{64}$/, 'bootstrap-local-workspaces should emit deterministic evidence hash');
const pskernelStatusJson = JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'status', '--json'], { encoding: 'utf8' }));
assert.equal(pskernelStatusJson.status, 'trusted-boundary', 'pskernel CLI JSON status should expose trust status');
assert.ok(pskernelStatusJson.supportedSlices.some((slice) => slice.includes('projection')), 'pskernel CLI JSON status should include new projection support slice');

const cliCheckCoreInput = 'artifacts/pskernel-cli-check-core-smoke.json';
await import('node:fs').then((fs) => {
  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync(cliCheckCoreInput, JSON.stringify([generateNatDeclaration()]));
});
const pskernelCheckCoreOutput = execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'check-core', cliCheckCoreInput, 'cli-smoke'], { encoding: 'utf8' });
assert.equal(JSON.parse(pskernelCheckCoreOutput).status, 'accepted', 'pskernel CLI check-core should check declaration arrays');


const paramRecursorTypedEnv = new Environment({ allowProjections: true, allowStructureEta: true });
installCorePrimitives(paramRecursorTypedEnv);
const boxUniverse = levelSucc(LevelZero);
const boxTypeLevel = levelSucc(levelParam('u'));
checkAndAddDeclaration(paramRecursorTypedEnv, {
  kind: 'inductive',
  name: 'Box',
  levelParams: ['u'],
  type: {
    tag: 'pi',
    domain: { tag: 'sort', level: boxTypeLevel },
    body: { tag: 'sort', level: boxTypeLevel },
  },
  numParams: 1,
  numIndices: 0,
  constructors: [
    {
      name: 'Box.mk',
      type: {
        tag: 'pi',
        domain: { tag: 'sort', level: boxTypeLevel },
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
const boxRecType = infer(paramRecursorTypedEnv, [], { tag: 'const', name: 'Box.rec', levels: [boxUniverse, boxUniverse] });
assert.equal(boxRecType.tag, 'pi', 'parameterized non-indexed Box.rec should synthesize a usable type');
assert.equal(ensureSort(paramRecursorTypedEnv, [], infer(paramRecursorTypedEnv, [], boxRecType)).tag, 'sort', 'synthesized parameterized Box.rec type must itself be a valid type');
assert.equal(
  paramRecursorTypedEnv.findConstant('Box.rec')?.metadata?.status,
  'typed-simple-nonindexed',
  'parameterized non-indexed recursor metadata should be marked typed for the supported slice',
);
assert.equal(
  paramRecursorTypedEnv.findConstant('Box.rec')?.metadata?.numParams,
  1,
  'parameterized recursor metadata should record the number of uniform family parameters',
);
assert.deepEqual(
  paramRecursorTypedEnv.findConstant('Box.rec')?.metadata?.rules,
  [{ ctor: 'Box.mk', nfields: 1, recursiveFields: [false], recursiveFieldTypes: [{ tag: 'bvar', index: 0 }] }],
  'parameterized recursor metadata should count constructor fields after uniform parameters and record field domain types',
);
const boxNat = qApps(qConst('Box', [boxUniverse]), [qConst('Nat')]);
const boxMkNatZero = qApps(qConst('Box.mk', [boxUniverse]), [qConst('Nat'), qConst('Nat.zero')]);
const boxMotive = { tag: 'lam', domain: boxNat, body: qConst('Nat') };
const boxMinor = { tag: 'lam', domain: qConst('Nat'), body: { tag: 'bvar', index: 0 } };
const boxRecOnMk = qApps(qConst('Box.rec', [boxUniverse, boxUniverse]), [qConst('Nat'), boxMotive, boxMinor, boxMkNatZero]);
assert.deepEqual(
  whnf(paramRecursorTypedEnv, [], boxRecOnMk),
  qConst('Nat.zero'),
  'parameterized simple recursor should iota-reduce when the major premise is the matching constructor',
);


const boxProjection = { tag: 'proj', typeName: 'Box', index: 0, expr: boxMkNatZero };
assert.deepEqual(
  infer(paramRecursorTypedEnv, [], boxProjection),
  qConst('Nat'),
  'simple single-constructor projection should infer the instantiated field type',
);
assert.deepEqual(
  whnf(paramRecursorTypedEnv, [], boxProjection),
  qConst('Nat.zero'),
  'simple single-constructor projection should reduce on a constructor major premise',
);
assert.equal(
  defEq(paramRecursorTypedEnv, [], boxProjection, qConst('Nat.zero')),
  true,
  'projection reduction should participate in definitional equality',
);

const boxEtaVar = { tag: 'bvar', index: 0 };
const boxEtaExpansion = qApps(qConst('Box.mk', [boxUniverse]), [
  qConst('Nat'),
  { tag: 'proj', typeName: 'Box', index: 0, expr: boxEtaVar },
]);
assert.equal(
  defEq(paramRecursorTypedEnv, [boxNat], boxEtaVar, boxEtaExpansion),
  true,
  'simple single-constructor structure eta should make x defeq to Box.mk Nat (proj Box 0 x)',
);
assert.equal(
  defEq(paramRecursorTypedEnv, [boxNat], boxEtaExpansion, boxEtaVar),
  true,
  'simple single-constructor structure eta should work symmetrically',
);

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
], 'KERNEL-structure-eta0', 'core');
assert.equal(badProjectionSummary.status, 'rejected', 'out-of-range projection must reject before declaration admission');

const listRecursorEnv = new Environment({ allowHigherOrderPositiveRecursion: true, allowIndexedRecursiveRecursors: true });
installCorePrimitives(listRecursorEnv);
const listLikeTypeLevel = levelSucc(levelParam('u'));
checkAndAddDeclaration(listRecursorEnv, {
  kind: 'inductive',
  name: 'ListLike',
  levelParams: ['u'],
  type: qPi({ tag: 'sort', level: listLikeTypeLevel }, { tag: 'sort', level: listLikeTypeLevel }),
  numParams: 1,
  numIndices: 0,
  constructors: [
    {
      name: 'ListLike.nil',
      type: qPi(
        { tag: 'sort', level: listLikeTypeLevel },
        qApps(qConst('ListLike', [levelParam('u')]), [{ tag: 'bvar', index: 0 }]),
      ),
    },
    {
      name: 'ListLike.cons',
      type: qPi(
        { tag: 'sort', level: listLikeTypeLevel },
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
assert.deepEqual(
  listRecursorEnv.findConstant('ListLike.rec')?.metadata?.rules,
  [
    { ctor: 'ListLike.nil', nfields: 0, recursiveFields: [], recursiveFieldTypes: [] },
    { ctor: 'ListLike.cons', nfields: 2, recursiveFields: [false, true], recursiveFieldTypes: [{ tag: 'bvar', index: 0 }, qApps(qConst('ListLike', [levelParam('u')]), [{ tag: 'bvar', index: 1 }])] },
  ],
  'List-like recursor metadata should mark the tail field as directly recursive',
);
const listNat = qApps(qConst('ListLike', [levelSucc(LevelZero)]), [qConst('Nat')]);
const listNilNat = qApps(qConst('ListLike.nil', [levelSucc(LevelZero)]), [qConst('Nat')]);
const listConsNat = qApps(qConst('ListLike.cons', [levelSucc(LevelZero)]), [qConst('Nat'), qConst('Nat.zero'), listNilNat]);
const listMotive = { tag: 'lam', domain: listNat, body: qConst('Nat') };
const listNilMinor = qConst('Nat.zero');
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
const listRecOnCons = qApps(qConst('ListLike.rec', [levelSucc(LevelZero), levelSucc(LevelZero)]), [
  qConst('Nat'),
  listMotive,
  listNilMinor,
  listConsMinor,
  listConsNat,
]);
assert.equal(
  defEq(listRecursorEnv, [], listRecOnCons, qApp(qConst('Nat.succ'), qConst('Nat.zero'))),
  true,
  'parameterized recursive List-like recursor should iota-reduce recursively under definitional equality',
);

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
assert.equal(indexedFamilyRecursorSummary.status, 'rejected', 'bare indexed family recursor misuse must fail closed under type checking until full indexed recursor coverage is implemented');
assert.match(indexedFamilyRecursorSummary.message ?? '', /universe arity mismatch|unsupported/, 'indexed recursor misuse should fail for an explicit kernel reason');


const eqRecursorEnv = new Environment();
installCorePrimitives(eqRecursorEnv);
const eqRecLevels = [natUniverse, natUniverse];
const eqRecType = infer(eqRecursorEnv, [], qConst('Eq.rec', eqRecLevels));
assert.equal(eqRecType.tag, 'pi', 'Eq.rec should synthesize a typed indexed equality recursor');
assert.equal(ensureSort(eqRecursorEnv, [], infer(eqRecursorEnv, [], eqRecType)).tag, 'sort', 'synthesized Eq.rec type must itself typecheck as a Sort');
const eqRecMotive = {
  tag: 'lam',
  domain: qConst('Nat'),
  body: {
    tag: 'lam',
    domain: qApps(qConst('Eq', [natUniverse]), [qConst('Nat'), qConst('Nat.zero'), { tag: 'bvar', index: 0 }]),
    body: qConst('Nat'),
  },
};
const eqReflZero = qApps(qConst('Eq.refl', [natUniverse]), [qConst('Nat'), qConst('Nat.zero')]);
const eqRecOnRefl = qApps(qConst('Eq.rec', eqRecLevels), [
  qConst('Nat'),
  qConst('Nat.zero'),
  eqRecMotive,
  qConst('Nat.zero'),
  qConst('Nat.zero'),
  eqReflZero,
]);
assert.deepEqual(
  whnf(eqRecursorEnv, [], eqRecOnRefl),
  qConst('Nat.zero'),
  'Eq.rec should iota-reduce on Eq.refl in the supported indexed equality slice',
);
const eqRecOnNeutral = qApps(qConst('Eq.rec', eqRecLevels), [
  qConst('Nat'),
  qConst('Nat.zero'),
  eqRecMotive,
  qConst('Nat.zero'),
  qConst('Nat.zero'),
  qConst('someEqualityProof'),
]);
checkAndAddDeclaration(eqRecursorEnv, {
  kind: 'axiom',
  name: 'someEqualityProof',
  levelParams: [],
  type: qApps(qConst('Eq', [natUniverse]), [qConst('Nat'), qConst('Nat.zero'), qConst('Nat.zero')]),
});
assert.deepEqual(
  whnf(eqRecursorEnv, [], eqRecOnNeutral),
  eqRecOnNeutral,
  'Eq.rec must remain neutral when the equality proof is not Eq.refl',
);


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
const natLiteralReplay = replayCoreArtifact(replayNatLiteralArtifact);
assert.equal(natLiteralReplay.status, 'accepted', natLiteralReplay.message);
assert.match(natLiteralReplay.semanticSha256, /^[0-9a-f]{64}$/, 'accepted replay summary should include deterministic semantic hash');
const natLiteralCertificate = certifyCoreArtifact(replayNatLiteralArtifact);
assert.equal(natLiteralCertificate.status, 'accepted', natLiteralCertificate.message);
assert.match(natLiteralCertificate.certificate?.semanticSha256, /^[0-9a-f]{64}$/, 'certificate should include semantic hash');
assert.equal(natLiteralCertificate.certificate?.semanticSha256, natLiteralReplay.semanticSha256, 'certificate hash should match replay summary hash');
assert.match(natLiteralCertificate.certificate?.environmentSha256, /^[0-9a-f]{64}$/, 'certificate should bind final environment snapshot hash');
assert.equal(
  natLiteralCertificate.certificate?.environmentSha256,
  replayCoreArtifactWithSnapshot(replayNatLiteralArtifact).environmentSnapshot?.environmentSha256,
  'certificate environment hash should match fresh replay environment snapshot',
);

const malformedLiteralReplay = replayCoreArtifact({
  ...replayNatLiteralArtifact,
  implementationProfile: 'bad-literal-replay-shape-smoke',
  declarations: [
    { kind: 'definition', name: 'badNatLiteralReplay', levelParams: [], type: qConst('Nat'), value: { tag: 'lit', literal: { tag: 'nat', value: -1 } }, reducibility: 'regular' },
  ],
});
assert.equal(malformedLiteralReplay.status, 'rejected', 'replay validation must reject malformed Nat literal shapes before checking');

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
assert.equal(moduleMismatchReplay.status, 'rejected', 'replay must reject module metadata that references missing checked declarations');

const certInput = 'artifacts/pskernel-cli-certify-smoke.json';
await import('node:fs').then(fs => fs.writeFileSync(certInput, JSON.stringify(replayNatLiteralArtifact)));
const pskernelCertifyOutput = execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'certify', certInput], { encoding: 'utf8' });
const pskernelCertifyJson = JSON.parse(pskernelCertifyOutput);
assert.equal(pskernelCertifyJson.status, 'accepted', 'pskernel CLI certify should accept a replayable artifact');
assert.match(pskernelCertifyJson.certificate.semanticSha256, /^[0-9a-f]{64}$/, 'pskernel CLI certify should emit a deterministic semantic hash');
assert.match(pskernelCertifyJson.certificate.environmentSha256, /^[0-9a-f]{64}$/, 'pskernel CLI certify should emit a deterministic final environment hash');


const certificateVerification = verifyCoreReplayCertificate(replayNatLiteralArtifact, natLiteralCertificate.certificate);
assert.equal(certificateVerification.status, 'accepted', certificateVerification.message);
assert.equal(certificateVerification.semanticSha256, natLiteralCertificate.certificate.semanticSha256, 'verified certificate should preserve semantic hash');
assert.equal(certificateVerification.environmentSha256, natLiteralCertificate.certificate.environmentSha256, 'verified certificate should preserve environment hash');
assert.equal(pskernelVerifyCoreCertificate(replayNatLiteralArtifact, natLiteralCertificate.certificate).status, 'accepted', 'Main entry certificate verifier should accept matching certificate');
const forgedCertificate = { ...natLiteralCertificate.certificate, semanticSha256: 'f'.repeat(64) };
assert.equal(
  verifyCoreReplayCertificate(replayNatLiteralArtifact, forgedCertificate).status,
  'rejected',
  'certificate verifier must reject forged semantic hashes',
);
const forgedEnvironmentCertificate = { ...natLiteralCertificate.certificate, environmentSha256: 'e'.repeat(64) };
assert.equal(
  verifyCoreReplayCertificate(replayNatLiteralArtifact, forgedEnvironmentCertificate).status,
  'rejected',
  'certificate verifier must reject forged environment snapshot hashes',
);
const legacyCertificateWithoutEnvironmentHash = { ...natLiteralCertificate.certificate };
delete legacyCertificateWithoutEnvironmentHash.environmentSha256;
assert.equal(
  verifyCoreReplayCertificate(replayNatLiteralArtifact, legacyCertificateWithoutEnvironmentHash).status,
  'rejected',
  'certificate verifier must reject certificates that do not bind the final environment hash',
);
const changedArtifactVerification = verifyCoreReplayCertificate(
  {
    ...replayNatLiteralArtifact,
    declarations: [
      { kind: 'definition', name: 'threeByLiteralReplay', levelParams: [], type: qConst('Nat'), value: { tag: 'lit', literal: { tag: 'nat', value: 3 } }, reducibility: 'regular' },
    ],
  },
  natLiteralCertificate.certificate,
);
assert.equal(changedArtifactVerification.status, 'rejected', 'certificate verifier must reject artifacts changed after certification');
const verifyCertInput = 'artifacts/pskernel-cli-verify-cert-smoke.json';
await import('node:fs').then(fs => fs.writeFileSync(verifyCertInput, JSON.stringify({ artifact: replayNatLiteralArtifact, certificate: natLiteralCertificate.certificate })));
const pskernelVerifyCertOutput = execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'verify-cert', verifyCertInput], { encoding: 'utf8' });
const pskernelVerifyCertJson = JSON.parse(pskernelVerifyCertOutput);
assert.equal(pskernelVerifyCertJson.status, 'accepted', 'pskernel CLI verify-cert should accept a matching certificate');



const certificateBundle = createCoreReplayCertificateBundle(replayNatLiteralArtifact);
assert.equal(certificateBundle.status, 'accepted', certificateBundle.message);
assert.equal(certificateBundle.format, 'proofscript-core-replay-certificate-bundle', 'certificate bundle should expose a deterministic format marker');
assert.match(certificateBundle.bundleSha256, /^[0-9a-f]{64}$/, 'certificate bundle should include deterministic bundle hash');
assert.equal(certificateBundle.certificate.environmentSha256, certificateBundle.environmentSnapshot.environmentSha256, 'bundle should bind certificate to environment snapshot');
const bundleVerification = verifyCoreReplayCertificateBundle(certificateBundle);
assert.equal(bundleVerification.status, 'accepted', bundleVerification.message);
assert.equal(bundleVerification.bundleSha256, certificateBundle.bundleSha256, 'bundle verification should return the verified bundle hash');
assert.equal(pskernelVerifyCoreCertificateBundle(certificateBundle).status, 'accepted', 'Main bundle verification entry should accept its own bundle');
assert.equal(pskernelCreateCoreCertificateBundle(replayNatLiteralArtifact).status, 'accepted', 'Main bundle creation entry should accept a replayable artifact');
const obligationCatalogSha256 = stableSha256(proofObligationReport());
assert.equal(certificateBundle.obligationsSha256, obligationCatalogSha256, 'certificate bundle should bind the proof-obligation catalog hash explicitly');
const forgedBundleObligations = { ...certificateBundle, obligationsSha256: 'b'.repeat(64) };
assert.equal(verifyCoreReplayCertificateBundle(forgedBundleObligations).status, 'rejected', 'bundle verification must reject forged proof-obligation catalog hashes');
const forgedBundleHash = { ...certificateBundle, bundleSha256: 'f'.repeat(64) };
assert.equal(verifyCoreReplayCertificateBundle(forgedBundleHash).status, 'rejected', 'bundle verification must reject forged bundle hashes');
const forgedBundleSnapshot = {
  ...certificateBundle,
  environmentSnapshot: { ...certificateBundle.environmentSnapshot, environmentSha256: 'a'.repeat(64) },
};
assert.equal(verifyCoreReplayCertificateBundle(forgedBundleSnapshot).status, 'rejected', 'bundle verification must reject forged environment snapshots');
const bundleInput = 'artifacts/pskernel-cli-certificate-bundle-smoke.json';
await import('node:fs').then(fs => fs.writeFileSync(bundleInput, JSON.stringify(replayNatLiteralArtifact)));
const pskernelBundleOutput = execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'bundle', bundleInput], { encoding: 'utf8' });
const pskernelBundleJson = JSON.parse(pskernelBundleOutput);
assert.equal(pskernelBundleJson.status, 'accepted', 'pskernel CLI bundle should accept a replayable artifact');
assert.match(pskernelBundleJson.bundleSha256, /^[0-9a-f]{64}$/, 'pskernel CLI bundle should emit deterministic bundle hash');
const verifyBundleInput = 'artifacts/pskernel-cli-verify-bundle-smoke.json';
await import('node:fs').then(fs => fs.writeFileSync(verifyBundleInput, JSON.stringify(pskernelBundleJson)));
const pskernelVerifyBundleOutput = execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'verify-bundle', verifyBundleInput], { encoding: 'utf8' });
assert.equal(JSON.parse(pskernelVerifyBundleOutput).status, 'accepted', 'pskernel CLI verify-bundle should accept a matching deterministic bundle');

const obligationCatalogCheck = verifyProofObligationCatalog();
assert.equal(obligationCatalogCheck.status, 'accepted', obligationCatalogCheck.message);
const obligationReport = proofObligationReport();
assert.ok(obligationReport.total >= 30, 'proof-obligation catalog should expose machine-readable porting obligations');
assert.equal(obligationReport.byProofStatus['proven'], undefined, 'trusted-boundary catalog must not claim proven obligations yet');
assert.equal(pskernelProofObligations().total, obligationReport.total, 'Main proof-obligation entry should expose same catalog');
const pskernelObligationsJson = JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'obligations', '--json'], { encoding: 'utf8' }));
assert.equal(pskernelObligationsJson.total, obligationReport.total, 'pskernel CLI obligations --json should expose catalog');

const auditBundle = pskernelAuditCoreArtifact(replayNatLiteralArtifact);
assert.equal(auditBundle.status, 'accepted', auditBundle.message);
assert.equal(auditBundle.certificateVerification?.status, 'accepted', 'audit bundle should verify its own freshly produced certificate');
assert.match(auditBundle.auditSha256, /^[0-9a-f]{64}$/, 'audit bundle should have deterministic audit hash');
const pskernelAuditOutput = execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'audit', certInput], { encoding: 'utf8' });
const pskernelAuditJson = JSON.parse(pskernelAuditOutput);
assert.equal(pskernelAuditJson.status, 'accepted', 'pskernel CLI audit should accept a replayable artifact');
assert.match(pskernelAuditJson.auditSha256, /^[0-9a-f]{64}$/, 'pskernel CLI audit should emit deterministic audit hash');


if (process.env.PS_KERNEL_SMOKE_RELEASE === '1') {
  const pskernelPreflightOutput = execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'preflight', '--json'], { encoding: 'utf8' });
  const pskernelPreflightJson = JSON.parse(pskernelPreflightOutput);
  assert.equal(pskernelPreflightJson.status, 'accepted', 'pskernel CLI preflight should accept the release-readiness mirror/audit gate');
  assert.equal(pskernelPreflightJson.requiredFailureCount, 0, 'pskernel CLI preflight should have zero required failures');
  assert.equal(pskernelPreflightJson.mirror.entryCount, 112, 'pskernel CLI preflight should confirm all pskernel source files are mirrored');
  assert.match(pskernelPreflightJson.preflightSha256, /^[0-9a-f]{64}$/, 'pskernel CLI preflight should emit deterministic preflight hash');

  const pskernelPackageAuditOutput = execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'package-audit', '--json'], { encoding: 'utf8' });
  const pskernelPackageAuditJson = JSON.parse(pskernelPackageAuditOutput);
  assert.equal(pskernelPackageAuditJson.status, 'accepted', 'pskernel CLI package-audit should accept publishable package contents');
  assert.equal(pskernelPackageAuditJson.requiredFailureCount, 0, 'package-audit should have zero required failures');
  assert.match(pskernelPackageAuditJson.packageAuditSha256, /^[0-9a-f]{64}$/, 'package-audit should emit deterministic audit hash');
  assert.ok(
    pskernelPackageAuditJson.checks.some(check => check.id === 'pack.doc.TRUST_BOUNDARY.md' && check.status === 'accepted'),
    'package-audit should prove trust-boundary docs are included in npm package contents',
  );

  const pskernelTarballSmokeOutput = execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'tarball-smoke', '--json'], { encoding: 'utf8' });
  const pskernelTarballSmokeJson = JSON.parse(pskernelTarballSmokeOutput);
  assert.equal(pskernelTarballSmokeJson.status, 'accepted', 'pskernel CLI tarball-smoke should install the packed package and run dist API smoke');
  assert.equal(pskernelTarballSmokeJson.requiredFailureCount, 0, 'tarball-smoke should have zero required failures');
  assert.match(pskernelTarballSmokeJson.tarballSmokeSha256, /^[0-9a-f]{64}$/, 'tarball-smoke should emit deterministic evidence hash');
  assert.ok(
    pskernelTarballSmokeJson.checks.some(check => check.id === 'runtime.api-smoke' && check.status === 'accepted'),
    'tarball-smoke should prove installed runtime APIs work outside the monorepo',
  );
}



const snapshotEnvA = new Environment();
installCorePrimitives(snapshotEnvA, { quotients: true });
const envSnapshotA = snapshotEnvironment(snapshotEnvA, { label: 'core+quot-smoke' });
assert.equal(envSnapshotA.format, 'proofscript-environment-snapshot', 'environment snapshot should expose a deterministic format marker');
assert.match(envSnapshotA.environmentSha256, /^[0-9a-f]{64}$/, 'environment snapshot should include a deterministic sha256');
assert.ok(envSnapshotA.constants.some(c => c.name === 'Nat.succ' && c.kind === 'ctorInfo'), 'environment snapshot should include constant info entries');
assert.ok(envSnapshotA.checkedDeclarations.some(d => d.name === 'Quot.ind' && d.kind === 'quotient'), 'environment snapshot should include checked generated declarations');

const snapshotEnvB = new Environment();
installCorePrimitives(snapshotEnvB, { quotients: true });
const envSnapshotB = snapshotEnvironment(snapshotEnvB, { label: 'core+quot-smoke' });
assert.equal(envSnapshotA.environmentSha256, envSnapshotB.environmentSha256, 'same admitted environment should snapshot to the same hash');

const checkWithSnapshot = checkCoreDeclarationsWithSnapshot([
  {
    kind: 'definition',
    name: 'oneWithSnapshotPrelude',
    levelParams: [],
    type: qConst('Nat'),
    value: qApp(qConst('Nat.succ'), qConst('Nat.zero')),
    reducibility: 'regular',
  },
], 'snapshot-check-smoke', 'core');
assert.equal(checkWithSnapshot.status, 'accepted', checkWithSnapshot.message);
assert.equal(checkWithSnapshot.environmentSnapshot?.checkedDeclarations.some(d => d.name === 'oneWithSnapshotPrelude'), true, 'checkCoreDeclarationsWithSnapshot should expose the final checked environment');
assert.match(checkWithSnapshot.environmentSnapshot?.environmentSha256, /^[0-9a-f]{64}$/, 'checkCoreDeclarationsWithSnapshot should hash the final environment');

const replayWithSnapshot = replayCoreArtifactWithSnapshot(replayNatLiteralArtifact);
assert.equal(replayWithSnapshot.status, 'accepted', replayWithSnapshot.message);
assert.equal(replayWithSnapshot.environmentSnapshot?.checkedDeclarations.some(d => d.name === 'twoByLiteralReplay'), true, 'replayCoreArtifactWithSnapshot should include artifact declarations in the final environment');
assert.match(replayWithSnapshot.environmentSnapshot?.environmentSha256, /^[0-9a-f]{64}$/, 'replayCoreArtifactWithSnapshot should hash the replay environment');

const pskernelSnapshotOutput = execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'snapshot', certInput], { encoding: 'utf8' });
const pskernelSnapshotJson = JSON.parse(pskernelSnapshotOutput);
assert.equal(pskernelSnapshotJson.status, 'accepted', 'pskernel CLI snapshot should accept a replayable artifact');
assert.match(pskernelSnapshotJson.environmentSnapshot.environmentSha256, /^[0-9a-f]{64}$/, 'pskernel CLI snapshot should emit environment snapshot hash');

if (process.env.PS_KERNEL_SMOKE_HEAVY === '1') {
  const pskernelReleaseManifestOutput = execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'release-manifest', '--json'], { encoding: 'utf8' });
  const pskernelReleaseManifestJson = JSON.parse(pskernelReleaseManifestOutput);
  assert.equal(pskernelReleaseManifestJson.status, 'accepted', 'pskernel CLI release-manifest should accept the combined release evidence bundle');
  assert.equal(pskernelReleaseManifestJson.requiredFailureCount, 0, 'release-manifest should have zero required failures');
  assert.match(pskernelReleaseManifestJson.releaseManifestSha256, /^[0-9a-f]{64}$/, 'release-manifest should emit a deterministic release hash');
  assert.match(pskernelReleaseManifestJson.componentHashes.certificateBundleSha256, /^[0-9a-f]{64}$/, 'release-manifest should bind certificate bundle sha256');
  assert.match(pskernelReleaseManifestJson.componentHashes.sourceTreeSha256, /^[0-9a-f]{64}$/, 'release-manifest should bind source tree sha256');
  assert.equal(pskernelReleaseManifestJson.checks.some(check => check.id === 'source-tree.evidence' && check.status === 'accepted'), true, 'release-manifest should verify source tree evidence');
  assert.match(pskernelReleaseManifestJson.componentHashes.certificateBundleObligationsSha256, /^[0-9a-f]{64}$/, 'release-manifest should bind certificate-bundle obligation sha256');
  assert.match(pskernelReleaseManifestJson.componentHashes.certificateBundleEnvironmentSha256, /^[0-9a-f]{64}$/, 'release-manifest should bind certificate-bundle environment sha256');
  const tarballDeterminismCheck = pskernelReleaseManifestJson.checks.find(check => check.id === 'component.tarball-smoke.deterministic');
  if (tarballDeterminismCheck) assert.equal(tarballDeterminismCheck.status, 'accepted', 'repeated tarball-smoke determinism check should accept when requested');
  assert.ok(
    pskernelReleaseManifestJson.checks.some(check => check.id === 'component.certificate-bundle.deterministic' && check.status === 'accepted'),
    'release-manifest should prove certificate-bundle evidence is deterministic across repeated fresh replay',
  );
  assert.match(pskernelReleaseManifestJson.componentHashes.tarballSha256, /^[0-9a-f]{64}$/, 'release-manifest should record packed tarball sha256');
}


if (process.env.PS_KERNEL_SMOKE_RELEASE === '1') {
  const pskernelSourceTreeOutput = execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'source-tree', '--json'], { encoding: 'utf8' });
  const pskernelSourceTreeJson = JSON.parse(pskernelSourceTreeOutput);
  assert.equal(pskernelSourceTreeJson.status, 'accepted', 'pskernel CLI source-tree should emit deterministic source inventory evidence');
  assert.match(pskernelSourceTreeJson.sourceTreeSha256, /^[0-9a-f]{64}$/, 'source-tree evidence should include sourceTreeSha256');
  assert.ok(pskernelSourceTreeJson.fileCount > 0, 'source-tree evidence should include files');
  await import('node:fs').then(fs => fs.writeFileSync('/tmp/p45_source_tree.json', JSON.stringify(pskernelSourceTreeJson, null, 2)));
  const pskernelVerifySourceTreeOutput = execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'verify-source-tree', '/tmp/p45_source_tree.json', '--json'], { encoding: 'utf8' });
  assert.equal(JSON.parse(pskernelVerifySourceTreeOutput).status, 'accepted', 'pskernel CLI verify-source-tree should accept fresh matching source-tree evidence');
  const forgedSourceTree = { ...pskernelSourceTreeJson, sourceTreeSha256: '0'.repeat(64) };
  await import('node:fs').then(fs => fs.writeFileSync('/tmp/p45_source_tree_forged.json', JSON.stringify(forgedSourceTree, null, 2)));
  assert.throws(
    () => execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'verify-source-tree', '/tmp/p45_source_tree_forged.json', '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }),
    'pskernel CLI verify-source-tree should reject forged sourceTreeSha256',
  );

  const releaseArchivePath = '/tmp/proofscript-p46-release-archive.zip';
  const pskernelReleaseArchiveOutput = execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'source-archive', '--json', '--output', releaseArchivePath], { encoding: 'utf8' });
  const pskernelReleaseArchiveJson = JSON.parse(pskernelReleaseArchiveOutput);
  assert.equal(pskernelReleaseArchiveJson.status, 'accepted', 'pskernel CLI source-archive should create deterministic release archive evidence');
  assert.match(pskernelReleaseArchiveJson.archive.sha256, /^[0-9a-f]{64}$/, 'source-archive evidence should bind archive zip sha256');
  assert.match(pskernelReleaseArchiveJson.sourceTreeSha256, /^[0-9a-f]{64}$/, 'source-archive evidence should bind source tree sha256');
  await import('node:fs').then(fs => fs.writeFileSync('/tmp/p46_release_archive.json', JSON.stringify(pskernelReleaseArchiveJson, null, 2)));
  const pskernelVerifyReleaseArchiveOutput = execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'verify-source-archive', '/tmp/p46_release_archive.json', '--json'], { encoding: 'utf8' });
  assert.equal(JSON.parse(pskernelVerifyReleaseArchiveOutput).status, 'accepted', 'pskernel CLI verify-source-archive should accept matching archive evidence');
  const forgedReleaseArchive = { ...pskernelReleaseArchiveJson, archive: { ...pskernelReleaseArchiveJson.archive, sha256: 'c'.repeat(64) } };
  await import('node:fs').then(fs => fs.writeFileSync('/tmp/p46_release_archive_forged.json', JSON.stringify(forgedReleaseArchive, null, 2)));
  assert.throws(
    () => execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pskernel.ts', 'verify-source-archive', '/tmp/p46_release_archive_forged.json', '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }),
    'pskernel CLI verify-source-archive should reject forged archive sha256',
  );
}

console.log('PSKERNEL_TS_KERNEL_SMOKE=PASS');
process.exit(0);

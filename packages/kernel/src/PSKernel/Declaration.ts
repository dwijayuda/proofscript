import { Level, LevelZero, isNeverZero, levelParam, levelStructuralEq, levelDefEqList } from "./Level";
import { Name } from "./Name";
import { BinderInfo, containsLooseBVar, getAppArgs, getAppFn, sameTerm, Term, Literal, instantiate, shift } from "./Expr";

export interface DeclarationHeader {
  name: Name;
  levelParams: Name[];
}

export type ReducibilityHints =
  | { kind: "opaque" }
  | { kind: "regular"; height?: number }
  | { kind: "abbrev" };

export interface CoreConstructor { name: Name; type: Term; }
export interface CoreMutualInductiveMember {
  name: Name;
  type: Term;
  numParams: number;
  numIndices: number;
  constructors: CoreConstructor[];
}

export type CoreDeclaration =
  | (DeclarationHeader & { kind: "quot" })
  | (DeclarationHeader & { kind: "mutualInductive"; inductives: CoreMutualInductiveMember[] })
  | (DeclarationHeader & { kind: "axiom"; type: Term })
  | (DeclarationHeader & { kind: "theorem"; type: Term; value: Term })
  | (DeclarationHeader & { kind: "opaque"; type: Term; value: Term })
  | (DeclarationHeader & { kind: "example"; type: Term; value: Term })
  | (DeclarationHeader & { kind: "definition"; type: Term; value: Term; reducibility: "regular" | "abbrev" })
  | (DeclarationHeader & { kind: "inductive"; type: Term; numParams: number; numIndices: number; constructors: CoreConstructor[] });

export type ConstantInfo =
  | (DeclarationHeader & { kind: "axiomInfo"; type: Term })
  | (DeclarationHeader & { kind: "defnInfo"; type: Term; value: Term; hints: ReducibilityHints; safety: "safe" | "unsafe" | "partial" })
  | (DeclarationHeader & { kind: "thmInfo"; type: Term; value: Term })
  | (DeclarationHeader & { kind: "opaqueInfo"; type: Term; value: Term })
  | (DeclarationHeader & { kind: "inductInfo"; type: Term; numParams: number; numIndices: number; constructors: Name[] })
  | (DeclarationHeader & { kind: "ctorInfo"; type: Term; inductive: Name })
  | (DeclarationHeader & { kind: "recInfo"; type?: Term; metadata?: unknown })
  | (DeclarationHeader & { kind: "quotInfo"; type?: Term; quotKind?: string });

export interface TypeclassFieldMetadata { name: Name; type: Term; }
export interface TypeclassParamMetadata { name: Name; binderInfo: BinderInfo; }
export interface TypeclassClassMetadata {
  name: Name;
  numParams: number;
  params: TypeclassParamMetadata[];
  fields: TypeclassFieldMetadata[];
  declarationOrder: number;
}
export interface TypeclassInstanceMetadata {
  name: Name;
  className: Name;
  priority: number;
  declarationOrder: number;
  scope: "global";
  anonymous: boolean;
}
export interface TypeclassEnvironmentMetadata {
  classes: TypeclassClassMetadata[];
  instances: TypeclassInstanceMetadata[];
}
export const emptyTypeclassEnvironment = (): TypeclassEnvironmentMetadata => ({ classes: [], instances: [] });

export interface CoreModuleImportMetadata { module: string; mode: "plain"; interfaceSha256: string; }
export interface CoreModuleMetadata {
  name: string;
  sourceSha256: string;
  imports: CoreModuleImportMetadata[];
  declarations: string[];
  exports: string[];
  interfaceSha256: string;
  cacheKeySha256: string;
}
export interface CoreModulesMetadata {
  entry: string;
  interfaceFormatVersion: 1;
  cacheKeyFormatVersion: 1;
  baseEnvironmentSha256: string;
  modules: CoreModuleMetadata[];
}

export type CorePreludeProfile = "none" | "core" | "core+quot";

export interface CoreArtifact {
  format: "proofscript-core";
  formatVersion: number;
  proofscriptReference: string;
  leanSemanticBaseline: "4.33.1";
  implementationProfile: string;
  /** Optional deterministic standalone base environment. Omitted means no prelude for backward-compatible artifacts. */
  prelude?: CorePreludeProfile;
  declarations: CoreDeclaration[];
  typeclasses: TypeclassEnvironmentMetadata;
  modules?: CoreModulesMetadata;
}


export interface RecursorRuleMetadata { ctor: Name; nfields: number; recursiveFields: boolean[]; recursiveFieldTypes?: Term[]; recursiveFieldFamilies?: (Name | null)[] }
export interface RecursorMetadata { trustedBoundary: true; status: "stubbed" | "typed-simple-nonindexed" | "typed-simple-indexed" | "typed-eq-indexed"; numParams?: number; numIndices?: number; numMinors?: number; rules: RecursorRuleMetadata[]; mutual?: { familyNames: Name[]; recursorNames: Name[]; paramCount: number; indexCounts: number[]; ruleFamilies: Name[]; targetFamily: Name } }
export interface RecursorKnownDefinition { levelParams: Name[]; value: Term }
export interface RecursorSynthesisOptions { allowRecursorFamilyBinderInfo?: boolean; knownPropFamilyArities?: ReadonlyMap<Name, number>; knownDefinitions?: ReadonlyMap<Name, RecursorKnownDefinition> }

function recursorFamilyBinderInfo(source: BinderInfo | undefined, options: RecursorSynthesisOptions = {}): BinderInfo {
  const normalized = source ?? "explicit";
  if (!options.allowRecursorFamilyBinderInfo) return "implicit";
  return normalized === "explicit" ? "implicit" : normalized;
}


function freshRecursorMotiveLevelParam(levelParams: readonly Name[]): Name {
  const used = new Set(levelParams);
  const base = "u_motive";
  if (!used.has(base)) return base;
  for (let i = 1; ; i++) {
    const candidate = `${base}${i}`;
    if (!used.has(candidate)) return candidate;
  }
}

function mkConst(name: Name, levels: readonly Level[] = []): Term { return { tag: "const", name, levels: [...levels] }; }
function mkBVar(index: number): Term { return { tag: "bvar", index }; }
function mkApp(fn: Term, arg: Term): Term { return { tag: "app", fn, arg }; }
function mkApps(fn: Term, args: readonly Term[]): Term { return args.reduce((acc, arg) => mkApp(acc, arg), fn); }
function mkPi(domain: Term, body: Term, binderInfo: BinderInfo = "explicit"): Term { return { tag: "pi", domain, body, binderInfo }; }


type NamedTerm =
  | { tag: "sort"; level: Level }
  | { tag: "var"; name: Name }
  | { tag: "const"; name: Name; levels: Level[] }
  | { tag: "app"; fn: NamedTerm; arg: NamedTerm }
  | { tag: "lam"; name: Name; domain: NamedTerm; body: NamedTerm; binderInfo: BinderInfo }
  | { tag: "pi"; name: Name; domain: NamedTerm; body: NamedTerm; binderInfo: BinderInfo }
  | { tag: "lit"; literal: Literal }
  | { tag: "proj"; typeName: Name; index: number; expr: NamedTerm };

const nSort = (level: Level): NamedTerm => ({ tag: "sort", level });
const nVar = (name: Name): NamedTerm => ({ tag: "var", name });
const nConst = (name: Name, levels: Level[] = []): NamedTerm => ({ tag: "const", name, levels });
const nApp = (fn: NamedTerm, arg: NamedTerm): NamedTerm => ({ tag: "app", fn, arg });
const nApps = (fn: NamedTerm, args: NamedTerm[]): NamedTerm => args.reduce((acc, arg) => nApp(acc, arg), fn);
const nLam = (name: Name, domain: NamedTerm, body: NamedTerm, binderInfo: BinderInfo = "explicit"): NamedTerm => ({ tag: "lam", name, domain, body, binderInfo });
const nPi = (name: Name, domain: NamedTerm, body: NamedTerm, binderInfo: BinderInfo = "explicit"): NamedTerm => ({ tag: "pi", name, domain, body, binderInfo });
const nLit = (literal: Literal): NamedTerm => ({ tag: "lit", literal });
const nProj = (typeName: Name, index: number, expr: NamedTerm): NamedTerm => ({ tag: "proj", typeName, index, expr });
const nArrow = (domain: NamedTerm, body: NamedTerm): NamedTerm => nPi("_", domain, body, "explicit");
const nPis = (bindings: { name: Name; domain: NamedTerm; binderInfo?: BinderInfo }[], body: NamedTerm): NamedTerm =>
  bindings.reduceRight((acc, b) => nPi(b.name, b.domain, acc, b.binderInfo ?? "explicit"), body);

function coreToNamed(term: Term, names: readonly Name[]): NamedTerm | undefined {
  const normalized = zetaNormalizeForRecursorSynthesis(term);
  switch (normalized.tag) {
    case "sort": return nSort(normalized.level);
    case "bvar": {
      const name = names[names.length - 1 - normalized.index];
      return name === undefined ? undefined : nVar(name);
    }
    case "const": return nConst(normalized.name, [...normalized.levels]);
    case "app": {
      const fn = coreToNamed(normalized.fn, names);
      const arg = coreToNamed(normalized.arg, names);
      return fn && arg ? nApp(fn, arg) : undefined;
    }
    case "pi": {
      const binderName = `_x${names.length}`;
      const domain = coreToNamed(normalized.domain, names);
      const body = coreToNamed(normalized.body, [...names, binderName]);
      return domain && body ? nPi(binderName, domain, body, normalized.binderInfo) : undefined;
    }
    case "lam": {
      const binderName = `_x${names.length}`;
      const domain = coreToNamed(normalized.domain, names);
      const body = coreToNamed(normalized.body, [...names, binderName]);
      return domain && body ? nLam(binderName, domain, body, normalized.binderInfo ?? "explicit") : undefined;
    }
    case "lit": return nLit(normalized.literal);
    case "proj": {
      const expr = coreToNamed(normalized.expr, names);
      return expr ? nProj(normalized.typeName, normalized.index, expr) : undefined;
    }
    case "let": return undefined;
  }
}


function lowerNamed(term: NamedTerm, names: Name[] = []): Term {
  switch (term.tag) {
    case "sort": return { tag: "sort", level: term.level };
    case "var": {
      for (let i = names.length - 1; i >= 0; i--) if (names[i] === term.name) return { tag: "bvar", index: names.length - 1 - i };
      throw new Error(`internal recursor generator: unbound named variable ${term.name}`);
    }
    case "const": return { tag: "const", name: term.name, levels: term.levels };
    case "app": return mkApp(lowerNamed(term.fn, names), lowerNamed(term.arg, names));
    case "lam": return { tag: "lam", domain: lowerNamed(term.domain, names), body: lowerNamed(term.body, [...names, term.name]), binderInfo: term.binderInfo };
    case "pi": return mkPi(lowerNamed(term.domain, names), lowerNamed(term.body, [...names, term.name]), term.binderInfo);
    case "lit": return { tag: "lit", literal: term.literal };
    case "proj": return { tag: "proj", typeName: term.typeName, index: term.index, expr: lowerNamed(term.expr, names) };
  }
}

function expectedEqInductiveType(levelParamName: Name): Term {
  const u = levelParam(levelParamName);
  const alpha = nVar("α");
  return lowerNamed(nPi("α", nSort(u), nArrow(alpha, nArrow(alpha, { tag: "sort", level: { tag: "zero" } })), "implicit"));
}

function expectedEqReflConstructorType(levelParamName: Name): Term {
  const u = levelParam(levelParamName);
  const alpha = nVar("α");
  const a = nVar("a");
  return lowerNamed(nPi("α", nSort(u), nPi("a", alpha, nApps(nConst("Eq", [u]), [alpha, a, a]), "explicit"), "implicit"));
}

function sameTermIgnoringBinderInfo(a: Term, b: Term): boolean {
  if (a.tag !== b.tag) return false;
  switch (a.tag) {
    case "sort": return b.tag === "sort" && levelStructuralEq(a.level, b.level);
    case "bvar": return b.tag === "bvar" && a.index === b.index;
    case "const": return b.tag === "const" && a.name === b.name && a.levels.length === b.levels.length && a.levels.every((l, i) => levelStructuralEq(l, b.levels[i]));
    case "lit": return b.tag === "lit" && a.literal.tag === b.literal.tag && a.literal.value === b.literal.value;
    case "app": return b.tag === "app" && sameTermIgnoringBinderInfo(a.fn, b.fn) && sameTermIgnoringBinderInfo(a.arg, b.arg);
    case "lam": return b.tag === "lam" && sameTermIgnoringBinderInfo(a.domain, b.domain) && sameTermIgnoringBinderInfo(a.body, b.body);
    case "pi": return b.tag === "pi" && sameTermIgnoringBinderInfo(a.domain, b.domain) && sameTermIgnoringBinderInfo(a.body, b.body);
    case "let": return b.tag === "let" && a.nondep === b.nondep && sameTermIgnoringBinderInfo(a.type, b.type) && sameTermIgnoringBinderInfo(a.value, b.value) && sameTermIgnoringBinderInfo(a.body, b.body);
    case "proj": return b.tag === "proj" && a.typeName === b.typeName && a.index === b.index && sameTermIgnoringBinderInfo(a.expr, b.expr);
  }
}

function synthesizeEqRecursorType(ind: CoreMutualInductiveMember, levelParams: readonly Name[]): SynthesizedRecursorType | undefined {
  if (ind.name !== "Eq" || levelParams.length !== 1 || ind.numParams !== 2 || ind.numIndices !== 1 || ind.constructors.length !== 1) return undefined;
  const ctor = ind.constructors[0];
  if (ctor.name !== "Eq.refl") return undefined;
  const levelParamName = levelParams[0];
  // PSC-1 source declarations spell family parameters explicitly today, while
  // Lean's generated Eq constants present the corresponding recursor binders as
  // implicit.  Recognizing the checked Eq shape must therefore compare the
  // structural telescope and result, not reject solely on source BinderInfo.
  if (!sameTermIgnoringBinderInfo(ind.type, expectedEqInductiveType(levelParamName))) return undefined;
  if (!sameTermIgnoringBinderInfo(ctor.type, expectedEqReflConstructorType(levelParamName))) return undefined;

  const u = levelParam(levelParamName);
  const motiveLevelParam = freshRecursorMotiveLevelParam(levelParams);
  const v = levelParam(motiveLevelParam);
  const alpha = nVar("α");
  const a = nVar("a");
  const b = nVar("b");
  const h = nVar("h");
  const motive = nVar("motive");
  const eqAlphaAB = nApps(nConst("Eq", [u]), [alpha, a, b]);
  const eqReflA = nApps(nConst("Eq.refl", [u]), [alpha, a]);
  const motiveType = nPi("b", alpha, nPi("h", eqAlphaAB, nSort(v), "explicit"), "explicit");
  const type = lowerNamed(
    nPi("α", nSort(u),
      nPi("a", alpha,
        nPi("motive", motiveType,
          nPi("reflCase", nApps(motive, [a, eqReflA]),
            nPi("b", alpha,
              nPi("h", eqAlphaAB,
                nApps(motive, [b, h]), "explicit"), "implicit"), "explicit"), "implicit"), "implicit"), "implicit"),
  );
  return { levelParams: [motiveLevelParam, ...levelParams], type };
}


function levelIsZero(level: Level): boolean {
  return levelDefEqList([level], [LevelZero]);
}

function familyResultIsProp(ind: CoreMutualInductiveMember): boolean {
  const result = constructorCodomain(ind.type);
  return result.tag === "sort" && levelIsZero(result.level);
}

function localInferType(term: Term, contextTypesOldToNew: readonly Term[], depth = 0): Term | undefined {
  const normalized = zetaNormalizeForRecursorSynthesis(term);
  if (!sameTerm(normalized, term)) return localInferType(normalized, contextTypesOldToNew, depth);
  switch (term.tag) {
    case "bvar": {
      const relative = term.index - depth;
      if (relative < 0 || relative >= contextTypesOldToNew.length) return undefined;
      return contextTypesOldToNew[contextTypesOldToNew.length - 1 - relative];
    }
    case "app": {
      const fnType = localInferType(term.fn, contextTypesOldToNew, depth);
      const reducedFnType = fnType ? zetaNormalizeForRecursorSynthesis(fnType) : undefined;
      return reducedFnType?.tag === "pi" ? instantiate(reducedFnType.body, term.arg) : undefined;
    }
    case "let": return localInferType(instantiate(term.body, term.value), contextTypesOldToNew, depth);
    case "sort":
    case "const":
    case "lit":
    case "lam":
    case "pi":
    case "proj": return undefined;
  }
}

function termDenotesPropInConstructorContext(
  term: Term,
  contextTypesOldToNew: readonly Term[],
  familyName: Name,
  familyIsProp: boolean,
  options: RecursorSynthesisOptions = {},
): boolean {
  const normalized = transparencyNormalizeForRecursorSynthesis(term, options);
  const head = getAppFn(normalized);
  if (head.tag === "const" && head.name === familyName) return familyIsProp;
  if (head.tag === "const") {
    const propArity = options.knownPropFamilyArities?.get(head.name);
    if (propArity !== undefined && getAppArgs(normalized).length <= propArity) return true;
  }
  if (normalized.tag === "pi") {
    return termDenotesPropInConstructorContext(normalized.body, [...contextTypesOldToNew, normalized.domain], familyName, familyIsProp, options);
  }
  const inferred = localInferType(normalized, contextTypesOldToNew);
  return inferred?.tag === "sort" && levelIsZero(inferred.level);
}

function constructorFieldDirectlyExposedInResultIndex(
  ctor: CoreConstructor,
  ind: CoreMutualInductiveMember,
  fieldIndex: number,
): boolean {
  const domains = constructorDomains(ctor.type);
  const fields = domains.slice(ind.numParams);
  const result = zetaNormalizeForRecursorSynthesis(constructorCodomain(ctor.type));
  const resultHead = getAppFn(result);
  if (resultHead.tag !== "const" || resultHead.name !== ind.name) return false;
  const resultArgs = getAppArgs(result);
  if (resultArgs.length !== ind.numParams + ind.numIndices) return false;
  const exposed = mkBVar(fields.length - 1 - fieldIndex);
  return resultArgs.slice(ind.numParams).some(index => sameTerm(index, exposed));
}

function inductiveAllowsLargeElimination(ind: CoreMutualInductiveMember, options: RecursorSynthesisOptions = {}): boolean {
  const isPropFamily = familyResultIsProp(ind);
  if (!isPropFamily) return true;
  if (ind.constructors.length === 0) return true;
  if (ind.constructors.length !== 1) return false;
  const ctor = ind.constructors[0];
  const domains = constructorDomains(ctor.type);
  const fields = domains.slice(ind.numParams);
  for (const [fieldIndex, fieldDomain] of fields.entries()) {
    if (constructorFieldDirectlyExposedInResultIndex(ctor, ind, fieldIndex)) continue;
    const contextTypes = domains.slice(0, ind.numParams + fieldIndex);
    if (termDenotesPropInConstructorContext(fieldDomain, contextTypes, ind.name, isPropFamily, options)) continue;
    return false;
  }
  return true;
}

function recursorMotiveUniverse(ind: CoreMutualInductiveMember, levelParams: readonly Name[], options: RecursorSynthesisOptions = {}): { recLevelParams: Name[]; motiveLevel: Level } {
  if (!inductiveAllowsLargeElimination(ind, options)) return { recLevelParams: [...levelParams], motiveLevel: LevelZero };
  const motiveLevelParam = freshRecursorMotiveLevelParam(levelParams);
  return { recLevelParams: [motiveLevelParam, ...levelParams], motiveLevel: levelParam(motiveLevelParam) };
}

function paramBVars(paramCount: number, extraBeforeParams: number): Term[] {
  const args: Term[] = [];
  for (let i = 0; i < paramCount; i++) args.push(mkBVar(extraBeforeParams + paramCount - 1 - i));
  return args;
}


function zetaNormalizeForRecursorSynthesis(term: Term): Term {
  switch (term.tag) {
    case "sort":
    case "bvar":
    case "const":
    case "lit": return term;
    case "app": return mkApp(zetaNormalizeForRecursorSynthesis(term.fn), zetaNormalizeForRecursorSynthesis(term.arg));
    case "lam": return { tag: "lam", domain: zetaNormalizeForRecursorSynthesis(term.domain), body: zetaNormalizeForRecursorSynthesis(term.body), binderInfo: term.binderInfo };
    case "pi": return { tag: "pi", domain: zetaNormalizeForRecursorSynthesis(term.domain), body: zetaNormalizeForRecursorSynthesis(term.body), binderInfo: term.binderInfo };
    case "proj": return { tag: "proj", typeName: term.typeName, index: term.index, expr: zetaNormalizeForRecursorSynthesis(term.expr) };
    case "let": return zetaNormalizeForRecursorSynthesis(instantiate(term.body, term.value));
  }
}

function instantiateLevelParams(level: Level, mapping: ReadonlyMap<Name, Level>): Level {
  switch (level.tag) {
    case "zero": return level;
    case "param": return mapping.get(level.name) ?? level;
    case "succ": return { tag: "succ", of: instantiateLevelParams(level.of, mapping) };
    case "max": return { tag: "max", left: instantiateLevelParams(level.left, mapping), right: instantiateLevelParams(level.right, mapping) };
    case "imax": return { tag: "imax", left: instantiateLevelParams(level.left, mapping), right: instantiateLevelParams(level.right, mapping) };
    case "mvar": return level;
  }
}

function instantiateTermLevelParams(term: Term, mapping: ReadonlyMap<Name, Level>): Term {
  switch (term.tag) {
    case "sort": return { tag: "sort", level: instantiateLevelParams(term.level, mapping) };
    case "const": return { tag: "const", name: term.name, levels: term.levels.map(level => instantiateLevelParams(level, mapping)) };
    case "bvar":
    case "lit": return term;
    case "app": return { tag: "app", fn: instantiateTermLevelParams(term.fn, mapping), arg: instantiateTermLevelParams(term.arg, mapping) };
    case "lam": return { tag: "lam", domain: instantiateTermLevelParams(term.domain, mapping), body: instantiateTermLevelParams(term.body, mapping), binderInfo: term.binderInfo };
    case "pi": return { tag: "pi", domain: instantiateTermLevelParams(term.domain, mapping), body: instantiateTermLevelParams(term.body, mapping), binderInfo: term.binderInfo };
    case "let": return { tag: "let", type: instantiateTermLevelParams(term.type, mapping), value: instantiateTermLevelParams(term.value, mapping), body: instantiateTermLevelParams(term.body, mapping), nondep: term.nondep };
    case "proj": return { tag: "proj", typeName: term.typeName, index: term.index, expr: instantiateTermLevelParams(term.expr, mapping) };
  }
}

function instantiateKnownDefinition(info: RecursorKnownDefinition, levels: readonly Level[]): Term | undefined {
  if (levels.length !== info.levelParams.length) return undefined;
  const mapping = new Map<Name, Level>();
  for (let i = 0; i < info.levelParams.length; i++) mapping.set(info.levelParams[i], levels[i]);
  return instantiateTermLevelParams(info.value, mapping);
}

function betaApplyKnownDefinitionBody(body: Term, args: readonly Term[]): Term | undefined {
  let current = body;
  for (const arg of args) {
    if (current.tag !== "lam") return undefined;
    current = instantiate(current.body, arg);
  }
  return current;
}

function isLeanAnnotationDefinitionForRecursorField(name: Name): boolean {
  return name === "optParam" || name === "outParam" || name === "semiOutParam";
}

/**
 * Lean's annotation helpers such as optParam/outParam/semiOutParam affect
 * elaboration and instance search.  They are definitionally identity-like at
 * the type level, and Lean-generated recursor field domains erase the wrapper
 * to the annotated domain.  Do not generalize this to arbitrary transparent
 * definitions: ordinary reducible wrappers around recursive fields must remain
 * visible in exported recursor types.
 */
function transparentAnnotationFieldDomainForRecursorSynthesis(term: Term, options: RecursorSynthesisOptions = {}, fuel = 16): Term {
  if (fuel <= 0) return zetaNormalizeForRecursorSynthesis(term);
  const zeta = zetaNormalizeForRecursorSynthesis(term);
  const head = getAppFn(zeta);
  if (head.tag !== "const") return zeta;
  if (!isLeanAnnotationDefinitionForRecursorField(head.name)) return zeta;
  const known = options.knownDefinitions?.get(head.name);
  if (!known) return zeta;
  const unfolded = instantiateKnownDefinition(known, head.levels);
  if (!unfolded) return zeta;
  const args = getAppArgs(zeta);
  const reduced = betaApplyKnownDefinitionBody(unfolded, args);
  if (!reduced) return zeta;
  for (const arg of args) {
    if (sameTermForRecursorSynthesis(reduced, arg, {})) {
      return transparentAnnotationFieldDomainForRecursorSynthesis(arg, options, fuel - 1);
    }
  }
  return zeta;
}

function transparencyNormalizeForRecursorSynthesis(term: Term, options: RecursorSynthesisOptions = {}, fuel = 64): Term {
  if (fuel <= 0) return zetaNormalizeForRecursorSynthesis(term);
  const zeta = zetaNormalizeForRecursorSynthesis(term);
  switch (zeta.tag) {
    case "const": {
      const known = options.knownDefinitions?.get(zeta.name);
      const unfolded = known ? instantiateKnownDefinition(known, zeta.levels) : undefined;
      return unfolded ? transparencyNormalizeForRecursorSynthesis(unfolded, options, fuel - 1) : zeta;
    }
    case "app": {
      const fn = transparencyNormalizeForRecursorSynthesis(zeta.fn, options, fuel - 1);
      if (fn.tag === "lam") return transparencyNormalizeForRecursorSynthesis(instantiate(fn.body, zeta.arg), options, fuel - 1);
      return mkApp(fn, zeta.arg);
    }
    case "let": return transparencyNormalizeForRecursorSynthesis(instantiate(zeta.body, zeta.value), options, fuel - 1);
    case "sort":
    case "bvar":
    case "lit":
    case "lam":
    case "pi":
    case "proj": return zeta;
  }
}

function sameTermForRecursorSynthesis(a: Term, b: Term, options: RecursorSynthesisOptions = {}): boolean {
  const na = transparencyNormalizeForRecursorSynthesis(a, options);
  const nb = transparencyNormalizeForRecursorSynthesis(b, options);
  if (na.tag !== nb.tag) return false;
  switch (na.tag) {
    case "sort": return nb.tag === "sort" && levelDefEqList([na.level], [nb.level]);
    case "bvar": return nb.tag === "bvar" && na.index === nb.index;
    case "const": return nb.tag === "const" && na.name === nb.name && levelDefEqList(na.levels, nb.levels);
    case "lit": return nb.tag === "lit" && na.literal.tag === nb.literal.tag && na.literal.value === nb.literal.value;
    case "app": return nb.tag === "app" && sameTermForRecursorSynthesis(na.fn, nb.fn, options) && sameTermForRecursorSynthesis(na.arg, nb.arg, options);
    case "lam": return nb.tag === "lam" && na.binderInfo === nb.binderInfo && sameTermForRecursorSynthesis(na.domain, nb.domain, options) && sameTermForRecursorSynthesis(na.body, nb.body, options);
    case "pi": return nb.tag === "pi" && na.binderInfo === nb.binderInfo && sameTermForRecursorSynthesis(na.domain, nb.domain, options) && sameTermForRecursorSynthesis(na.body, nb.body, options);
    case "proj": return nb.tag === "proj" && na.typeName === nb.typeName && na.index === nb.index && sameTermForRecursorSynthesis(na.expr, nb.expr, options);
    case "let": return false;
  }
}

function hasUniformSourceParams(args: readonly Term[], paramCount: number, fieldsBeforeParams: number, options: RecursorSynthesisOptions = {}): boolean {
  if (args.length !== paramCount) return false;
  for (let i = 0; i < paramCount; i++) {
    const expected = fieldsBeforeParams + paramCount - 1 - i;
    const arg = args[i];
    if (!arg || !sameTermForRecursorSynthesis(arg, mkBVar(expected), options)) return false;
  }
  return true;
}

function directFamilyName(term: Term, families: ReadonlySet<Name>): Name | undefined {
  const head = getAppFn(term);
  return head.tag === "const" && families.has(head.name) ? head.name : undefined;
}

function isDirectRecursiveFieldDomain(term: Term, familyName: Name, paramCount: number, fieldIndex: number, options: RecursorSynthesisOptions = {}): boolean {
  const normalized = transparencyNormalizeForRecursorSynthesis(term, options);
  const head = getAppFn(normalized);
  if (head.tag !== "const" || head.name !== familyName) return false;
  return hasUniformSourceParams(getAppArgs(normalized), paramCount, fieldIndex, options);
}

function simpleConstructorTarget(ctor: CoreConstructor, familyName: Name, paramCount: number, options: RecursorSynthesisOptions = {}): Term | undefined {
  const codomain = transparencyNormalizeForRecursorSynthesis(constructorCodomain(ctor.type), options);
  const head = getAppFn(codomain);
  if (head.tag !== "const" || head.name !== familyName) return undefined;
  const fieldCount = constructorDomains(ctor.type).length - paramCount;
  if (fieldCount < 0) return undefined;
  if (!hasUniformSourceParams(getAppArgs(codomain), paramCount, fieldCount, options)) return undefined;
  return codomain;
}

/**
 * Rebase a constructor-field domain into the recursor minor-premise scope.
 *
 * Source scope at constructor field `fieldIndex` contains previous constructor
 * fields followed by uniform family parameters.  The supported slice rejects
 * dependency on earlier fields and dependent/higher-order binders; it only
 * remaps references to the uniform parameters into the recursor scope.
 */
function rebaseConstructorFieldDomain(
  term: Term,
  paramCount: number,
  fieldIndex: number,
  minorBindersBefore: number,
  previousMinorCount: number,
  fieldBinderPositions: readonly number[] = [],
  initialDepth = 0,
): Term | undefined {
  const rebase = (current: Term, depth: number): Term | undefined => {
    const normalized = zetaNormalizeForRecursorSynthesis(current);
    if (!sameTerm(normalized, current)) return rebase(normalized, depth);
    switch (current.tag) {
      case "sort":
      case "const":
      case "lit": return current;
      case "bvar": {
        if (current.index < depth) return current;
        const sourceIndex = current.index - depth;
        if (sourceIndex < fieldIndex) {
          // A later constructor field may depend on an earlier field.  In the
          // constructor telescope, sourceIndex 0 is the immediately preceding
          // field, so translate it to the existing minor-premise binder for
          // that field without allowing dependency on induction hypotheses.
          const sourceField = fieldIndex - 1 - sourceIndex;
          const fieldPosition = fieldBinderPositions[sourceField];
          if (fieldPosition === undefined || fieldPosition >= minorBindersBefore) return undefined;
          return mkBVar(depth + (minorBindersBefore - 1 - fieldPosition));
        }
        if (sourceIndex >= fieldIndex + paramCount) return undefined;
        const paramSlotFromLast = sourceIndex - fieldIndex;
        const targetIndex = minorBindersBefore + previousMinorCount + 1 + paramSlotFromLast;
        return mkBVar(depth + targetIndex);
      }
      case "app": {
        const fn = rebase(current.fn, depth);
        const arg = rebase(current.arg, depth);
        return fn && arg ? mkApp(fn, arg) : undefined;
      }
      case "pi": {
        const domain = rebase(current.domain, depth);
        const body = rebase(current.body, depth + 1);
        return domain && body ? mkPi(domain, body, current.binderInfo) : undefined;
      }
      case "lam":
      case "let":
      case "proj": return undefined;
    }
  };
  return rebase(term, initialDepth);
}

interface MinorBinderPlan { kind: "field" | "ih"; domain: Term; binderInfo?: BinderInfo; fieldIndex?: number }

function simpleHigherOrderIHDomain(
  sourceDomain: Term,
  familyName: Name,
  paramCount: number,
  sourceFieldIndex: number,
  motiveIndex: number,
  fieldTerm: Term,
  options: RecursorSynthesisOptions = {},
  minorBindersBefore = 0,
  previousMinorCount = 0,
  fieldBinderPositions: readonly number[] = [],
  depth = 0,
): Term | undefined {
  const normalized = transparencyNormalizeForRecursorSynthesis(sourceDomain, options);
  const head = getAppFn(normalized);
  if (head.tag === "const" && head.name === familyName) {
    const args = getAppArgs(normalized);
    if (!hasUniformSourceParams(args, paramCount, sourceFieldIndex + depth, options)) return undefined;
    return mkApp(mkBVar(motiveIndex + depth), fieldTerm);
  }
  if (normalized.tag === "pi") {
    const domain = rebaseConstructorFieldDomain(normalized.domain, paramCount, sourceFieldIndex + depth, minorBindersBefore, previousMinorCount, fieldBinderPositions, depth);
    if (!domain) return undefined;
    const body = simpleHigherOrderIHDomain(
      normalized.body,
      familyName,
      paramCount,
      sourceFieldIndex,
      motiveIndex,
      mkApp(shift(fieldTerm, 1), mkBVar(0)),
      options,
      minorBindersBefore,
      previousMinorCount,
      fieldBinderPositions,
      depth + 1,
    );
    return body ? mkPi(domain, body, normalized.binderInfo) : undefined;
  }
  return undefined;
}

function simpleMinorTypeForConstructor(
  ctor: CoreConstructor,
  ctorIndex: number,
  familyName: Name,
  familyLevels: readonly Level[],
  paramCount: number,
  options: RecursorSynthesisOptions = {},
): Term | undefined {
  if (!simpleConstructorTarget(ctor, familyName, paramCount, options)) return undefined;
  const fields: { domain: Term; binderInfo: BinderInfo }[] = [];
  let ctorCursor = ctor.type;
  let ctorBinderIndex = 0;
  while (ctorCursor.tag === "pi") {
    if (ctorBinderIndex >= paramCount) fields.push({ domain: ctorCursor.domain, binderInfo: ctorCursor.binderInfo ?? "explicit" });
    ctorBinderIndex++;
    ctorCursor = ctorCursor.body;
  }
  const families = new Set<Name>([familyName]);
  const outerMotiveIndexBeforeMinor = ctorIndex;
  const binders: MinorBinderPlan[] = [];
  const fieldBinderPositions: number[] = [];
  const pendingIH: {
    fieldIndex: number;
    fieldPosition: number;
    sourceDomain: Term;
    directRecursive: boolean;
    binderInfo?: BinderInfo;
  }[] = [];

  for (const [fieldIndex, field] of fields.entries()) {
    const sourceDomain = transparentAnnotationFieldDomainForRecursorSynthesis(field.domain, options);
    const directRecursive = isDirectRecursiveFieldDomain(sourceDomain, familyName, paramCount, fieldIndex, options);
    const containsRecursiveFamily = termContainsFamily(sourceDomain, families);
    const domain = rebaseConstructorFieldDomain(sourceDomain, paramCount, fieldIndex, binders.length, ctorIndex, fieldBinderPositions);
    if (!domain) return undefined;
    const fieldPosition = binders.length;
    binders.push({ kind: "field", domain, binderInfo: field.binderInfo });
    fieldBinderPositions.push(fieldPosition);
    if (directRecursive || containsRecursiveFamily) {
      pendingIH.push({ fieldIndex, fieldPosition, sourceDomain, directRecursive, binderInfo: "explicit" });
    }
  }

  // Lean places induction hypotheses after all constructor fields in a
  // constructor minor premise.  Build recursive-field IH domains only after the
  // complete constructor-field telescope is present.
  for (const pending of pendingIH) {
    const motiveIndex = outerMotiveIndexBeforeMinor + binders.length;
    const fieldTerm = mkBVar(binders.length - 1 - pending.fieldPosition);
    if (pending.directRecursive) {
      binders.push({ kind: "ih", domain: mkApp(mkBVar(motiveIndex), fieldTerm), fieldIndex: pending.fieldIndex, binderInfo: pending.binderInfo });
    } else {
      const ihDomain = simpleHigherOrderIHDomain(pending.sourceDomain, familyName, paramCount, pending.fieldIndex, motiveIndex, fieldTerm, options, binders.length, ctorIndex, fieldBinderPositions);
      if (!ihDomain) return undefined;
      binders.push({ kind: "ih", domain: ihDomain, fieldIndex: pending.fieldIndex, binderInfo: pending.binderInfo });
    }
  }

  const totalMinorBinders = binders.length;
  const motiveIndexInCodomain = outerMotiveIndexBeforeMinor + totalMinorBinders;
  const constructorParamArgs = paramBVars(paramCount, totalMinorBinders + ctorIndex + 1);
  const constructorFieldArgs = fieldBinderPositions.map(position => mkBVar(totalMinorBinders - 1 - position));
  const ctorApplication = mkApps(mkConst(ctor.name, familyLevels), [...constructorParamArgs, ...constructorFieldArgs]);
  let body: Term = mkApp(mkBVar(motiveIndexInCodomain), ctorApplication);
  for (let i = binders.length - 1; i >= 0; i--) body = mkPi(binders[i].domain, body, binders[i].binderInfo ?? "explicit");
  return body;
}


export interface SynthesizedRecursorType { levelParams: Name[]; type: Term }

/**
 * Conservative recursor-type synthesis slice.
 *
 * Supported now:
 * - one non-mutual inductive family,
 * - any number of nondependent uniform parameters,
 * - no indices,
 * - constructor codomain targets the family at exactly the uniform parameters,
 * - constructor field domains are nondependent except for uniform parameters,
 * - direct positive recursive fields get an induction-hypothesis premise.
 *
 * Anything outside that slice returns undefined and remains fail-closed in TypeChecker.
 */
export function synthesizeSimpleRecursorType(ind: CoreMutualInductiveMember, levelParams: readonly Name[], options: RecursorSynthesisOptions = {}): SynthesizedRecursorType | undefined {
  if (ind.numIndices !== 0) return undefined;
  if (constructorCodomain(ind.type).tag !== "sort") return undefined;
  const paramBinders = constructorDomainBinders(ind.type).slice(0, ind.numParams);
  const paramDomains = paramBinders.map(b => b.domain);
  if (paramDomains.length !== ind.numParams) return undefined;
  if (paramDomains.some(domain => containsLooseBVar(domain))) return undefined;

  const { recLevelParams, motiveLevel } = recursorMotiveUniverse(ind, levelParams, options);
  const familyLevels = levelParams.map(levelParam);
  const familyConstUnderParams = mkApps(mkConst(ind.name, familyLevels), paramBVars(ind.numParams, 0));
  const motiveType = mkPi(familyConstUnderParams, { tag: "sort", level: motiveLevel });
  const minorTypes: Term[] = [];
  for (const [i, ctor] of ind.constructors.entries()) {
    const minor = simpleMinorTypeForConstructor(ctor, i, ind.name, familyLevels, ind.numParams, options);
    if (!minor) return undefined;
    minorTypes.push(minor);
  }

  const familyConstBeforeMajor = mkApps(mkConst(ind.name, familyLevels), paramBVars(ind.numParams, ind.constructors.length + 1));
  const motiveIndexInFinalBody = ind.constructors.length + 1;
  let type: Term = mkApp(mkBVar(motiveIndexInFinalBody), mkBVar(0));
  type = mkPi(familyConstBeforeMajor, type);
  for (let i = minorTypes.length - 1; i >= 0; i--) type = mkPi(minorTypes[i], type);
  type = mkPi(motiveType, type, ind.constructors.length === 0 ? "explicit" : "implicit");
  for (let i = paramDomains.length - 1; i >= 0; i--) type = mkPi(paramDomains[i], type, recursorFamilyBinderInfo(paramBinders[i]?.binderInfo, options));
  return { levelParams: recLevelParams, type };
}

function recursiveIndexedIHNamed(
  sourceDomain: Term,
  field: NamedTerm,
  motive: NamedTerm,
  familyName: Name,
  paramCount: number,
  indexCount: number,
  names: readonly Name[],
  options: RecursorSynthesisOptions = {},
): NamedTerm | undefined {
  const normalized = transparencyNormalizeForRecursorSynthesis(sourceDomain, options);
  const head = getAppFn(normalized);
  if (head.tag === "const" && head.name === familyName) {
    const appArgs = getAppArgs(normalized);
    if (appArgs.length !== paramCount + indexCount) return undefined;
    const indices = appArgs.slice(paramCount).map(arg => coreToNamed(arg, names));
    if (indices.some(i => !i)) return undefined;
    return nApps(motive, [...indices as NamedTerm[], field]);
  }
  if (normalized.tag === "pi") {
    const binderName = `_ihx${names.length}`;
    const domain = coreToNamed(normalized.domain, names);
    if (!domain) return undefined;
    const body = recursiveIndexedIHNamed(normalized.body, nApp(field, nVar(binderName)), motive, familyName, paramCount, indexCount, [...names, binderName], options);
    return body ? nPi(binderName, domain, body, normalized.binderInfo) : undefined;
  }
  return undefined;
}

/**
 * Bounded Lean-compatible indexed recursor synthesis for the active
 * pskernel-derived TypeScript kernel.  This covers one non-mutual family with
 * uniform parameters, explicit indices, direct recursive fields, and pointwise
 * higher-order positive fields.  Parameter equality inside recursive field
 * family applications is compared after trusted zeta/universe normalization.
 */
export function synthesizeIndexedRecursorType(ind: CoreMutualInductiveMember, levelParams: readonly Name[], options: RecursorSynthesisOptions = {}): SynthesizedRecursorType | undefined {
  if (ind.numIndices < 0) return undefined;
  const resultSort = constructorCodomain(ind.type);
  if (resultSort.tag !== "sort") return undefined;

  const familyLevels = levelParams.map(levelParam);
  const { recLevelParams, motiveLevel } = recursorMotiveUniverse(ind, levelParams, options);

  let tail = ind.type;
  const paramNames: Name[] = [];
  const indexNames: Name[] = [];
  const paramBindings: { name: Name; domain: NamedTerm; binderInfo?: BinderInfo }[] = [];
  const indexBindings: { name: Name; domain: NamedTerm; binderInfo?: BinderInfo }[] = [];
  for (let p = 0; p < ind.numParams; p++) {
    if (tail.tag !== "pi") return undefined;
    const domain = coreToNamed(tail.domain, paramNames);
    if (!domain) return undefined;
    const name = `p${p}`;
    paramBindings.push({ name, domain, binderInfo: recursorFamilyBinderInfo(tail.binderInfo, options) });
    paramNames.push(name);
    tail = tail.body;
  }
  for (let i = 0; i < ind.numIndices; i++) {
    if (tail.tag !== "pi") return undefined;
    const domain = coreToNamed(tail.domain, [...paramNames, ...indexNames]);
    if (!domain) return undefined;
    const name = `i${i}`;
    indexBindings.push({ name, domain, binderInfo: tail.binderInfo });
    indexNames.push(name);
    tail = tail.body;
  }
  if (tail.tag !== "sort") return undefined;

  const selfAt = (indices: NamedTerm[]) => nApps(nConst(ind.name, familyLevels), [...paramNames.map(nVar), ...indices]);
  const motiveName = "motive";
  const motive = nVar(motiveName);
  const targetIndexBindings = indexBindings.map(b => ({ ...b, binderInfo: recursorFamilyBinderInfo(b.binderInfo, options) }));
  const motiveType = ind.constructors.length === 0
    ? nPi("major0", selfAt(indexNames.map(nVar)), nSort(motiveLevel), "explicit")
    : nPis(indexBindings, nPi("major0", selfAt(indexNames.map(nVar)), nSort(motiveLevel), "explicit"));
  const outer: { name: Name; domain: NamedTerm; binderInfo?: BinderInfo }[] = ind.constructors.length === 0
    ? [...paramBindings, ...targetIndexBindings, { name: motiveName, domain: motiveType, binderInfo: "explicit" }]
    : [...paramBindings, { name: motiveName, domain: motiveType, binderInfo: "implicit" }];

  for (const [ctorIndex, ctor] of ind.constructors.entries()) {
    let ctorTail = ctor.type;
    const names: Name[] = [...paramNames];
    for (let p = 0; p < ind.numParams; p++) {
      if (ctorTail.tag !== "pi") return undefined;
      ctorTail = ctorTail.body;
    }
    const fieldBindings: { name: Name; domain: NamedTerm; binderInfo?: BinderInfo }[] = [];
    const ihBindings: { name: Name; domain: NamedTerm; binderInfo?: BinderInfo }[] = [];
    const fieldVars: NamedTerm[] = [];
    let fieldIndex = 0;
    while (ctorTail.tag === "pi") {
      const fieldName = `a${ctorIndex}_${fieldIndex}`;
      const sourceDomain = ctorTail.domain;
      const domain = coreToNamed(sourceDomain, names);
      if (!domain) return undefined;
      const fieldVar = nVar(fieldName);
      fieldBindings.push({ name: fieldName, domain, binderInfo: ctorTail.binderInfo });
      fieldVars.push(fieldVar);
      if (termContainsFamily(sourceDomain, new Set([ind.name]))) {
        // Lean places induction-hypothesis binders after all constructor fields
        // for a constructor minor premise.  Build the IH from the source-field
        // telescope snapshot, but append it later after every ordinary field,
        // rather than interleaving it immediately after its recursive field.
        const ih = recursiveIndexedIHNamed(sourceDomain, fieldVar, motive, ind.name, ind.numParams, ind.numIndices, names, options);
        if (!ih) return undefined;
        ihBindings.push({ name: `ih${ctorIndex}_${fieldIndex}`, domain: ih, binderInfo: "explicit" });
      }
      names.push(fieldName);
      fieldIndex++;
      ctorTail = ctorTail.body;
    }
    const inner = [...fieldBindings, ...ihBindings];
    const result = zetaNormalizeForRecursorSynthesis(ctorTail);
    const resultHead = getAppFn(result);
    if (resultHead.tag !== "const" || resultHead.name !== ind.name) return undefined;
    const resultArgs = getAppArgs(result);
    if (resultArgs.length !== ind.numParams + ind.numIndices) return undefined;
    const resultIndices = resultArgs.slice(ind.numParams).map(arg => coreToNamed(arg, names));
    if (resultIndices.some(i => !i)) return undefined;
    const ctorApp = nApps(nConst(ctor.name, familyLevels), [...paramNames.map(nVar), ...fieldVars]);
    outer.push({ name: `minor${ctorIndex}`, domain: nPis(inner, nApps(motive, [...resultIndices as NamedTerm[], ctorApp])), binderInfo: "explicit" });
  }

  if (ind.constructors.length !== 0) outer.push(...targetIndexBindings);
  outer.push({ name: "major", domain: selfAt(indexNames.map(nVar)), binderInfo: "explicit" });
  const finalBody = ind.constructors.length === 0 ? nApp(motive, nVar("major")) : nApps(motive, [...indexNames.map(nVar), nVar("major")]);
  const type = lowerNamed(nPis(outer, finalBody));
  return { levelParams: recLevelParams, type };
}


function familyResultIsAlwaysType(ind: CoreMutualInductiveMember): boolean {
  const result = constructorCodomain(ind.type);
  return result.tag === "sort" && isNeverZero(result.level);
}

function mutualRecursorMotiveUniverse(inductives: readonly CoreMutualInductiveMember[], levelParams: readonly Name[]): { recLevelParams: Name[]; motiveLevel: Level } {
  // Lean's mutual recursor is conservative for any block that can live in Prop.
  // If every member is provably Type-valued, introduce a fresh motive universe.
  if (inductives.every(familyResultIsAlwaysType) && inductives.every(ind => inductiveAllowsLargeElimination(ind))) {
    const motiveLevelParam = freshRecursorMotiveLevelParam(levelParams);
    return { recLevelParams: [motiveLevelParam, ...levelParams], motiveLevel: levelParam(motiveLevelParam) };
  }
  return { recLevelParams: [...levelParams], motiveLevel: LevelZero };
}

function recursiveMutualIHNamed(
  sourceDomain: Term,
  field: NamedTerm,
  motiveByFamily: ReadonlyMap<Name, NamedTerm>,
  memberByFamily: ReadonlyMap<Name, CoreMutualInductiveMember>,
  names: readonly Name[],
  options: RecursorSynthesisOptions = {},
): NamedTerm | undefined {
  const normalized = transparencyNormalizeForRecursorSynthesis(sourceDomain, options);
  const head = getAppFn(normalized);
  if (head.tag === "const") {
    const member = memberByFamily.get(head.name);
    const motive = motiveByFamily.get(head.name);
    if (!member || !motive) return undefined;
    const appArgs = getAppArgs(normalized);
    if (appArgs.length !== member.numParams + member.numIndices) return undefined;
    const indices = appArgs.slice(member.numParams).map(arg => coreToNamed(arg, names));
    if (indices.some(i => !i)) return undefined;
    return nApps(motive, [...indices as NamedTerm[], field]);
  }
  if (normalized.tag === "pi") {
    const binderName = `_ihx${names.length}`;
    const domain = coreToNamed(normalized.domain, names);
    if (!domain) return undefined;
    const body = recursiveMutualIHNamed(normalized.body, nApp(field, nVar(binderName)), motiveByFamily, memberByFamily, [...names, binderName]);
    return body ? nPi(binderName, domain, body, normalized.binderInfo) : undefined;
  }
  return undefined;
}

export function synthesizeMutualRecursorTypes(decl: Extract<CoreDeclaration, { kind: "mutualInductive" }>, options: RecursorSynthesisOptions = {}): Map<Name, SynthesizedRecursorType> {
  const out = new Map<Name, SynthesizedRecursorType>();
  if (decl.inductives.length === 0) return out;
  const paramCount = decl.inductives[0].numParams;
  if (decl.inductives.some(ind => ind.numParams !== paramCount)) return out;
  const familyLevels = decl.levelParams.map(levelParam);
  const { recLevelParams, motiveLevel } = mutualRecursorMotiveUniverse(decl.inductives, decl.levelParams);
  const memberByFamily = new Map<Name, CoreMutualInductiveMember>(decl.inductives.map(ind => [ind.name, ind] as const));
  const familyNames = decl.inductives.map(ind => ind.name);

  const paramNames: Name[] = [];
  const paramBindings: { name: Name; domain: NamedTerm; binderInfo?: BinderInfo }[] = [];
  let firstTail = decl.inductives[0].type;
  for (let p = 0; p < paramCount; p++) {
    if (firstTail.tag !== "pi") return out;
    const domain = coreToNamed(firstTail.domain, paramNames);
    if (!domain) return out;
    const name = `p${p}`;
    paramBindings.push({ name, domain, binderInfo: firstTail.binderInfo });
    paramNames.push(name);
    firstTail = firstTail.body;
  }

  const familyAt = (ind: CoreMutualInductiveMember, indices: NamedTerm[]) =>
    nApps(nConst(ind.name, familyLevels), [...paramNames.map(nVar), ...indices]);
  const indexBindingsByFamily = new Map<Name, { name: Name; domain: NamedTerm; binderInfo?: BinderInfo }[]>();
  const motiveNameByFamily = new Map<Name, Name>();
  const motiveByFamily = new Map<Name, NamedTerm>();
  const motiveBindings: { name: Name; domain: NamedTerm; binderInfo?: BinderInfo }[] = [];

  for (const [familyIndex, ind] of decl.inductives.entries()) {
    let tail = ind.type;
    for (let p = 0; p < ind.numParams; p++) {
      if (tail.tag !== "pi") return out;
      tail = tail.body;
    }
    const indexNames: Name[] = [];
    const indexBindings: { name: Name; domain: NamedTerm; binderInfo?: BinderInfo }[] = [];
    for (let i = 0; i < ind.numIndices; i++) {
      if (tail.tag !== "pi") return out;
      const domain = coreToNamed(tail.domain, [...paramNames, ...indexNames]);
      if (!domain) return out;
      const name = `i${familyIndex}_${i}`;
      indexBindings.push({ name, domain, binderInfo: tail.binderInfo });
      indexNames.push(name);
      tail = tail.body;
    }
    if (tail.tag !== "sort") return out;
    indexBindingsByFamily.set(ind.name, indexBindings);
    const motiveName = `motive${familyIndex}`;
    motiveNameByFamily.set(ind.name, motiveName);
    motiveByFamily.set(ind.name, nVar(motiveName));
    const motiveType = nPis(indexBindings, nPi("major0", familyAt(ind, indexNames.map(nVar)), nSort(motiveLevel), "explicit"));
    motiveBindings.push({ name: motiveName, domain: motiveType, binderInfo: "explicit" });
  }

  const minorBindings: { name: Name; domain: NamedTerm; binderInfo?: BinderInfo }[] = [];
  for (const [familyIndex, ind] of decl.inductives.entries()) {
    const motive = motiveByFamily.get(ind.name)!;
    for (const [ctorIndex, ctor] of ind.constructors.entries()) {
      let ctorTail = ctor.type;
      const names: Name[] = [...paramNames];
      for (let p = 0; p < paramCount; p++) {
        if (ctorTail.tag !== "pi") return out;
        ctorTail = ctorTail.body;
      }
      const inner: { name: Name; domain: NamedTerm; binderInfo?: BinderInfo }[] = [];
      const fieldVars: NamedTerm[] = [];
      let fieldIndex = 0;
      while (ctorTail.tag === "pi") {
        const fieldName = `a${familyIndex}_${ctorIndex}_${fieldIndex}`;
        const sourceDomain = ctorTail.domain;
        const domain = coreToNamed(sourceDomain, names);
        if (!domain) return out;
        const fieldVar = nVar(fieldName);
        inner.push({ name: fieldName, domain, binderInfo: ctorTail.binderInfo });
        fieldVars.push(fieldVar);
        if (termContainsFamily(sourceDomain, new Set(familyNames))) {
          const ih = recursiveMutualIHNamed(sourceDomain, fieldVar, motiveByFamily, memberByFamily, names);
          if (!ih) return out;
          inner.push({ name: `ih${familyIndex}_${ctorIndex}_${fieldIndex}`, domain: ih, binderInfo: "explicit" });
        }
        names.push(fieldName);
        fieldIndex++;
        ctorTail = ctorTail.body;
      }
      const result = zetaNormalizeForRecursorSynthesis(ctorTail);
      const resultHead = getAppFn(result);
      if (resultHead.tag !== "const") return out;
      const resultMember = memberByFamily.get(resultHead.name);
      const resultMotive = resultMember ? motiveByFamily.get(resultHead.name) : undefined;
      if (!resultMember || !resultMotive) return out;
      const resultArgs = getAppArgs(result);
      if (resultArgs.length !== resultMember.numParams + resultMember.numIndices) return out;
      const resultIndices = resultArgs.slice(resultMember.numParams).map(arg => coreToNamed(arg, names));
      if (resultIndices.some(i => !i)) return out;
      const ctorApp = nApps(nConst(ctor.name, familyLevels), [...paramNames.map(nVar), ...fieldVars]);
      minorBindings.push({ name: `minor${minorBindings.length}`, domain: nPis(inner, nApps(resultMotive, [...resultIndices as NamedTerm[], ctorApp])), binderInfo: "explicit" });
    }
  }

  for (const ind of decl.inductives) {
    const targetIndices = indexBindingsByFamily.get(ind.name) ?? [];
    const majorType = familyAt(ind, targetIndices.map(b => nVar(b.name)));
    const targetMotive = motiveByFamily.get(ind.name)!;
    const finalBody = nApps(targetMotive, [...targetIndices.map(b => nVar(b.name)), nVar("major")]);
    const type = lowerNamed(nPis([
      ...paramBindings,
      ...motiveBindings,
      ...minorBindings,
      ...targetIndices.map(b => ({ ...b, binderInfo: b.binderInfo ?? "explicit" })),
      { name: "major", domain: majorType, binderInfo: "explicit" },
    ], finalBody));
    out.set(ind.name, { levelParams: recLevelParams, type });
  }
  return out;
}


function constructorCodomain(type: Term): Term {
  let cursor = type;
  while (cursor.tag === "pi") cursor = cursor.body;
  return cursor;
}

function constructorDomains(type: Term): Term[] {
  const domains: Term[] = [];
  let cursor = type;
  while (cursor.tag === "pi") {
    domains.push(cursor.domain);
    cursor = cursor.body;
  }
  return domains;
}

function constructorDomainBinders(type: Term): { domain: Term; binderInfo: BinderInfo }[] {
  const domains: { domain: Term; binderInfo: BinderInfo }[] = [];
  let cursor = type;
  while (cursor.tag === "pi") {
    domains.push({ domain: cursor.domain, binderInfo: cursor.binderInfo ?? "explicit" });
    cursor = cursor.body;
  }
  return domains;
}

function termContainsFamily(term: Term, families: ReadonlySet<Name>): boolean {
  switch (term.tag) {
    case "sort":
    case "bvar":
    case "lit": return false;
    case "const": return families.has(term.name);
    case "app": return termContainsFamily(term.fn, families) || termContainsFamily(term.arg, families);
    case "lam":
    case "pi": return termContainsFamily(term.domain, families) || termContainsFamily(term.body, families);
    case "let": return termContainsFamily(term.type, families) || termContainsFamily(term.value, families) || termContainsFamily(term.body, families);
    case "proj": return termContainsFamily(term.expr, families);
  }
}

export function recursorMetadataForConstructors(constructors: readonly CoreConstructor[], familyNames: readonly Name[], numParams = 0, numIndices = 0): RecursorMetadata {
  const families = new Set(familyNames);
  return {
    trustedBoundary: true,
    status: "stubbed",
    numParams,
    numIndices,
    numMinors: constructors.length,
    rules: constructors.map(c => {
      const domains = constructorDomains(c.type).slice(numParams);
      return {
        ctor: c.name,
        nfields: domains.length,
        recursiveFields: domains.map(domain => {
          const head = getAppFn(zetaNormalizeForRecursorSynthesis(domain));
          return (head.tag === "const" && families.has(head.name)) || termContainsFamily(domain, families);
        }),
        recursiveFieldTypes: domains.map(domain => zetaNormalizeForRecursorSynthesis(domain)),
      };
    }),
  };
}

export function declarationToConstantInfo(decl: CoreDeclaration, options: RecursorSynthesisOptions = {}): ConstantInfo[] {
  switch (decl.kind) {
    case "axiom": return [{ kind: "axiomInfo", name: decl.name, levelParams: decl.levelParams, type: decl.type }];
    case "definition": return [{ kind: "defnInfo", name: decl.name, levelParams: decl.levelParams, type: decl.type, value: decl.value, hints: { kind: decl.reducibility }, safety: "safe" }];
    case "theorem": return [{ kind: "thmInfo", name: decl.name, levelParams: decl.levelParams, type: decl.type, value: decl.value }];
    case "opaque": return [{ kind: "opaqueInfo", name: decl.name, levelParams: decl.levelParams, type: decl.type, value: decl.value }];
    case "example": return [{ kind: "thmInfo", name: decl.name, levelParams: decl.levelParams, type: decl.type, value: decl.value }];
    case "quot": return [{ kind: "quotInfo", name: decl.name, levelParams: decl.levelParams }];
    case "inductive": {
      const member = { name: decl.name, type: decl.type, numParams: decl.numParams, numIndices: decl.numIndices, constructors: decl.constructors };
      const recursor = synthesizeSimpleRecursorType(member, decl.levelParams, options) ?? synthesizeEqRecursorType(member, decl.levelParams) ?? synthesizeIndexedRecursorType(member, decl.levelParams, options);
      return [
        { kind: "inductInfo", name: decl.name, levelParams: decl.levelParams, type: decl.type, numParams: decl.numParams, numIndices: decl.numIndices, constructors: decl.constructors.map(c => c.name) },
        ...decl.constructors.map(c => ({ kind: "ctorInfo" as const, name: c.name, levelParams: decl.levelParams, type: c.type, inductive: decl.name })),
        { kind: "recInfo", name: `${decl.name}.rec`, levelParams: recursor?.levelParams ?? decl.levelParams, type: recursor?.type, metadata: { ...recursorMetadataForConstructors(decl.constructors, [decl.name], decl.numParams, decl.numIndices), status: recursor ? (decl.name === "Eq" ? "typed-eq-indexed" : (decl.numIndices > 0 ? "typed-simple-indexed" : "typed-simple-nonindexed")) : "stubbed" } },
      ];
    }
    case "mutualInductive": {
      const recursors = synthesizeMutualRecursorTypes(decl, options);
      const familyNames = decl.inductives.map(i => i.name);
      const allConstructors = decl.inductives.flatMap(i => i.constructors);
      const ruleFamilies = decl.inductives.flatMap(i => i.constructors.map(() => i.name));
      return decl.inductives.flatMap(ind => {
        const recursor = recursors.get(ind.name);
        const metadata = recursorMetadataForConstructors(allConstructors, familyNames, ind.numParams, ind.numIndices);
        metadata.status = recursor ? (ind.numIndices > 0 ? "typed-simple-indexed" : "typed-simple-nonindexed") : "stubbed";
        metadata.mutual = {
          familyNames,
          recursorNames: familyNames.map(name => `${name}.rec`),
          paramCount: ind.numParams,
          indexCounts: decl.inductives.map(i => i.numIndices),
          ruleFamilies,
          targetFamily: ind.name,
        };
        return [
          { kind: "inductInfo" as const, name: ind.name, levelParams: decl.levelParams, type: ind.type, numParams: ind.numParams, numIndices: ind.numIndices, constructors: ind.constructors.map(c => c.name) },
          ...ind.constructors.map(c => ({ kind: "ctorInfo" as const, name: c.name, levelParams: decl.levelParams, type: c.type, inductive: ind.name })),
          { kind: "recInfo" as const, name: `${ind.name}.rec`, levelParams: recursor?.levelParams ?? decl.levelParams, type: recursor?.type, metadata },
        ];
      });
    }
  }
}

export const portStatus_PSKernel_Declaration = {
  source: "PSKernel/Declaration.lean",
  target: "packages/kernel/src/PSKernel/Declaration.ts",
  status: "partial",
  trustedBoundary: true,
  proofStatus: "not-proven",
} as const;

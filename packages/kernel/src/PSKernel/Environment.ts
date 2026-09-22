import { CoreDeclaration } from "./Declaration";
import { collectConstNames, collectTermLevelParams, pretty, Term, hasMVarOrFVar, containsLooseBVar, getAppFn, getAppArgs, sameTerm, instantiate } from "./Expr";
import { EnvironmentCore, CheckedDeclaration } from "./Environment/Basic";
import { KernelDeclarationError, KernelError, KernelResourceError, KernelTypeError, KernelUnsupportedError } from "./KernelError";
import { LevelZero, isNeverZero, levelDefEqList, levelParam, levelGeq, levelDefEq } from "./Level";
import { expectedEqReflType, expectedEqType, generateQuotientPrimitives, quotientSoundAxiom } from "./Quot";
import { TypeChecker, check, infer, ensureSort, defEq, whnf } from "./TypeChecker";

export interface KernelOptions {
  implementationProfile?: string;
  recursorProfile?: string;
  allowEmptyInductives?: boolean;
  allowProjections?: boolean;
  allowStructureEta?: boolean;
  allowHigherOrderPositiveRecursion?: boolean;
  allowIndexedRecursiveRecursors?: boolean;
  allowIndexedProjections?: boolean;
  allowPropElimination?: boolean;
  allowRecursorK?: boolean;
  allowInductiveUniverseChecks?: boolean;
  allowDependentConstructorFields?: boolean;
  allowTelescopeTerms?: boolean;
  allowMutualInductives?: boolean;
  allowMutualParameters?: boolean;
  allowMutualIndices?: boolean;
  allowHigherOrderMutualRecursion?: boolean;
  allowMutualProp?: boolean;
  allowNestedInductives?: boolean;
  allowNestedParameters?: boolean;
  allowNestedIndices?: boolean;
  allowNestedIndexExpressions?: boolean;
  allowNestedMultipleSpecializations?: boolean;
  allowNestedPolymorphic?: boolean;
  allowNestedIndexedContainers?: boolean;
  allowLeanRecursorMinorOrder?: boolean;
  allowNestedDeeper?: boolean;
  allowNestedDeeperGeneralization?: boolean;
  allowNestedDeeperParameters?: boolean;
  allowNestedDeeperIndices?: boolean;
  allowNestedDeeperPolymorphic?: boolean;
  allowNestedDeeperMultipleFields?: boolean;
  allowNestedDeeperProp?: boolean;
  allowNestedDeeperMultiParameter?: boolean;
  allowNestedDeeperMultiParameterGeneralization?: boolean;
  allowNestedDeeperDependentContainerParameters?: boolean;
  allowUniformParameterDefEq?: boolean;
  allowRecursorFamilyBinderInfo?: boolean;
  [key: string]: unknown;
}

function kernelOptionsForImplementationProfile(profile: string | undefined): KernelOptions {
  const orderedKernelProfiles = [
    "KERNEL-quotients0",
    "KERNEL-empty-inductives0",
    "KERNEL-structure-eta0",
    "KERNEL-inductive-positivity0",
    "KERNEL-indexed-recursors0",
    "KERNEL-indexed-projections0",
    "KERNEL-prop-elimination0",
    "KERNEL-recursor-k0",
    "KERNEL-inductive-universes0",
    "KERNEL-dependent-fields0",
    "KERNEL-telescope-terms0",
    "KERNEL-mutual-inductives0",
    "KERNEL-mutual-parameters0",
    "KERNEL-mutual-indices0",
    "KERNEL-mutual-higher-order0",
    "KERNEL-mutual-prop0",
    "KERNEL-nested-inductives0",
    "KERNEL-nested-parameters0",
    "KERNEL-nested-indices0",
    "KERNEL-nested-index-expressions0",
    "KERNEL-nested-multiple-specializations0",
    "KERNEL-nested-polymorphic0",
    "KERNEL-nested-indexed-containers0",
    "KERNEL-recursor-minor-order0",
    "KERNEL-nested-deeper0",
    "KERNEL-nested-deeper-generalization0",
    "KERNEL-nested-deeper-parameters0",
    "KERNEL-nested-deeper-indices0",
    "KERNEL-nested-deeper-polymorphic0",
    "KERNEL-nested-deeper-multiple-fields0",
    "KERNEL-nested-deeper-prop0",
    "KERNEL-nested-deeper-multi-parameter0",
    "KERNEL-nested-deeper-multi-parameter-generalization0",
    "KERNEL-nested-deeper-dependent-container-parameters0",
    "KERNEL-uniform-parameter-defeq0",
    "KERNEL-recursor-family-binder-info0",
    "KERNEL-dependent-indexed-recursor-completion0",
    "KERNEL-mutual-nested-generalization0",
    "KERNEL-mutual-nested-parameters0",
    "KERNEL-mutual-nested-indices0",
    "KERNEL-mutual-nested-polymorphic0",
    "KERNEL-mutual-nested-prop0",
    "KERNEL-mutual-nested-indexed-containers0",
    "KERNEL-mutual-nested-deeper0",
    "KERNEL-mutual-nested-deeper-parameters0",
    "KERNEL-mutual-nested-deeper-indices0",
    "KERNEL-mutual-nested-deeper-polymorphic0",
    "KERNEL-mutual-nested-deeper-prop0",
    "KERNEL-mutual-nested-deeper-indexed-containers0",
    "KERNEL-mutual-nested-deeper-multi-parameter-containers0",
    "KERNEL-mutual-nested-deeper-dependent-container-parameters0",
    "KERNEL-mutual-nested-deeper-multiple-fields0",
    "KERNEL-mutual-nested-deeper-multiple-recursive-parameter-slots0",
    "KERNEL-mutual-nested-final-generalization-audit0",
    "KERNEL-conversion-final-audit0",
    "KERNEL-resource-bounds0",
    "KERNEL-universe-conformance1",
    "KERNEL-projection-conformance1",
    "KERNEL-level-instantiation-conformance1",
  ];
  const idx = profile ? orderedKernelProfiles.indexOf(profile) : -1;
  if (idx >= 0) {
    const o: KernelOptions = { implementationProfile: profile, recursorProfile: "lean4331" };
    if (idx >= 1) o.allowEmptyInductives = true;
    if (idx >= 2) { o.allowProjections = true; o.allowStructureEta = true; }
    if (idx >= 3) o.allowHigherOrderPositiveRecursion = true;
    if (idx >= 4) o.allowIndexedRecursiveRecursors = true;
    if (idx >= 5) o.allowIndexedProjections = true;
    if (idx >= 6) o.allowPropElimination = true;
    if (idx >= 7) o.allowRecursorK = true;
    if (idx >= 8) o.allowInductiveUniverseChecks = true;
    if (idx >= 9) o.allowDependentConstructorFields = true;
    if (idx >= 10) o.allowTelescopeTerms = true;
    if (idx >= 11) o.allowMutualInductives = true;
    if (idx >= 12) o.allowMutualParameters = true;
    if (idx >= 13) o.allowMutualIndices = true;
    if (idx >= 14) o.allowHigherOrderMutualRecursion = true;
    if (idx >= 15) o.allowMutualProp = true;
    if (idx >= 16) o.allowNestedInductives = true;
    if (idx >= 17) o.allowNestedParameters = true;
    if (idx >= 18) o.allowNestedIndices = true;
    if (idx >= 19) o.allowNestedIndexExpressions = true;
    if (idx >= 20) o.allowNestedMultipleSpecializations = true;
    if (idx >= 21) o.allowNestedPolymorphic = true;
    if (idx >= 22) o.allowNestedIndexedContainers = true;
    if (idx >= 23) o.allowLeanRecursorMinorOrder = true;
    if (idx >= 24) o.allowNestedDeeper = true;
    if (idx >= 25) o.allowNestedDeeperGeneralization = true;
    if (idx >= 26) o.allowNestedDeeperParameters = true;
    if (idx >= 27) o.allowNestedDeeperIndices = true;
    if (idx >= 28) o.allowNestedDeeperPolymorphic = true;
    if (idx >= 29) o.allowNestedDeeperMultipleFields = true;
    if (idx >= 30) o.allowNestedDeeperProp = true;
    if (idx >= 31) o.allowNestedDeeperMultiParameter = true;
    if (idx >= 32) o.allowNestedDeeperMultiParameterGeneralization = true;
    if (idx >= 33) o.allowNestedDeeperDependentContainerParameters = true;
    if (idx >= 34) o.allowUniformParameterDefEq = true;
    if (idx >= 35) o.allowRecursorFamilyBinderInfo = true;
    if (idx >= 55) o.allowResourceBounds = true;
    if (idx >= 56) o.allowProjectionConformance = true;
    if (idx >= 58) o.allowLevelInstantiationConformance = true;
    return o;
  }
  if (profile === "KERNEL-recursor-k0") {
    return {
      implementationProfile: profile,
      recursorProfile: "lean4331",
      allowEmptyInductives: true,
      allowProjections: true,
      allowStructureEta: true,
      allowHigherOrderPositiveRecursion: true,
      allowIndexedRecursiveRecursors: true,
      allowIndexedProjections: true,
      allowPropElimination: true,
      allowRecursorK: true,
    };
  }
  if (profile === "KERNEL-mutual-inductives0") {
    return {
      implementationProfile: profile, recursorProfile: "lean4331", allowEmptyInductives: true, allowProjections: true, allowStructureEta: true,
      allowHigherOrderPositiveRecursion: false, allowIndexedRecursiveRecursors: false, allowIndexedProjections: true, allowPropElimination: true, allowRecursorK: true,
      allowInductiveUniverseChecks: true, allowDependentConstructorFields: true, allowTelescopeTerms: true, allowMutualInductives: true,
    };
  }
  if (profile === "KERNEL-mutual-parameters0") {
    return {
      implementationProfile: profile, recursorProfile: "lean4331", allowEmptyInductives: true, allowProjections: true, allowStructureEta: true,
      allowHigherOrderPositiveRecursion: false, allowIndexedRecursiveRecursors: false, allowIndexedProjections: true, allowPropElimination: true, allowRecursorK: true,
      allowInductiveUniverseChecks: true, allowDependentConstructorFields: true, allowTelescopeTerms: true, allowMutualInductives: true, allowMutualParameters: true,
    };
  }
  if (profile === "KERNEL-mutual-indices0") {
    return {
      implementationProfile: profile, recursorProfile: "lean4331", allowEmptyInductives: true, allowProjections: true, allowStructureEta: true,
      allowHigherOrderPositiveRecursion: false, allowIndexedRecursiveRecursors: true, allowIndexedProjections: true, allowPropElimination: true, allowRecursorK: true,
      allowInductiveUniverseChecks: true, allowDependentConstructorFields: true, allowTelescopeTerms: true, allowMutualInductives: true, allowMutualParameters: true, allowMutualIndices: true,
    };
  }
  if (profile === "KERNEL-mutual-higher-order0") {
    return {
      implementationProfile: profile, recursorProfile: "lean4331", allowEmptyInductives: true, allowProjections: true, allowStructureEta: true,
      allowHigherOrderPositiveRecursion: true, allowIndexedRecursiveRecursors: true, allowIndexedProjections: true, allowPropElimination: true, allowRecursorK: true,
      allowInductiveUniverseChecks: true, allowDependentConstructorFields: true, allowTelescopeTerms: true, allowMutualInductives: true, allowMutualParameters: true, allowMutualIndices: true, allowHigherOrderMutualRecursion: true,
    };
  }
  if (profile === "KERNEL-mutual-prop0") {
    return {
      implementationProfile: profile, recursorProfile: "lean4331", allowEmptyInductives: true, allowProjections: true, allowStructureEta: true,
      allowHigherOrderPositiveRecursion: true, allowIndexedRecursiveRecursors: true, allowIndexedProjections: true, allowPropElimination: true, allowRecursorK: true,
      allowInductiveUniverseChecks: true, allowDependentConstructorFields: true, allowTelescopeTerms: true, allowMutualInductives: true, allowMutualParameters: true, allowMutualIndices: true, allowHigherOrderMutualRecursion: true, allowMutualProp: true,
    };
  }
  if (profile === "KERNEL-level-instantiation-conformance1") {
    return {
      implementationProfile: profile,
      recursorProfile: "lean4331",
      allowEmptyInductives: true,
      allowProjections: true,
      allowStructureEta: true,
      allowHigherOrderPositiveRecursion: true,
      allowIndexedRecursiveRecursors: true,
      allowIndexedProjections: true,
      allowPropElimination: true,
      allowRecursorK: true,
      allowInductiveUniverseChecks: true,
      allowDependentConstructorFields: true,
      allowTelescopeTerms: true,
      allowMutualInductives: true,
      allowUniformParameterDefEq: true,
      allowRecursorFamilyBinderInfo: true,
      allowLeanRecursorMinorOrder: true,
      allowResourceBounds: true,
      allowProjectionConformance: true,
      allowLevelInstantiationConformance: true,
    };
  }
  return {};
}

export class Environment extends EnvironmentCore {
  readonly options: KernelOptions;
  constructor(options: KernelOptions = {}) {
    super();
    const profile = typeof options.implementationProfile === "string" ? options.implementationProfile : undefined;
    this.options = { ...kernelOptionsForImplementationProfile(profile), ...options };
  }

  override addCoreDeclaration(decl: CoreDeclaration, assumptions: Set<string> = new Set()): string[] {
    return super.addCoreDeclaration(decl, assumptions, { allowRecursorFamilyBinderInfo: this.options.allowRecursorFamilyBinderInfo });
  }
}

function validateName(name: string): void {
  if (!name || !name.trim()) throw new KernelDeclarationError("declaration name is empty");
}

function validateUniverseParams(params: readonly string[]): void {
  const seen = new Set<string>();
  for (const p of params) {
    if (!p || !p.trim()) throw new KernelDeclarationError("universe parameter name is empty");
    if (seen.has(p)) throw new KernelDeclarationError(`duplicate universe parameter: ${p}`);
    seen.add(p);
  }
}

function validateDeclaredLevelParams(decl: { name: string; levelParams: string[] }, terms: Term[]): void {
  validateUniverseParams(decl.levelParams);
  const allowed = new Set(decl.levelParams);
  for (const term of terms) {
    for (const p of collectTermLevelParams(term)) {
      if (!allowed.has(p)) throw new KernelDeclarationError(`undeclared universe parameter ${p} in ${decl.name}`);
    }
  }
}

function validateNoMVarFVar(term: Term, what: string): void {
  if (hasMVarOrFVar(term)) throw new KernelTypeError(`${what} contains free variables or metavariables`);
  if (containsLooseBVar(term)) throw new KernelTypeError(`${what} contains loose de Bruijn variables`);
}

export function checkNoMVarNoFVar(term: Term): void { validateNoMVarFVar(term, "trusted Core term"); }

function expectRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new KernelDeclarationError(`${path} must be an object`);
  return value as Record<string, unknown>;
}

function expectShapeName(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) throw new KernelDeclarationError(`${path} must be a nonempty name`);
  return value;
}

function validateShapeNameArray(value: unknown, path: string): void {
  if (!Array.isArray(value)) throw new KernelDeclarationError(`${path} must be an array of names`);
  value.forEach((name, i) => expectShapeName(name, `${path}[${i}]`));
}

function validateBinderInfoShape(value: unknown, path: string): void {
  if (value === undefined) return;
  if (value !== "explicit" && value !== "implicit" && value !== "strictImplicit" && value !== "instImplicit") {
    throw new KernelDeclarationError(`${path} has invalid binderInfo ${String(value)}`);
  }
}

function validateLevelShape(level: unknown, path: string): void {
  const obj = expectRecord(level, path);
  switch (obj.tag) {
    case "zero": return;
    case "succ": return validateLevelShape(obj.of, `${path}.of`);
    case "max":
    case "imax":
      validateLevelShape(obj.left, `${path}.left`);
      validateLevelShape(obj.right, `${path}.right`);
      return;
    case "param":
    case "mvar":
      expectShapeName(obj.name, `${path}.name`);
      return;
    default:
      throw new KernelDeclarationError(`${path} has invalid level tag ${String(obj.tag)}`);
  }
}

function validateTermShape(term: unknown, path: string): void {
  const obj = expectRecord(term, path);
  switch (obj.tag) {
    case "sort":
      validateLevelShape(obj.level, `${path}.level`);
      return;
    case "bvar":
      if (!Number.isSafeInteger(obj.index) || Number(obj.index) < 0) throw new KernelDeclarationError(`${path}.index must be a nonnegative safe integer`);
      return;
    case "const":
      expectShapeName(obj.name, `${path}.name`);
      if (!Array.isArray(obj.levels)) throw new KernelDeclarationError(`${path}.levels must be an array`);
      obj.levels.forEach((level, i) => validateLevelShape(level, `${path}.levels[${i}]`));
      return;
    case "lit":
      if (typeof obj.literal !== "object" || obj.literal === null || Array.isArray(obj.literal)) throw new KernelDeclarationError(`${path}.literal must be an object`);
      {
        const literal = obj.literal as Record<string, unknown>;
        if (literal.tag === "nat") {
          if (!Number.isSafeInteger(literal.value) || Number(literal.value) < 0) throw new KernelDeclarationError(`${path}.literal.value must be a nonnegative safe integer Nat literal`);
          return;
        }
        if (literal.tag === "int") {
          if (typeof literal.value !== "number" || !Number.isSafeInteger(literal.value)) throw new KernelDeclarationError(`${path}.literal.value must be a safe integer Int literal`);
          return;
        }
        if (literal.tag === "str") {
          if (typeof literal.value !== "string") throw new KernelDeclarationError(`${path}.literal.value must be a string`);
          return;
        }
      }
      throw new KernelDeclarationError(`${path}.literal has invalid literal tag`);
    case "app":
      validateTermShape(obj.fn, `${path}.fn`);
      validateTermShape(obj.arg, `${path}.arg`);
      return;
    case "lam":
    case "pi":
      validateTermShape(obj.domain, `${path}.domain`);
      validateTermShape(obj.body, `${path}.body`);
      validateBinderInfoShape(obj.binderInfo, `${path}.binderInfo`);
      return;
    case "let":
      validateTermShape(obj.type, `${path}.type`);
      validateTermShape(obj.value, `${path}.value`);
      validateTermShape(obj.body, `${path}.body`);
      if (typeof obj.nondep !== "boolean") throw new KernelDeclarationError(`${path}.nondep must be boolean`);
      return;
    case "proj":
      expectShapeName(obj.typeName, `${path}.typeName`);
      if (!Number.isSafeInteger(obj.index) || Number(obj.index) < 0) throw new KernelDeclarationError(`${path}.index must be a nonnegative safe integer`);
      validateTermShape(obj.expr, `${path}.expr`);
      return;
    default:
      throw new KernelDeclarationError(`${path} has invalid term tag ${String(obj.tag)}`);
  }
}

function validateConstructorShape(value: unknown, path: string): void {
  const obj = expectRecord(value, path);
  expectShapeName(obj.name, `${path}.name`);
  validateTermShape(obj.type, `${path}.type`);
}

function validateCoreDeclarationShape(value: unknown, path: string): void {
  const obj = expectRecord(value, path);
  expectShapeName(obj.name, `${path}.name`);
  validateShapeNameArray(obj.levelParams, `${path}.levelParams`);
  switch (obj.kind) {
    case "quot": return;
    case "axiom":
      validateTermShape(obj.type, `${path}.type`);
      return;
    case "theorem":
    case "opaque":
    case "example":
      validateTermShape(obj.type, `${path}.type`);
      validateTermShape(obj.value, `${path}.value`);
      return;
    case "definition":
      validateTermShape(obj.type, `${path}.type`);
      validateTermShape(obj.value, `${path}.value`);
      if (obj.reducibility !== "regular" && obj.reducibility !== "abbrev") throw new KernelDeclarationError(`${path}.reducibility must be regular or abbrev`);
      return;
    case "inductive":
      validateTermShape(obj.type, `${path}.type`);
      if (!Number.isSafeInteger(obj.numParams) || Number(obj.numParams) < 0) throw new KernelDeclarationError(`${path}.numParams must be a nonnegative safe integer`);
      if (!Number.isSafeInteger(obj.numIndices) || Number(obj.numIndices) < 0) throw new KernelDeclarationError(`${path}.numIndices must be a nonnegative safe integer`);
      if (!Array.isArray(obj.constructors)) throw new KernelDeclarationError(`${path}.constructors must be an array`);
      obj.constructors.forEach((ctor, i) => validateConstructorShape(ctor, `${path}.constructors[${i}]`));
      return;
    case "mutualInductive":
      if (!Array.isArray(obj.inductives)) throw new KernelDeclarationError(`${path}.inductives must be an array`);
      obj.inductives.forEach((ind, i) => {
        const iobj = expectRecord(ind, `${path}.inductives[${i}]`);
        expectShapeName(iobj.name, `${path}.inductives[${i}].name`);
        validateTermShape(iobj.type, `${path}.inductives[${i}].type`);
        if (!Number.isSafeInteger(iobj.numParams) || Number(iobj.numParams) < 0) throw new KernelDeclarationError(`${path}.inductives[${i}].numParams must be a nonnegative safe integer`);
        if (!Number.isSafeInteger(iobj.numIndices) || Number(iobj.numIndices) < 0) throw new KernelDeclarationError(`${path}.inductives[${i}].numIndices must be a nonnegative safe integer`);
        if (!Array.isArray(iobj.constructors)) throw new KernelDeclarationError(`${path}.inductives[${i}].constructors must be an array`);
        iobj.constructors.forEach((ctor, j) => validateConstructorShape(ctor, `${path}.inductives[${i}].constructors[${j}]`));
      });
      return;
    default:
      throw new KernelDeclarationError(`${path} has invalid declaration kind ${String(obj.kind)}`);
  }
}

function collectDependencyAssumptions(env: Environment, terms: readonly Term[], selfName?: string): Set<string> {
  const assumptions = new Set<string>();
  for (const term of terms) {
    for (const dep of collectConstNames(term)) {
      if (dep === selfName) continue;
      const checked = env.find(dep);
      if (!checked) continue;
      for (const a of checked.assumptions) assumptions.add(a);
    }
  }
  return assumptions;
}


function constructorCodomain(type: Term): Term {
  let cursor = type;
  while (cursor.tag === "pi") cursor = cursor.body;
  return cursor;
}

function validateConstructorTargets(ctorTypes: readonly { name: string; type: Term }[], familyNames: readonly string[]): void {
  const families = new Set(familyNames);
  for (const ctor of ctorTypes) {
    const codomain = constructorCodomain(ctor.type);
    const head = getAppFn(codomain);
    if (head.tag !== "const" || !families.has(head.name)) {
      throw new KernelDeclarationError(`constructor ${ctor.name} codomain must target an inductive family, got ${pretty(codomain)}`);
    }
  }
}


function validateConstructorTargetUniverseArgs(ctorTypes: readonly { name: string; type: Term }[], families: readonly { name: string; levelParams: readonly string[] }[]): void {
  const familyLevels = new Map(families.map(f => [f.name, f.levelParams.map(levelParam)] as const));
  for (const ctor of ctorTypes) {
    const codomain = constructorCodomain(ctor.type);
    const head = getAppFn(codomain);
    if (head.tag !== "const") continue;
    const expectedLevels = familyLevels.get(head.name);
    if (!expectedLevels) continue;
    if (!levelDefEqList(head.levels, expectedLevels)) {
      throw new KernelDeclarationError(`constructor ${ctor.name} codomain uses ${head.name} at non-uniform universe levels; expected declared family levels`);
    }
  }
}


function zetaNormalizeForUniformParameter(term: Term): Term {
  switch (term.tag) {
    case "sort":
    case "bvar":
    case "const":
    case "lit": return term;
    case "app": return { tag: "app", fn: zetaNormalizeForUniformParameter(term.fn), arg: zetaNormalizeForUniformParameter(term.arg) };
    case "lam": return { tag: "lam", domain: zetaNormalizeForUniformParameter(term.domain), body: zetaNormalizeForUniformParameter(term.body), binderInfo: term.binderInfo };
    case "pi": return { tag: "pi", domain: zetaNormalizeForUniformParameter(term.domain), body: zetaNormalizeForUniformParameter(term.body), binderInfo: term.binderInfo };
    case "proj": return { tag: "proj", typeName: term.typeName, index: term.index, expr: zetaNormalizeForUniformParameter(term.expr) };
    case "let": return zetaNormalizeForUniformParameter(instantiate(term.body, term.value));
  }
}

function normalizeForInductiveValidation(env: EnvironmentCore, term: Term): Term {
  const zeta = zetaNormalizeForUniformParameter(term);
  try {
    return whnf(env, [], zeta);
  } catch {
    return zeta;
  }
}

function uniformParameterArgumentMatches(arg: Term | undefined, expectedIndex: number, allowDefEq: boolean): boolean {
  if (!arg) return false;
  if (!allowDefEq) return arg.tag === "bvar" && arg.index === expectedIndex;
  const normalized = zetaNormalizeForUniformParameter(arg);
  return normalized.tag === "bvar" && normalized.index === expectedIndex;
}

function validateConstructorTargetUniformParameters(
  ctorTypes: readonly { name: string; type: Term }[],
  families: readonly { name: string; numParams: number; numIndices: number }[],
  allowUniformParameterDefEq = false,
): void {
  const familyMeta = new Map(families.map(f => [f.name, f] as const));
  for (const ctor of ctorTypes) {
    const codomain = constructorCodomain(ctor.type);
    const head = getAppFn(codomain);
    if (head.tag !== "const") continue;
    const meta = familyMeta.get(head.name);
    if (!meta) continue;
    const args = getAppArgs(codomain);
    const domains = constructorDomains(ctor.type);
    if (domains.length < meta.numParams) {
      throw new KernelDeclarationError(`constructor ${ctor.name} has fewer leading telescope binders than ${head.name} parameters`);
    }
    for (let i = 0; i < meta.numParams; i++) {
      const arg = args[i];
      const expectedIndex = domains.length - 1 - i;
      if (!uniformParameterArgumentMatches(arg, expectedIndex, allowUniformParameterDefEq)) {
        throw new KernelDeclarationError(`constructor ${ctor.name} codomain parameter ${i} is not the uniform family parameter binder #${expectedIndex}`);
      }
    }
  }
}


function validateRecursiveFieldUniformParameters(
  env: EnvironmentCore,
  ctorTypes: readonly { name: string; type: Term }[],
  families: readonly { name: string; numParams: number; numIndices: number }[],
  allowUniformParameterDefEq = false,
  allowIndexedRecursiveRecursors = true,
  allowParameterizedRecursiveFields = true,
): void {
  const familyMeta = new Map(families.map(f => [f.name, f] as const));
  for (const ctor of ctorTypes) {
    const allDomains = constructorDomains(ctor.type);
    const minParams = Math.min(...families.map(f => f.numParams));
    const fieldDomains = allDomains.slice(minParams);
    for (const [fieldIndex, domain] of fieldDomains.entries()) {
      const normalizedDomain = allowUniformParameterDefEq ? normalizeForInductiveValidation(env, domain) : domain;
      const head = getAppFn(normalizedDomain);
      if (head.tag !== "const") continue;
      const meta = familyMeta.get(head.name);
      if (!meta) continue;
      const args = getAppArgs(normalizedDomain);
      for (const [i, arg] of args.entries()) {
        if (termContainsFamily(arg, new Set(familyMeta.keys()))) throw new KernelDeclarationError(`recursive occurrence of ${head.name} inside an index is invalid`);
      }
      if ((meta.numParams > 0 || meta.numIndices > 0) && !allowParameterizedRecursiveFields) throw new KernelUnsupportedError(`recursive fields in parameterized/indexed inductives are unsupported by this kernel profile`);
      if (meta.numIndices > 0 && !allowIndexedRecursiveRecursors) throw new KernelUnsupportedError(`indexed recursive recursors are unsupported by this kernel profile`);
      for (let i = 0; i < meta.numParams; i++) {
        const expectedIndex = fieldIndex + meta.numParams - 1 - i;
        if (!uniformParameterArgumentMatches(args[i], expectedIndex, allowUniformParameterDefEq)) {
          throw new KernelDeclarationError(`non-uniform recursive parameter ${i} of ${head.name}`);
        }
      }
    }
  }
}


function familyResultSortLevel(type: Term) {
  const codomain = familyTelescopeCodomain(type);
  return codomain.tag === "sort" ? codomain.level : undefined;
}

function ambiguousResultUniverseHasOnlySingletonShape(ind: { name: string; type: Term; numParams: number; constructors: readonly { name: string; type: Term }[] }): boolean {
  // Arena/Lean 4.29 exports include singleton `Sort u` families such as PUnit;
  // these are safe because the Prop instantiation has singleton elimination.
  // Multi-constructor or field-bearing ambiguous `Sort u` families are not
  // admitted by this conservative checker path because their exported recursor
  // could otherwise smuggle large elimination when the universe is instantiated
  // to Prop.
  if (ind.constructors.length === 0) return true;
  if (ind.constructors.length !== 1) return false;
  const fields = constructorDomains(ind.constructors[0].type).slice(ind.numParams);
  return fields.length === 0;
}

function validateInductiveResultUniverse(ind: { name: string; type: Term; numParams: number; constructors: readonly { name: string; type: Term }[] }): void {
  const level = familyResultSortLevel(ind.type);
  if (!level) return;
  // Lean rejects or constrains universe-polymorphic inductive result sorts that
  // are not definitionally Prop but can instantiate to Prop, e.g. `Sort u`.
  // Valid data families use levels that are never zero (`Type u`, `max 1 u`).
  // For Arena's Lean 4.29 tutorial compatibility we keep the safe singleton
  // ambiguous case, but reject non-singleton/field-bearing ambiguous families
  // before their recursor can provide unsound large elimination at u = 0.
  if (!levelDefEq(level, LevelZero) && !isNeverZero(level) && !ambiguousResultUniverseHasOnlySingletonShape(ind)) {
    throw new KernelDeclarationError(`${ind.name} has invalid universe polymorphic resulting type: the resulting universe is not Prop, but may be Prop for some parameter values`);
  }
}


function familyParameterDomains(type: Term, numParams: number): Term[] {
  const domains: Term[] = [];
  let cursor = type;
  for (let i = 0; i < numParams; i++) {
    if (cursor.tag !== "pi") throw new KernelDeclarationError(`family parameter telescope arity mismatch while reading parameter ${i}`);
    domains.push(cursor.domain);
    cursor = cursor.body;
  }
  return domains;
}

function validateMutualParameterTelescope(env: Environment, decl: Extract<CoreDeclaration, { kind: "mutualInductive" }>, numParams: number): void {
  if (numParams === 0 || decl.inductives.length <= 1) return;
  const expected = familyParameterDomains(decl.inductives[0].type, numParams);
  for (const ind of decl.inductives.slice(1)) {
    const actual = familyParameterDomains(ind.type, numParams);
    const ctx: Term[] = [];
    for (let i = 0; i < numParams; i++) {
      if (!defEq(env, ctx, actual[i], expected[i])) {
        throw new KernelDeclarationError(`${ind.name} parameter ${i} is not definitionally equal to the shared parameter telescope`);
      }
      ctx.push(expected[i]);
    }
  }
}

function validateMutualProfileCapabilities(env: Environment, decl: Extract<CoreDeclaration, { kind: "mutualInductive" }>): void {
  if (!env.options.allowMutualInductives) throw new KernelUnsupportedError("mutual inductives unavailable in this kernel profile");
  const resultLevels = decl.inductives.map(ind => familyResultSortLevel(ind.type));
  const firstLevel = resultLevels[0];
  if (!firstLevel || resultLevels.some(level => !level || !levelDefEq(firstLevel, level))) {
    throw new KernelDeclarationError("mutual inductive families must live in the same universe");
  }
  const hasParams = decl.inductives.some(ind => ind.numParams > 0);
  if (hasParams && !env.options.allowMutualParameters) throw new KernelUnsupportedError("v24 mutual slice requires numParams=0");
  const firstParamCount = decl.inductives[0]?.numParams ?? 0;
  if (decl.inductives.some(ind => ind.numParams !== firstParamCount)) throw new KernelDeclarationError("mutual inductive families must have the same number of parameters");
  validateMutualParameterTelescope(env, decl, firstParamCount);
  const hasIndices = decl.inductives.some(ind => ind.numIndices > 0);
  if (hasIndices && !env.options.allowMutualIndices) throw new KernelUnsupportedError("mutual indices are outside this kernel profile");
  const hasProp = resultLevels.some(level => level && levelDefEq(level, LevelZero));
  if (hasProp && !env.options.allowMutualProp) throw new KernelUnsupportedError("mutual Prop families are outside this kernel profile");
}

function validateConstructorFieldUniverses(
  preEnv: EnvironmentCore,
  ctorTypes: readonly { name: string; type: Term }[],
  families: readonly { name: string; numParams: number; numIndices: number; type: Term }[],
): void {
  const familyMeta = new Map(families.map(f => [f.name, f] as const));
  const familyResultLevels = new Map(families.map(f => [f.name, familyResultSortLevel(f.type)] as const));
  for (const ctor of ctorTypes) {
    const codomain = constructorCodomain(ctor.type);
    const head = getAppFn(codomain);
    if (head.tag !== "const") continue;
    const target = familyMeta.get(head.name);
    if (!target) continue;
    const familyLevel = familyResultLevels.get(head.name);
    if (!familyLevel) continue;
    // Lean's Prop/Sort 0 impredicativity: constructor fields for a Prop-valued
    // family are not bounded by the family result universe.
    if (levelDefEq(familyLevel, LevelZero)) continue;
    const domains = constructorDomains(ctor.type);
    const ctx: Term[] = [];
    for (const [i, domain] of domains.entries()) {
      if (i >= target.numParams) {
        const fieldSort = ensureSort(preEnv, ctx, infer(preEnv, ctx, domain));
        if (!levelGeq(familyLevel, fieldSort.level)) {
          throw new KernelDeclarationError(`constructor ${ctor.name} has invalid universe level of type_of field ${i}: field lives in ${pretty(fieldSort)}, family result is ${pretty({ tag: "sort", level: familyLevel })}`);
        }
      }
      ctx.push(domain);
    }
  }
}

function validateConstructorDependencies(env: Environment, ctorTypes: readonly { name: string; type: Term }[], familyNames: readonly string[]): void {
  const families = new Set(familyNames);
  for (const ctor of ctorTypes) {
    for (const dep of collectConstNames(ctor.type)) {
      if (families.has(dep)) continue;
      if (!env.has(dep)) throw new KernelDeclarationError(`constructor ${ctor.name} references unknown constant ${dep}`);
    }
  }
}

function validateInductiveCounters(name: string, numParams: number, numIndices: number): void {
  if (!Number.isSafeInteger(numParams) || numParams < 0) throw new KernelDeclarationError(`${name}.numParams must be a nonnegative safe integer`);
  if (!Number.isSafeInteger(numIndices) || numIndices < 0) throw new KernelDeclarationError(`${name}.numIndices must be a nonnegative safe integer`);
}

function familyTelescopeCodomain(type: Term): Term {
  let cursor = type;
  while (cursor.tag === "pi") cursor = cursor.body;
  return cursor;
}

function familyTelescopeArity(type: Term): number {
  let arity = 0;
  let cursor = type;
  while (cursor.tag === "pi") { arity++; cursor = cursor.body; }
  return arity;
}

function validateFamilyTelescopeArity(name: string, type: Term, numParams: number, numIndices: number): void {
  const expected = numParams + numIndices;
  const actual = familyTelescopeArity(type);
  if (actual !== expected) {
    throw new KernelDeclarationError(`${name} family type telescope arity mismatch: expected numParams + numIndices = ${expected}, got ${actual}`);
  }
}

function validateFamilyTelescopeCodomainIsSort(name: string, type: Term): void {
  const codomain = familyTelescopeCodomain(type);
  if (codomain.tag !== "sort") {
    throw new KernelDeclarationError(`${name} family type telescope codomain must be Sort/Type in the current trusted kernel slice, got ${pretty(codomain)}`);
  }
}

function validateConstructorTargetArgumentCount(ctorTypes: readonly { name: string; type: Term }[], familyArity: ReadonlyMap<string, number>): void {
  for (const ctor of ctorTypes) {
    const codomain = constructorCodomain(ctor.type);
    const head = getAppFn(codomain);
    if (head.tag !== "const") continue;
    const expected = familyArity.get(head.name);
    if (expected === undefined) continue;
    const actual = getAppArgs(codomain).length;
    if (actual !== expected) {
      throw new KernelDeclarationError(`constructor ${ctor.name} codomain applies ${head.name} to ${actual} arguments, expected ${expected}`);
    }
  }
}


function validateConstructorResultIndicesNoNestedFamily(
  ctorTypes: readonly { name: string; type: Term }[],
  families: readonly { name: string; numParams: number; numIndices: number }[],
): void {
  const familyMeta = new Map(families.map(f => [f.name, f] as const));
  const familyNames = new Set(families.map(f => f.name));
  for (const ctor of ctorTypes) {
    const codomain = constructorCodomain(ctor.type);
    const head = getAppFn(codomain);
    if (head.tag !== "const") continue;
    const meta = familyMeta.get(head.name);
    if (!meta || meta.numIndices === 0) continue;
    const args = getAppArgs(codomain);
    for (let i = 0; i < meta.numIndices; i++) {
      const indexArg = args[meta.numParams + i];
      if (indexArg && termContainsFamily(indexArg, familyNames)) {
        throw new KernelUnsupportedError(`constructor ${ctor.name} result indices may not contain a mutual family occurrence at index ${i} in this kernel profile`);
      }
    }
  }
}

function termContainsFamily(term: Term, familyNames: ReadonlySet<string>): boolean {
  const head = getAppFn(term);
  if (head.tag === "const" && familyNames.has(head.name)) return true;
  switch (term.tag) {
    case "sort":
    case "bvar":
    case "lit":
    case "const": return false;
    case "app": return termContainsFamily(term.fn, familyNames) || termContainsFamily(term.arg, familyNames);
    case "lam":
    case "pi": return termContainsFamily(term.domain, familyNames) || termContainsFamily(term.body, familyNames);
    case "let": return termContainsFamily(term.type, familyNames) || termContainsFamily(term.value, familyNames) || termContainsFamily(term.body, familyNames);
    case "proj": return termContainsFamily(term.expr, familyNames);
  }
}

function validatePositiveFamilyOccurrence(env: EnvironmentCore, term: Term, familyNames: ReadonlySet<string>, positive: boolean, path: string, allowHigherOrderPositiveRecursion = true): void {
  const normalized = normalizeForInductiveValidation(env, term);
  if (!sameTerm(normalized, term)) return validatePositiveFamilyOccurrence(env, normalized, familyNames, positive, path, allowHigherOrderPositiveRecursion);
  const head = getAppFn(term);
  if (head.tag === "const" && familyNames.has(head.name)) {
    if (!positive) throw new KernelDeclarationError(`${path} contains negative recursive occurrence of ${head.name}`);
    for (const [i, arg] of getAppArgs(term).entries()) {
      if (termContainsFamily(arg, familyNames)) {
        throw new KernelUnsupportedError(`${path} contains recursive occurrence inside inductive target argument ${i}; nested/index-recursive positivity is not implemented in the pskernel TypeScript kernel slice yet`);
      }
    }
    return;
  }
  switch (term.tag) {
    case "sort":
    case "bvar":
    case "lit":
    case "const": return;
    case "app": {
      if (termContainsFamily(term, familyNames)) {
        throw new KernelUnsupportedError(`${path} contains recursive occurrence under an unapplied or unknown type former; nested/container positivity is not implemented in the pskernel TypeScript kernel slice yet`);
      }
      return;
    }
    case "lam":
      throw new KernelUnsupportedError(`${path} contains lambda in constructor field type; positivity for this shape is not implemented`);
    case "pi":
      if (!allowHigherOrderPositiveRecursion && termContainsFamily(term.body, familyNames)) throw new KernelUnsupportedError(`${path} contains non-direct or negative higher-order recursive occurrence; higher-order positivity is disabled`);
      validatePositiveFamilyOccurrence(env, term.domain, familyNames, !positive, `${path}.domain`, allowHigherOrderPositiveRecursion);
      validatePositiveFamilyOccurrence(env, term.body, familyNames, positive, `${path}.body`, allowHigherOrderPositiveRecursion);
      return;
    case "let":
      if (termContainsFamily(term, familyNames)) {
        throw new KernelUnsupportedError(`${path} contains let-bound recursive family occurrence; positivity for this shape is not implemented`);
      }
      return;
    case "proj":
      if (termContainsFamily(term.expr, familyNames)) {
        throw new KernelUnsupportedError(`${path} contains projection over recursive family occurrence; positivity for this shape is not implemented`);
      }
      return;
  }
}

function constructorDomains(type: Term): Term[] {
  const domains: Term[] = [];
  let cursor = type;
  while (cursor.tag === "pi") { domains.push(cursor.domain); cursor = cursor.body; }
  return domains;
}

function validateConstructorPositivity(env: EnvironmentCore, ctorTypes: readonly { name: string; type: Term }[], familyNames: readonly string[], allowHigherOrderPositiveRecursion = true): void {
  const families = new Set(familyNames);
  for (const ctor of ctorTypes) {
    for (const [i, domain] of constructorDomains(ctor.type).entries()) {
      validatePositiveFamilyOccurrence(env, domain, families, true, `constructor ${ctor.name} field ${i}`, allowHigherOrderPositiveRecursion);
    }
  }
}

function makeInductivePreEnvironment(env: Environment, families: readonly { name: string; levelParams: string[]; type: Term }[]): EnvironmentCore {
  const preEnv = env.fork();
  for (const family of families) {
    if (preEnv.has(family.name)) throw new KernelDeclarationError(`duplicate inductive family name: ${family.name}`);
    preEnv.addCoreDeclaration({ kind: "axiom", name: family.name, levelParams: [...family.levelParams], type: family.type }, new Set([family.name]));
  }
  return preEnv;
}

function validateConstructorTypesInferToSort(preEnv: EnvironmentCore, ctorTypes: readonly { name: string; type: Term }[]): void {
  for (const ctor of ctorTypes) {
    try {
      ensureSort(preEnv, [], infer(preEnv, [], ctor.type));
    } catch (e) {
      if (e instanceof KernelError) throw new KernelDeclarationError(`constructor ${ctor.name} type is not a valid type: ${e.message}`);
      throw e;
    }
  }
}

export function checkConstantVal(env: Environment, decl: Extract<CoreDeclaration, { type: Term }>): void {
  validateName(decl.name);
  validateDeclaredLevelParams(decl, "value" in decl ? [decl.type, decl.value] : [decl.type]);
  validateNoMVarFVar(decl.type, `${decl.name} type`);
  const typeType = infer(env, [], decl.type);
  ensureSort(env, [], typeType);
}

export function checkDefinitionBody(env: Environment, decl: Extract<CoreDeclaration, { value: Term; type: Term }>): void {
  checkConstantVal(env, decl);
  validateNoMVarFVar(decl.value, `${decl.name} value`);
  check(env, [], decl.value, decl.type);
}

export function addAxiom(env: Environment, decl: Extract<CoreDeclaration, { kind: "axiom" }>): CheckedDeclaration {
  checkConstantVal(env, decl);
  const assumptions = collectDependencyAssumptions(env, [decl.type], decl.name);
  assumptions.add(decl.name);
  const generated = env.addCoreDeclaration(decl, assumptions);
  return { declaration: decl, assumptions, generated };
}

export function addDefinition(env: Environment, decl: Extract<CoreDeclaration, { kind: "definition" }>): CheckedDeclaration {
  checkDefinitionBody(env, decl);
  const assumptions = collectDependencyAssumptions(env, [decl.type, decl.value], decl.name);
  const generated = env.addCoreDeclaration(decl, assumptions);
  return { declaration: decl, assumptions, generated };
}

export function addTheorem(env: Environment, decl: Extract<CoreDeclaration, { kind: "theorem" | "example" }>): CheckedDeclaration {
  checkDefinitionBody(env, decl);
  const typeType = infer(env, [], decl.type);
  if (!defEq(env, [], typeType, { tag: "sort", level: LevelZero })) {
    throw new KernelTypeError(`${decl.kind} ${decl.name} type must be a proposition (Prop), got type ${pretty(typeType)}`);
  }
  const assumptions = collectDependencyAssumptions(env, [decl.type, decl.value], decl.name);
  const generated = env.addCoreDeclaration(decl, assumptions);
  return { declaration: decl, assumptions, generated };
}

export function addOpaque(env: Environment, decl: Extract<CoreDeclaration, { kind: "opaque" }>): CheckedDeclaration {
  checkDefinitionBody(env, decl);
  const assumptions = collectDependencyAssumptions(env, [decl.type, decl.value], decl.name);
  assumptions.add(decl.name);
  const generated = env.addCoreDeclaration(decl, assumptions);
  return { declaration: decl, assumptions, generated };
}

function addInductiveOrMutual(env: Environment, decl: Extract<CoreDeclaration, { kind: "inductive" | "mutualInductive" }>): CheckedDeclaration {
  if (decl.kind === "inductive") {
    validateName(decl.name);
    validateInductiveCounters(decl.name, decl.numParams, decl.numIndices);
    validateFamilyTelescopeArity(decl.name, decl.type, decl.numParams, decl.numIndices);
    validateFamilyTelescopeCodomainIsSort(decl.name, decl.type);
    validateInductiveResultUniverse(decl);
    validateDeclaredLevelParams(decl, [decl.type, ...decl.constructors.map(c => c.type)]);
    validateNoMVarFVar(decl.type, `${decl.name} type`);
    ensureSort(env, [], infer(env, [], decl.type));
    if (decl.constructors.length === 0 && !env.options.allowEmptyInductives) {
      throw new KernelUnsupportedError("empty inductives unavailable in this kernel profile");
    }
    for (const ctor of decl.constructors) {
      validateName(ctor.name);
      validateNoMVarFVar(ctor.type, `${ctor.name} type`);
    }
    validateConstructorTargets(decl.constructors, [decl.name]);
    validateConstructorTargetArgumentCount(decl.constructors, new Map([[decl.name, decl.numParams + decl.numIndices]]));
    validateConstructorTargetUniverseArgs(decl.constructors, [{ name: decl.name, levelParams: decl.levelParams }]);
    validateConstructorTargetUniformParameters(decl.constructors, [{ name: decl.name, numParams: decl.numParams, numIndices: decl.numIndices }], Boolean(env.options.allowUniformParameterDefEq));
    validateConstructorResultIndicesNoNestedFamily(decl.constructors, [{ name: decl.name, numParams: decl.numParams, numIndices: decl.numIndices }]);
    validateRecursiveFieldUniformParameters(env, decl.constructors, [{ name: decl.name, numParams: decl.numParams, numIndices: decl.numIndices }], Boolean(env.options.allowUniformParameterDefEq), Boolean(env.options.allowIndexedRecursiveRecursors), Boolean(env.options.allowHigherOrderPositiveRecursion));
    validateConstructorPositivity(env, decl.constructors, [decl.name], Boolean(env.options.allowHigherOrderPositiveRecursion));
    validateConstructorDependencies(env, decl.constructors, [decl.name]);
    const preEnv = makeInductivePreEnvironment(env, [{ name: decl.name, levelParams: decl.levelParams, type: decl.type }]);
    if (env.options.allowInductiveUniverseChecks) validateConstructorFieldUniverses(preEnv, decl.constructors, [{ name: decl.name, numParams: decl.numParams, numIndices: decl.numIndices, type: decl.type }]);
    validateConstructorTypesInferToSort(preEnv, decl.constructors);
  } else {
    if (decl.inductives.some(ind => ind.constructors.length === 0) && !env.options.allowEmptyInductives) {
      throw new KernelUnsupportedError("empty inductives unavailable in this kernel profile");
    }
    validateMutualProfileCapabilities(env, decl);
    validateName(decl.name);
    validateUniverseParams(decl.levelParams);
    const families = decl.inductives.map(ind => ({ name: ind.name, levelParams: decl.levelParams, type: ind.type }));
    const familyArity = new Map(decl.inductives.map(ind => [ind.name, ind.numParams + ind.numIndices] as const));
    const preEnv = makeInductivePreEnvironment(env, families);
    for (const ind of decl.inductives) {
      validateName(ind.name);
      validateInductiveCounters(ind.name, ind.numParams, ind.numIndices);
      validateFamilyTelescopeArity(ind.name, ind.type, ind.numParams, ind.numIndices);
      validateFamilyTelescopeCodomainIsSort(ind.name, ind.type);
      validateInductiveResultUniverse(ind);
      validateDeclaredLevelParams({ name: ind.name, levelParams: decl.levelParams }, [ind.type, ...ind.constructors.map(c => c.type)]);
      validateNoMVarFVar(ind.type, `${ind.name} type`);
      ensureSort(env, [], infer(env, [], ind.type));
      for (const ctor of ind.constructors) { validateName(ctor.name); validateNoMVarFVar(ctor.type, `${ctor.name} type`); }
      validateConstructorTargets(ind.constructors, decl.inductives.map(i => i.name));
      validateConstructorTargetArgumentCount(ind.constructors, familyArity);
      validateConstructorTargetUniverseArgs(ind.constructors, decl.inductives.map(i => ({ name: i.name, levelParams: decl.levelParams })));
      validateConstructorTargetUniformParameters(ind.constructors, decl.inductives.map(i => ({ name: i.name, numParams: i.numParams, numIndices: i.numIndices })), Boolean(env.options.allowUniformParameterDefEq));
      validateConstructorResultIndicesNoNestedFamily(ind.constructors, decl.inductives.map(i => ({ name: i.name, numParams: i.numParams, numIndices: i.numIndices })));
      validateRecursiveFieldUniformParameters(env, ind.constructors, decl.inductives.map(i => ({ name: i.name, numParams: i.numParams, numIndices: i.numIndices })), Boolean(env.options.allowUniformParameterDefEq), Boolean(env.options.allowIndexedRecursiveRecursors), Boolean(env.options.allowMutualParameters) || Boolean(env.options.allowMutualIndices) || (Boolean(env.options.allowHigherOrderPositiveRecursion) && Boolean(env.options.allowHigherOrderMutualRecursion)));
      validateConstructorPositivity(env, ind.constructors, decl.inductives.map(i => i.name), Boolean(env.options.allowHigherOrderPositiveRecursion) && Boolean(env.options.allowHigherOrderMutualRecursion));
      validateConstructorDependencies(env, ind.constructors, decl.inductives.map(i => i.name));
      if (env.options.allowInductiveUniverseChecks) validateConstructorFieldUniverses(preEnv, ind.constructors, decl.inductives.map(i => ({ name: i.name, numParams: i.numParams, numIndices: i.numIndices, type: i.type })));
      validateConstructorTypesInferToSort(preEnv, ind.constructors);
    }
  }
  const assumptionTerms = decl.kind === "inductive" ? [decl.type, ...decl.constructors.map(c => c.type)] : decl.inductives.flatMap(ind => [ind.type, ...ind.constructors.map(c => c.type)]);
  const assumptions = collectDependencyAssumptions(env, assumptionTerms, decl.name);
  const generated = env.addCoreDeclaration(decl, assumptions);
  return { declaration: decl, assumptions, generated };
}

function checkQuotDeclaration(env: Environment, decl: Extract<CoreDeclaration, { kind: "quot" }>): CheckedDeclaration {
  if (decl.name !== "Quot") throw new KernelDeclarationError("quotient kernel declaration must be named 'Quot'");
  if (decl.levelParams.length !== 0) throw new KernelDeclarationError("quotient kernel declaration cannot have universe parameters");
  for (const name of ["Quot", "Quot.mk", "Quot.lift", "Quot.ind", "Quot.sound"]) {
    if (env.has(name)) throw new KernelDeclarationError(`cannot initialize quotients: declaration name already exists: ${name}`);
  }
  const eq = env.get("Eq");
  if (!eq || eq.declaration.kind !== "inductive") throw new KernelDeclarationError("cannot initialize quotients: environment does not have inductive 'Eq'");
  if (eq.declaration.levelParams.length !== 1 || eq.declaration.numParams !== 2 || eq.declaration.numIndices !== 1 || eq.declaration.constructors.length !== 1) {
    throw new KernelDeclarationError("cannot initialize quotients: unexpected Eq inductive metadata");
  }
  const levelParamName = eq.declaration.levelParams[0];
  if (!sameTerm(eq.declaration.type, expectedEqType(levelParamName))) throw new KernelDeclarationError("cannot initialize quotients: Eq has unexpected type");
  const eqRefl = env.get(eq.declaration.constructors[0].name);
  if (!eqRefl || eqRefl.declaration.kind !== "constructor" || eqRefl.declaration.name !== "Eq.refl") throw new KernelDeclarationError("cannot initialize quotients: missing Eq.refl constructor");
  if (!sameTerm(eqRefl.declaration.type, expectedEqReflType(levelParamName))) throw new KernelDeclarationError("cannot initialize quotients: Eq.refl has unexpected type");

  const staged = env.fork();
  const generated: string[] = [];
  for (const primitive of generateQuotientPrimitives()) {
    const typeSort = infer(staged, [], primitive.type);
    ensureSort(staged, [], typeSort);
    const assumptions = collectDependencyAssumptions(staged as Environment, [primitive.type], primitive.name);
    staged.addQuotientPrimitive(primitive.name, primitive.levelParams, primitive.type, primitive.quotKind, assumptions);
    generated.push(primitive.name);
  }
  const sound = quotientSoundAxiom();
  checkConstantVal(staged as Environment, sound);
  const soundAssumptions = collectDependencyAssumptions(staged as Environment, [sound.type], sound.name);
  staged.addCoreDeclaration(sound, soundAssumptions);
  generated.push("Quot.sound");
  env.replaceWith(staged);
  return { declaration: decl, assumptions: new Set(), generated };
}

export function checkAndAddDeclaration(env: Environment, decl: CoreDeclaration): CheckedDeclaration {
  validateCoreDeclarationShape(decl, "core declaration");
  if (env.has(decl.name)) throw new KernelDeclarationError(`duplicate declaration: ${decl.name}`);
  switch (decl.kind) {
    case "axiom": return addAxiom(env, decl);
    case "definition": return addDefinition(env, decl);
    case "theorem":
    case "example": return addTheorem(env, decl);
    case "opaque": return addOpaque(env, decl);
    case "inductive":
    case "mutualInductive": return addInductiveOrMutual(env, decl);
    case "quot": return checkQuotDeclaration(env, decl);
  }
}

export { KernelError, KernelResourceError, KernelTypeError, KernelUnsupportedError, TypeChecker };

export const portStatus_PSKernel_Environment = {
  source: "PSKernel/Environment.lean",
  target: "packages/kernel/src/PSKernel/Environment.ts",
  status: "partial",
  trustedBoundary: true,
  proofStatus: "not-proven",
} as const;

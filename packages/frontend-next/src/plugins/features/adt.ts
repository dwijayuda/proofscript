import { parseBinderGroups } from "../../core/binders.js";
import { ProofScriptError } from "../../core/errors.js";
import type { DeclarationElaborationContext, PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import type { IRExpr, IRParam, IRType, IRTypeArgument, SurfaceDecl, SurfaceParam, SurfaceTypeExpr } from "../../core/model.js";
import {
  expectTypeArgument,
  makeTypeVariable,
  nominalType,
  substituteType,
  unifyTypePattern,
  termArgument,
  typeArgument,
  typeArgumentDisplay,
  makeSortType,
  exprKey,
  sameType,
} from "../../core/type-utils.js";
import { familyMatchableKey, type MatchableConstructorParam, type MatchableDescriptor, type MatchableValueRefinement } from "./matchable.js";
import type { PatternMatchSyntaxMetadata } from "./pattern-engine.js";
import { collectSurfaceParamTypeNames, collectSurfaceTypeNames, explicitBinderNames } from "../../core/surface-names.js";
import { declaredTypeFamilySpec } from "../../core/type-family.js";

interface SurfaceVariant {
  readonly name: string;
  readonly params: readonly SurfaceParam[];
  readonly resultType?: SurfaceTypeExpr;
}

interface InductivePayload {
  readonly name: string;
  readonly params: readonly SurfaceParam[];
  readonly resultType?: SurfaceTypeExpr;
  readonly variants: readonly SurfaceVariant[];
  readonly deriving?: readonly string[];
}

interface MutualInductiveSurfacePayload {
  readonly members: readonly SurfaceDecl[];
}

export interface AdtGeneratedApi {
  readonly recursor: string;
  readonly recOn: string;
  readonly casesOn: string;
  readonly constructors: readonly string[];
  readonly numParams: number;
  readonly numIndices: number;
  readonly numMotives: number;
  readonly numMinors: number;
  readonly mutualGroup?: readonly string[];
}

export interface AdtIrField {
  readonly name: string;
  readonly type: IRType;
  readonly binderInfo: IRParam["binderInfo"];
}

export interface AdtIrVariant {
  readonly name: string;
  readonly params: readonly IRParam[];
  readonly fields: readonly AdtIrField[];
  readonly resultType: IRType;
  readonly explicitResult: boolean;
}

export interface AdtDeclPayload {
  /** Fully qualified semantic identity. */
  readonly name: string;
  /** Source basename emitted inside the active namespace. */
  readonly sourceName: string;
  readonly params: readonly IRParam[];
  readonly indices: readonly IRParam[];
  readonly resultSort: IRType;
  readonly explicitResultSort: boolean;
  readonly variants: readonly AdtIrVariant[];
  readonly indexed: boolean;
  readonly deriving?: readonly string[];
  readonly nestedRecursive?: boolean;
  readonly generated: AdtGeneratedApi;
}

export interface AdtMutualDeclPayload {
  readonly members: readonly AdtDeclPayload[];
}

export interface AdtConstructPayload {
  readonly typeName: string;
  readonly variant: string;
  readonly indexed?: boolean;
}

export interface AdtMatchCasePayload {
  readonly variant: string;
  readonly binders: readonly string[];
  readonly fieldNames?: readonly string[];
  /** Branch-local outer index refinements retained for audit/motive reconstruction. */
  readonly indexRefinements?: readonly { readonly name: string; readonly value: IRExpr }[];
}

export interface AdtMatchPayload {
  readonly typeName: string;
  readonly instantiatedTypeName: string;
  readonly cases: readonly AdtMatchCasePayload[];
  readonly matchSyntax?: PatternMatchSyntaxMetadata;
}

interface InductiveHeader {
  readonly params: readonly IRParam[];
  readonly indices: readonly IRParam[];
  readonly resultSort: IRType;
  readonly explicitResultSort: boolean;
  readonly typeLocals: ReadonlyMap<string, IRType>;
  readonly valueLocals: ReadonlyMap<string, IRType>;
  readonly baseArguments: readonly IRTypeArgument[];
  readonly indexed: boolean;
}

function payloadOf(decl: SurfaceDecl): InductivePayload {
  if (decl.kind !== "lean.inductive") throw new ProofScriptError("PS2401", "Invalid declaration passed to inductive plugin.");
  return decl.payload as InductivePayload;
}

function referencedSectionNames(payload: InductivePayload): Set<string> {
  const names = new Set<string>();
  collectSurfaceParamTypeNames(payload.params, names);
  if (payload.resultType) collectSurfaceTypeNames(payload.resultType, names);
  for (const variant of payload.variants) {
    const local = new Set<string>();
    collectSurfaceParamTypeNames(variant.params, local);
    if (variant.resultType) collectSurfaceTypeNames(variant.resultType, local);
    for (const binder of variant.params) local.delete(binder.name);
    for (const name of local) names.add(name);
  }
  return names;
}

function sectionLocalMaps(params: readonly IRParam[]): { typeLocals: Map<string, IRType>; valueLocals: Map<string, IRType> } {
  const typeLocals = new Map<string, IRType>();
  const valueLocals = new Map<string, IRType>();
  for (const param of params) {
    if (param.isTypeParam) typeLocals.set(param.name, makeTypeVariable(param.name, param.type));
    else valueLocals.set(param.name, param.type);
  }
  return { typeLocals, valueLocals };
}

function adtType(name: string, args: readonly IRTypeArgument[]): IRType {
  const rendered = args.map(typeArgumentDisplay).join(",");
  return nominalType(
    rendered.length === 0 ? name : `${name}(${args.map((arg) => `${arg.kind}:${typeArgumentDisplay(arg)}`).join(",")})`,
    rendered.length === 0 ? name : `${name}(${rendered})`,
    `core.adt:${name}`,
    args,
  );
}

function isTypeSort(type: IRType): boolean { return type.form === "sort" && type.family === "lean.sort"; }

function withTelescopeLocals<T>(
  context: DeclarationElaborationContext,
  typeLocals: ReadonlyMap<string, IRType>,
  valueLocals: ReadonlyMap<string, IRType>,
  fn: () => T,
): T {
  return context.withTypeLocals(typeLocals, () => context.withLocals(valueLocals, fn));
}

function elaborateParams(
  surfaceParams: readonly SurfaceParam[],
  context: DeclarationElaborationContext,
  initialTypes: ReadonlyMap<string, IRType> = new Map(),
  initialValues: ReadonlyMap<string, IRType> = new Map(),
): { readonly params: IRParam[]; readonly typeLocals: Map<string, IRType>; readonly valueLocals: Map<string, IRType> } {
  const typeLocals = new Map(initialTypes);
  const valueLocals = new Map(initialValues);
  const params: IRParam[] = [];
  for (const surface of surfaceParams) {
    const type = withTelescopeLocals(context, typeLocals, valueLocals, () => context.resolveTypeExpression(surface.type));
    const isTypeParam = isTypeSort(type);
    if (isTypeParam && surface.binderInfo === "instance") {
      throw new ProofScriptError("PS2420", `Type parameter '${surface.name}' cannot use an instance binder.`);
    }
    const param: IRParam = {
      name: surface.name,
      type,
      binderInfo: surface.binderInfo,
      ...(isTypeParam ? { isTypeParam: true } : {}),
    };
    params.push(param);
    if (isTypeParam) typeLocals.set(surface.name, makeTypeVariable(surface.name, type));
    else valueLocals.set(surface.name, type);
  }
  return { params, typeLocals, valueLocals };
}

function flattenResultIndices(result: IRType, context: DeclarationElaborationContext): { indices: IRParam[]; tail: IRType } {
  const indices: IRParam[] = [];
  let current = result;
  while (current.form === "pi") {
    if (!current.domain || !current.codomain || !current.binder) throw new ProofScriptError("PS2421", "Malformed Pi type in inductive result telescope.");
    const name = current.binder.name === "_" ? `_index${indices.length + 1}` : current.binder.name;
    indices.push({ ...current.binder, name, type: current.domain, isTypeParam: false });
    current = current.codomain;
  }
  if (!isTypeSort(current)) {
    throw new ProofScriptError("PS2422", `The current indexed-inductive slice requires the result telescope to end in Type; got '${current.displayName}'.`);
  }
  return { indices, tail: current };
}

function argumentForParam(param: IRParam): IRTypeArgument {
  return param.isTypeParam
    ? typeArgument(makeTypeVariable(param.name, param.type))
    : termArgument({ kind: "var", name: param.name, type: param.type });
}

function familySubstitutions(params: readonly IRParam[], args: readonly IRTypeArgument[]) {
  const types = new Map<string, IRType>();
  const values = new Map<string, IRExpr>();
  params.forEach((param, index) => {
    const arg = args[index];
    if (!arg) return;
    if (param.isTypeParam && arg.kind === "type") types.set(param.name, arg.value);
    if (!param.isTypeParam && arg.kind === "term") values.set(param.name, arg.value);
  });
  return { types, values };
}

function elaborateHeader(payload: InductivePayload, context: DeclarationElaborationContext): InductiveHeader {
  const sectionParams = context.selectSectionVariables(referencedSectionNames(payload), explicitBinderNames(payload.params));
  const sectionLocals = sectionLocalMaps(sectionParams);
  const explicit = elaborateParams(payload.params, context, sectionLocals.typeLocals, sectionLocals.valueLocals);
  const base = { params: [...sectionParams, ...explicit.params], typeLocals: explicit.typeLocals, valueLocals: explicit.valueLocals };
  const baseArguments = base.params.map(argumentForParam);

  let indices: IRParam[] = [];
  let resultSort: IRType = makeSortType("Type");
  if (payload.resultType) {
    const result = withTelescopeLocals(context, base.typeLocals, base.valueLocals, () => context.resolveTypeExpression(payload.resultType!));
    const flattened = flattenResultIndices(result, context);
    indices = flattened.indices;
    resultSort = flattened.tail;
  }
  return {
    params: base.params,
    indices,
    resultSort,
    explicitResultSort: payload.resultType !== undefined,
    typeLocals: base.typeLocals,
    valueLocals: base.valueLocals,
    baseArguments,
    indexed: indices.length > 0,
  };
}

function elaborateVariants(
  payload: InductivePayload,
  semanticName: string,
  header: InductiveHeader,
  context: DeclarationElaborationContext,
): readonly AdtIrVariant[] {
  const variants: AdtIrVariant[] = [];
  for (const variant of payload.variants) {
    const local = elaborateParams(variant.params, context, header.typeLocals, header.valueLocals);
    let resultType: IRType;
    if (variant.resultType) {
      resultType = withTelescopeLocals(context, local.typeLocals, local.valueLocals, () => context.resolveTypeExpression(variant.resultType!));
    } else {
      if (header.indexed) {
        throw new ProofScriptError("PS2423", `Constructor '${payload.name}.${variant.name}' of an indexed inductive requires an explicit result type in the current slice.`);
      }
      resultType = adtType(semanticName, header.baseArguments);
    }
    if (resultType.family !== `core.adt:${semanticName}`) {
      throw new ProofScriptError("PS2424", `Constructor '${payload.name}.${variant.name}' must return '${payload.name}(...)', got '${resultType.displayName}'.`);
    }
    const fields = local.params
      .filter((param) => !param.isTypeParam)
      .map((param) => ({ name: param.name, type: param.type, binderInfo: param.binderInfo }));
    variants.push({ name: variant.name, params: local.params, fields, resultType, explicitResult: variant.resultType !== undefined });
  }
  return variants;
}


function patternVisibleFields(variant: AdtIrVariant): readonly AdtIrField[] {
  return variant.fields.filter((field) => field.binderInfo === "explicit");
}

function sameArgument(left: IRTypeArgument, right: IRTypeArgument): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === "type" && right.kind === "type") return sameType(left.value, right.value);
  if (left.kind === "term" && right.kind === "term") return exprKey(left.value) === exprKey(right.value);
  return false;
}

function generalIndexedVariant(
  decl: AdtDeclPayload,
  variant: AdtIrVariant,
  type: IRType,
  uniformTypes: ReadonlyMap<string, IRType>,
  uniformValues: ReadonlyMap<string, IRExpr>,
) {
  if (!decl.indexed || type.family !== `core.adt:${decl.name}`) return undefined;
  const typeSubs = new Map(uniformTypes);
  const valueSubs = new Map(uniformValues);
  const constructorParams: MatchableConstructorParam[] = [];
  const visibleFields = patternVisibleFields(variant);
  const visibleIndex = new Map(visibleFields.map((field, index) => [field.name, index] as const));

  // Give every constructor-local parameter a collision-free symbolic identity.
  // These placeholders are alpha-renamed again by the pattern compiler for each
  // concrete branch occurrence, so nested matches cannot capture each other.
  for (let index = 0; index < variant.params.length; index += 1) {
    const param = variant.params[index]!;
    const placeholder = `__ps_ctor_${decl.name.replace(/[^A-Za-z0-9_]/g, "_")}_${variant.name}_${index}_${param.name}`;
    const paramType = substituteType(param.type, typeSubs, valueSubs);
    constructorParams.push({
      placeholder,
      sourceName: param.name,
      type: paramType,
      binderInfo: param.binderInfo,
      ...(param.isTypeParam ? { isTypeParam: true } : {}),
      ...(!param.isTypeParam && visibleIndex.has(param.name) ? { visibleFieldIndex: visibleIndex.get(param.name)! } : {}),
    });
    if (param.isTypeParam) typeSubs.set(param.name, makeTypeVariable(placeholder, paramType));
    else valueSubs.set(param.name, { kind: "var", name: placeholder, type: paramType });
  }

  const result = substituteType(variant.resultType, typeSubs, valueSubs);
  const resultArgs = result.args ?? [];
  const actualArgs = type.args ?? [];
  if (resultArgs.length !== actualArgs.length || resultArgs.length < decl.params.length + decl.indices.length) return undefined;

  for (let index = 0; index < decl.params.length; index += 1) {
    if (!sameArgument(resultArgs[index]!, actualArgs[index]!)) return undefined;
  }

  const refinements = new Map<string, IRExpr>();
  for (let offset = 0; offset < decl.indices.length; offset += 1) {
    const index = decl.params.length + offset;
    const patternArg = resultArgs[index]!;
    const actualArg = actualArgs[index]!;
    if (patternArg.kind !== "term" || actualArg.kind !== "term") return undefined;
    if (exprKey(patternArg.value) === exprKey(actualArg.value)) continue;
    // v0.37's general-refinement tranche refines a free outer index local.
    // More complicated equations (e.g. f n = k+1) remain motive/equality-solver work.
    if (actualArg.value.kind !== "var") return undefined;
    const prior = refinements.get(actualArg.value.name);
    if (prior && exprKey(prior) !== exprKey(patternArg.value)) return undefined;
    refinements.set(actualArg.value.name, patternArg.value);
  }

  return {
    name: variant.name,
    fields: visibleFields.map((field) => substituteType(field.type, typeSubs, valueSubs)),
    fieldNames: visibleFields.map((field) => field.name),
    constructorParams,
    valueRefinements: [...refinements].map(([name, value]) => ({ name, value } satisfies MatchableValueRefinement)),
  };
}

function matchableDescriptorForDecl(decl: AdtDeclPayload): MatchableDescriptor {
  return {
    matchOperation: "lean.inductive.match",
    variantsFor(type) {
      const actualArgs = type.args ?? [];
      const uniformArgs = actualArgs.slice(0, decl.params.length);
      const uniform = familySubstitutions(decl.params, uniformArgs);

      return decl.variants.flatMap((variant) => {
        // First retain the v0.36 specialized path: constructor-local indices are
        // solved directly from an already-specialized scrutinee such as Vec A (n+1).
        const typeSubs = new Map(uniform.types);
        const valueSubs = new Map(uniform.values);
        const inferableValues = new Set(variant.params.filter((param) => !param.isTypeParam).map((param) => param.name));
        const resultPattern = substituteType(variant.resultType, typeSubs, valueSubs);
        if (!decl.indexed || unifyTypePattern(resultPattern, type, typeSubs, valueSubs, inferableValues)) {
          const visible = patternVisibleFields(variant);
          return [{
            name: variant.name,
            fields: visible.map((field) => substituteType(field.type, typeSubs, valueSubs)),
            fieldNames: visible.map((field) => field.name),
          }];
        }

        // General indexed elimination: instead of declaring the constructor
        // impossible when the scrutinee carries a variable index, return a
        // branch-local refinement (e.g. n := 0 / n := k+1 for Vector A n).
        const general = generalIndexedVariant(decl, variant, type, uniform.types, uniform.values);
        return general ? [general] : [];
      });
    },
  };
}


function mutualPayloadOf(decl: SurfaceDecl): MutualInductiveSurfacePayload {
  if (decl.kind !== "lean.mutual.inductives") throw new ProofScriptError("PS2430", "Invalid declaration passed to mutual-inductive elaborator.");
  return decl.payload as MutualInductiveSurfacePayload;
}

function declareAdtFamily(semanticName: string, header: InductiveHeader, context: DeclarationElaborationContext): void {
  const familyParams = [
    ...header.params.map((param) => param.isTypeParam
      ? ({ kind: "type" } as const)
      : ({ kind: "term", expectedType: () => param.type } as const)),
    ...header.indices.map((indexParam) => ({
      kind: "term" as const,
      expectedType(prior: readonly IRTypeArgument[]) {
        const substitutions = familySubstitutions(header.params, prior);
        return substituteType(indexParam.type, substitutions.types, substitutions.values);
      },
    })),
  ];
  if (familyParams.length === 0) context.declareType(semanticName, semanticName, `core.adt:${semanticName}`);
  else context.declareTypeFamily(semanticName, declaredTypeFamilySpec({
    schema: "proofscript.type-family/v1",
    name: semanticName,
    family: `core.adt:${semanticName}`,
    params: [...header.params, ...header.indices],
  }));
}

function typeContainsFamily(type: IRType, families: ReadonlySet<string>): boolean {
  if (type.family && families.has(type.family)) return true;
  if (type.form === "pi") return (!!type.domain && typeContainsFamily(type.domain, families)) || (!!type.codomain && typeContainsFamily(type.codomain, families));
  return (type.args ?? []).some((arg) => arg.kind === "type" && typeContainsFamily(arg.value, families));
}

function isKnownPositiveContainer(type: IRType): boolean {
  const family = type.family ?? "";
  return family.startsWith("core.adt:") || family === "core.option";
}

function validateStrictPositiveType(type: IRType, recursiveFamilies: ReadonlySet<string>, location: string): void {
  if (type.family && recursiveFamilies.has(type.family)) return;
  if (type.form === "pi") {
    if (!type.domain || !type.codomain) throw new ProofScriptError("PS2431", `Malformed function type while checking positivity of ${location}.`);
    if (typeContainsFamily(type.domain, recursiveFamilies)) {
      throw new ProofScriptError("PS2432", `Strict positivity violation in ${location}: a mutually/recursively declared inductive occurs to the left of a function arrow.`);
    }
    validateStrictPositiveType(type.codomain, recursiveFamilies, location);
    return;
  }
  const recursiveTypeArgs = (type.args ?? []).filter((arg) => arg.kind === "type" && typeContainsFamily(arg.value, recursiveFamilies));
  if (recursiveTypeArgs.length > 0 && !isKnownPositiveContainer(type)) {
    throw new ProofScriptError("PS2433", `Strict positivity for ${location} cannot justify a recursive occurrence underneath non-inductive type constructor '${type.displayName}'.`);
  }
  for (const arg of type.args ?? []) if (arg.kind === "type") validateStrictPositiveType(arg.value, recursiveFamilies, location);
}

function hasNestedRecursiveOccurrence(type: IRType, recursiveFamilies: ReadonlySet<string>, depth = 0): boolean {
  if (type.family && recursiveFamilies.has(type.family)) return depth > 0;
  if (type.form === "pi") return (!!type.domain && hasNestedRecursiveOccurrence(type.domain, recursiveFamilies, depth + 1)) || (!!type.codomain && hasNestedRecursiveOccurrence(type.codomain, recursiveFamilies, depth + 1));
  return (type.args ?? []).some((arg) => arg.kind === "type" && hasNestedRecursiveOccurrence(arg.value, recursiveFamilies, depth + 1));
}

function validatePositivity(declarations: readonly AdtDeclPayload[]): void {
  const recursiveFamilies = new Set(declarations.map((decl) => `core.adt:${decl.name}`));
  for (const declaration of declarations) {
    for (const variant of declaration.variants) {
      for (const param of variant.params) {
        validateStrictPositiveType(param.type, recursiveFamilies, `constructor '${declaration.sourceName}.${variant.name}' parameter '${param.name}'`);
      }
    }
  }
}

function validateMutualHeaders(entries: readonly { readonly payload: InductivePayload; readonly header: InductiveHeader }[]): void {
  const first = entries[0]!;
  for (const current of entries.slice(1)) {
    if (current.header.params.length !== first.header.params.length) {
      throw new ProofScriptError("PS2434", `Mutual inductive '${current.payload.name}' must have the same number of parameters as '${first.payload.name}'.`);
    }
    const typeRenames = new Map<string, IRType>();
    const valueRenames = new Map<string, IRExpr>();
    for (let index = 0; index < first.header.params.length; index += 1) {
      const left = first.header.params[index]!;
      const right = current.header.params[index]!;
      const normalizedRightType = substituteType(right.type, typeRenames, valueRenames);
      if (left.binderInfo !== right.binderInfo || !!left.isTypeParam !== !!right.isTypeParam || !sameType(left.type, normalizedRightType)) {
        throw new ProofScriptError("PS2435", `Mutual inductive parameter #${index + 1} of '${current.payload.name}' must match the corresponding parameter of '${first.payload.name}'.`);
      }
      if (right.isTypeParam) typeRenames.set(right.name, makeTypeVariable(left.name, left.type));
      else valueRenames.set(right.name, { kind: "var", name: left.name, type: left.type });
    }
    if (!sameType(current.header.resultSort, first.header.resultSort)) {
      throw new ProofScriptError("PS2436", `All inductive types in a mutual group must inhabit the same result universe; '${current.payload.name}' has '${current.header.resultSort.displayName}' while '${first.payload.name}' has '${first.header.resultSort.displayName}'.`);
    }
  }
}


function beqRequirementTypesForAdt(declPayload: AdtDeclPayload, subject: IRType): IRType[] {
  const requirements: IRType[] = [];
  const seen = new Set<string>();
  const add = (type: IRType) => {
    if (["Nat", "Bool", "String"].includes(type.id)) return;
    if (type.family === subject.family) return; // recursive self equality needs a recursive derived dictionary, still deferred.
    const key = type.id;
    if (seen.has(key)) return;
    seen.add(key);
    requirements.push(type);
  };
  for (const variant of declPayload.variants) {
    for (const param of variant.params) {
      if (!param.isTypeParam && param.binderInfo === "explicit") add(param.type);
    }
  }
  return requirements;
}

function installAdtDeclaration(declPayload: AdtDeclPayload, context: DeclarationElaborationContext): void {
  context.declareSemanticInfo(familyMatchableKey(`core.adt:${declPayload.name}`), matchableDescriptorForDecl(declPayload));
  context.declareSemanticInfo(`adt.decl:${declPayload.name}`, declPayload);
  context.declareSemanticInfo(`adt.generated:${declPayload.name}`, declPayload.generated);
  if (declPayload.deriving?.length) context.declareSemanticInfo(`adt.deriving:${declPayload.name}`, declPayload.deriving);
  if (declPayload.deriving?.includes("BEq") && declPayload.indices.length === 0 && declPayload.params.every((param) => param.isTypeParam) && context.getClass("BEq")) {
    const typeParams = declPayload.params;
    const subjectArgs = typeParams.map((param) => typeArgument(makeTypeVariable(param.name, param.type)));
    const subject = nominalType(
      subjectArgs.length ? `${declPayload.name}(${subjectArgs.map((arg) => `type:${typeArgumentDisplay(arg)}`).join(",")})` : declPayload.name,
      subjectArgs.length ? `${declPayload.name}(${subjectArgs.map(typeArgumentDisplay).join(",")})` : declPayload.name,
      `core.adt:${declPayload.name}`,
      subjectArgs,
    );
    const resultType = nominalType(`BEq(type:${subject.displayName})`, `BEq(${subject.displayName})`, "lean.class:BEq", [typeArgument(subject)]);
    const requirements = beqRequirementTypesForAdt(declPayload, subject);
    const prerequisiteParams: IRParam[] = requirements.map((requirement, index) => {
      const beqType = nominalType(`BEq(type:${requirement.displayName})`, `BEq(${requirement.displayName})`, "lean.class:BEq", [typeArgument(requirement)]);
      return { name: `__beq_req_${index}`, type: beqType, binderInfo: "instance" as const };
    });
    context.declareInstanceCandidate({
      name: `${declPayload.name}.__derived_BEq`,
      params: [...typeParams.map((param) => ({ ...param, binderInfo: "implicit" as const })), ...prerequisiteParams],
      resultType, priority: 1000,
      derived: { handler: "BEq", subject, ...(requirements.length ? { requirements } : {}) },
    });
  }
  for (const variant of declPayload.variants) {
    const constructorUniformParams: IRParam[] = declPayload.params.map((param) => ({ ...param, binderInfo: param.isTypeParam ? "implicit" : param.binderInfo }));
    context.declareFunction(
      `${declPayload.name}.${variant.name}`,
      [...constructorUniformParams, ...variant.params],
      variant.resultType,
      {
        operation: declPayload.indexed ? "lean.inductive.indexed.construct" : "lean.inductive.construct",
        payload: { typeName: declPayload.name, variant: variant.name, ...(declPayload.indexed ? { indexed: true } : {}) } satisfies AdtConstructPayload,
      },
    );
  }
}

function makeNormalizedAdt(payload: InductivePayload, semanticName: string, header: InductiveHeader, variants: readonly AdtIrVariant[], mutualNames?: readonly string[], mutualMinorCount?: number): AdtDeclPayload {
  const recursiveFamilies = new Set((mutualNames ?? [semanticName]).map((name) => `core.adt:${name}`));
  const nestedRecursive = variants.some((variant) => variant.params.some((param) => hasNestedRecursiveOccurrence(param.type, recursiveFamilies)));
  return {
    name: semanticName,
    sourceName: payload.name,
    params: header.params,
    indices: header.indices,
    resultSort: header.resultSort,
    explicitResultSort: header.explicitResultSort,
    variants,
    indexed: header.indexed,
    ...(payload.deriving?.length ? { deriving: payload.deriving } : {}),
    ...(nestedRecursive ? { nestedRecursive: true } : {}),
    generated: {
      recursor: `${semanticName}.rec`,
      recOn: `${semanticName}.recOn`,
      casesOn: `${semanticName}.casesOn`,
      constructors: variants.map((variant) => `${semanticName}.${variant.name}`),
      numParams: header.params.length,
      numIndices: header.indices.length,
      numMotives: mutualNames?.length ?? 1,
      numMinors: mutualMinorCount ?? variants.length,
      ...(mutualNames ? { mutualGroup: mutualNames } : {}),
    },
  };
}

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.adt",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.inductive.decl", "lean.inductive.indexed.decl", "lean.inductive.mutual.decl", "lean.inductive.construct", "lean.inductive.indexed.construct", "lean.inductive.match"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  setup(registry) {
    registry.registerSemanticInterfaceCodec({
      id: "proofscript.adt.matchable",
      version: "4",
      matches(key, value) {
        return key.startsWith("proofscript.matchable.family:core.adt:") && !!value && typeof value === "object" && typeof (value as { variantsFor?: unknown }).variantsFor === "function";
      },
      serialize(key, _value, context) {
        const semanticName = key.slice("proofscript.matchable.family:core.adt:".length);
        const decl = context.moduleInterface.semanticInfo.find((item) => item.key === `adt.decl:${semanticName}`)?.value;
        if (!decl) throw new ProofScriptError("PS2416", `Cannot serialize ADT match metadata for '${semanticName}' without its adt.decl descriptor.`);
        return decl;
      },
      validate(key, payload) {
        const semanticName = key.slice("proofscript.matchable.family:core.adt:".length);
        const decl = payload as Partial<AdtDeclPayload> | undefined;
        if (!decl || decl.name !== semanticName || !Array.isArray(decl.params) || !Array.isArray(decl.variants) || typeof decl.indexed !== "boolean" || !decl.generated || typeof decl.generated.recursor !== "string" || !Array.isArray(decl.generated.constructors)) {
          throw new ProofScriptError("PS2417", `Invalid serialized ADT match metadata for '${semanticName}'.`);
        }
      },
      rehydrate(_key, payload) {
        return matchableDescriptorForDecl(payload as AdtDeclPayload);
      },
    });
    registry.registerDeclarationSyntax({
      keyword: "inductive",
      parse(cursor) {
        const name = cursor.parseIdentifier();
        const params = parseBinderGroups(cursor);
        let resultType: SurfaceTypeExpr | undefined;
        if (cursor.peek(":")) {
          cursor.consume(":");
          resultType = cursor.parseTypeExpression();
        }
        cursor.expect("{");
        const variants: SurfaceVariant[] = [];
        while (!cursor.peek("}")) {
          cursor.expect("|");
          const variant = cursor.parseIdentifier();
          const variantParams = parseBinderGroups(cursor);
          let variantResult: SurfaceTypeExpr | undefined;
          if (cursor.peek(":")) {
            cursor.consume(":");
            variantResult = cursor.parseTypeExpression();
          }
          cursor.expect(";");
          variants.push({ name: variant, params: variantParams, ...(variantResult ? { resultType: variantResult } : {}) });
        }
        cursor.expect("}");
        const deriving: string[] = [];
        if (cursor.peek("deriving")) {
          cursor.consume("deriving");
          deriving.push(cursor.parseIdentifier());
          while (cursor.peek(",")) { cursor.consume(","); deriving.push(cursor.parseIdentifier()); }
        }
        return { kind: "lean.inductive", payload: { name, params, ...(resultType ? { resultType } : {}), variants, ...(deriving.length ? { deriving } : {}) } satisfies InductivePayload };
      },
    });

    registry.registerDeclarationElaborator({
      kind: "lean.inductive",
      declare(decl, context) {
        const payload = payloadOf(decl);
        const semanticName = context.qualifyName(payload.name);
        const header = elaborateHeader(payload, context);

        declareAdtFamily(semanticName, header, context);
        const variants = elaborateVariants(payload, semanticName, header, context);
        const declPayload = makeNormalizedAdt(payload, semanticName, header, variants);
        validatePositivity([declPayload]);
        installAdtDeclaration(declPayload, context);
      },
      elaborate(decl, context) {
        const payload = payloadOf(decl);
        const semanticName = context.qualifyName(payload.name);
        const normalized = context.getSemanticInfo<AdtDeclPayload>(`adt.decl:${semanticName}`);
        if (!normalized) throw new ProofScriptError("PS2426", `Missing normalized inductive metadata for '${payload.name}'.`);
        return {
          kind: "extension",
          op: normalized.indexed ? "lean.inductive.indexed.decl" : "lean.inductive.decl",
          payload: normalized,
        };
      },
    });


    registry.registerDeclarationElaborator({
      kind: "lean.mutual.inductives",
      declare(decl, context) {
        const surfaceMembers = mutualPayloadOf(decl).members;
        const payloads = surfaceMembers.map(payloadOf);
        const seen = new Set<string>();
        const entries = payloads.map((payload) => {
          const semanticName = context.qualifyName(payload.name);
          if (seen.has(semanticName)) throw new ProofScriptError("PS2437", `Duplicate inductive '${payload.name}' in mutual group.`);
          seen.add(semanticName);
          // Heads are elaborated before any group type constructor is declared,
          // preserving Lean's rule that mutual type constructors cannot occur in
          // each other's signatures/parameters.
          return { payload, semanticName, header: elaborateHeader(payload, context) };
        });
        validateMutualHeaders(entries);
        for (const entry of entries) declareAdtFamily(entry.semanticName, entry.header, context);
        const mutualNames = entries.map((entry) => entry.semanticName);
        const elaboratedEntries = entries.map((entry) => ({
          ...entry,
          variants: elaborateVariants(entry.payload, entry.semanticName, entry.header, context),
        }));
        const mutualMinorCount = elaboratedEntries.reduce((sum, entry) => sum + entry.variants.length, 0);
        const normalized = elaboratedEntries.map((entry) => makeNormalizedAdt(
          entry.payload,
          entry.semanticName,
          entry.header,
          entry.variants,
          mutualNames,
          mutualMinorCount,
        ));
        validatePositivity(normalized);
        for (const member of normalized) installAdtDeclaration(member, context);
        context.setElaborationInfo(`adt.mutual:${mutualNames.join("|")}`, { members: normalized } satisfies AdtMutualDeclPayload);
      },
      elaborate(decl, context) {
        const names = mutualPayloadOf(decl).members.map((member) => context.qualifyName(payloadOf(member).name));
        const normalized = context.getElaborationInfo<AdtMutualDeclPayload>(`adt.mutual:${names.join("|")}`);
        if (!normalized) throw new ProofScriptError("PS2438", "Missing normalized mutual-inductive metadata.");
        return { kind: "extension", op: "lean.inductive.mutual.decl", payload: normalized };
      },
    });

    registry.registerOperation("lean.inductive.mutual.decl", {
      requiredCapabilities: ["core.adt", "core.adt.mutual"],
      verification: { level: "kernel-checkable", notes: "Mutual inductive group retains shared-parameter/same-universe constraints, cross-family constructor references, positivity metadata, and native Lean mutual lowering." },
    });

    registry.registerOperation("lean.inductive.decl", {
      requiredCapabilities: ["core.adt"],
      verification: { level: "kernel-checkable", notes: "Reference-aligned non-indexed inductive declaration emitted to Lean." },
    });
    registry.registerOperation("lean.inductive.indexed.decl", {
      requiredCapabilities: ["core.adt.indexed"],
      verification: { level: "kernel-checkable", notes: "Indexed inductive declaration retains value indices in Semantic IR and is emitted faithfully to Lean; TypeScript may erase term indices only after ProofScript elaboration when the indexed ADT runtime representation is supported." },
    });
    registry.registerOperation("lean.inductive.construct", {
      requiredCapabilities: ["core.adt"],
      verification: { level: "kernel-checkable", notes: "Inductive constructor mapped to the corresponding Lean constructor." },
    });
    registry.registerOperation("lean.inductive.indexed.construct", {
      requiredCapabilities: ["core.adt.indexed"],
      verification: { level: "kernel-checkable", notes: "Indexed constructor retains dependent result indices; TypeScript correspondence erases type/index-only arguments only after ProofScript elaboration while preserving explicit runtime fields." },
    });
    registry.registerOperation("lean.inductive.match", {
      requiredCapabilities: ["core.adt.match"],
      verification: { level: "kernel-checkable", notes: "Typed ADT matching mapped to Lean match; v0.37 performs specialized and general branch-local constructor-result index refinement before lowering when indexed scrutinee indices can be solved structurally." },
    });

    registry.registerLeanTypeFamilyLowering("core.adt", (type, context) => {
      const family = type.family ?? "";
      const name = family.startsWith("core.adt:") ? family.slice("core.adt:".length) : type.displayName;
      const leanName = name.includes(".") ? `_root_.ProofScript.Generated.${name}` : name;
      const args = (type.args ?? []).map((arg) => context.emitTypeArgument(arg)).join(" ");
      return args ? `(${leanName} ${args})` : leanName;
    });

    const renderBinder = (param: IRParam, context: Parameters<Parameters<typeof registry.registerLeanDeclarationLowering>[1]>[1]) => {
      const type = context.emitType(param.type);
      switch (param.binderInfo) {
        case "explicit": return `(${param.name} : ${type})`;
        case "implicit": return `{${param.name} : ${type}}`;
        case "strictImplicit": return `⦃${param.name} : ${type}⦄`;
        case "instance": return `[${param.name} : ${type}]`;
      }
    };

    const lowerInductive = (declaration: import("../../core/model.js").IRExtensionDecl, context: import("../../core/model.js").LeanDeclarationContext) => {
      const payload = declaration.payload as AdtDeclPayload;
      const params = payload.params.map((param) => renderBinder(param, context)).join(" ");
      const resultSort = (payload.explicitResultSort || payload.indices.length > 0) ? context.emitType(payload.resultSort) : "";
      const indexType = payload.indices.length === 0
        ? (payload.explicitResultSort ? ` : ${resultSort}` : "")
        : ` : ${payload.indices.map((index) => context.emitType(index.type)).join(" → ")} → ${resultSort}`;
      const lines = [`inductive ${payload.sourceName}${params ? ` ${params}` : ""}${indexType} where`];
      for (const variant of payload.variants) {
        const ctorParams = variant.params.map((param) => renderBinder(param, context)).join(" ");
        const result = variant.explicitResult ? ` : ${context.emitType(variant.resultType)}` : "";
        lines.push(`  | ${variant.name}${ctorParams ? ` ${ctorParams}` : ""}${result}`);
      }
      const rendered = lines.join("\n");
      return payload.deriving?.length ? `${rendered}\nderiving ${payload.deriving.join(", ")}` : rendered;
    };
    registry.registerLeanDeclarationLowering("lean.inductive.decl", lowerInductive);
    registry.registerLeanDeclarationLowering("lean.inductive.indexed.decl", lowerInductive);
    registry.registerLeanDeclarationLowering("lean.inductive.mutual.decl", (declaration, context) => {
      const payload = declaration.payload as AdtMutualDeclPayload;
      const members = payload.members.map((member) => lowerInductive({ ...declaration, payload: member }, context));
      return `mutual\n${members.join("\n")}\nend`;
    });

    registry.registerLeanExprLowering("lean.inductive.construct", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4401", "Expected inductive constructor op.");
      const payload = expr.payload as AdtConstructPayload;
      const args = expr.args.map((arg) => context.emitExpr(arg)).join(" ");
      const typeName = payload.typeName.includes(".") ? `_root_.ProofScript.Generated.${payload.typeName}` : payload.typeName;
      return `(${typeName}.${payload.variant}${args ? ` ${args}` : ""})`;
    });
    registry.registerLeanExprLowering("lean.inductive.indexed.construct", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4403", "Expected indexed inductive constructor op.");
      const payload = expr.payload as AdtConstructPayload;
      const args = expr.args.map((arg) => context.emitExpr(arg)).join(" ");
      const typeName = payload.typeName.includes(".") ? `_root_.ProofScript.Generated.${payload.typeName}` : payload.typeName;
      return `(${typeName}.${payload.variant}${args ? ` ${args}` : ""})`;
    });

    registry.registerLeanExprLowering("lean.inductive.match", (expr, context) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS4402", "Expected inductive match extension.");
      const payload = expr.payload as AdtMatchPayload;
      const [scrutinee, ...bodies] = expr.args;
      const branches = payload.cases.map((item, index) => {
        const binders = item.binders.join(" ");
        const typeName = payload.typeName.includes(".") ? `_root_.ProofScript.Generated.${payload.typeName}` : payload.typeName;
        return `| ${typeName}.${item.variant}${binders ? ` ${binders}` : ""} => ${context.emitExpr(bodies[index]!)}`;
      });
      const options: string[] = [];
      if (payload.matchSyntax?.generalizing !== undefined) options.push(`(generalizing := ${payload.matchSyntax.generalizing ? "true" : "false"})`);
      if (payload.matchSyntax?.motive) options.push(`(motive := ${context.emitType(payload.matchSyntax.motive)})`);
      const discr = payload.matchSyntax?.discriminantEqualityName
        ? `${payload.matchSyntax.discriminantEqualityName} : ${context.emitExpr(scrutinee!)}`
        : context.emitExpr(scrutinee!);
      return `(match${options.length ? ` ${options.join(" ")}` : ""} ${discr} with ${branches.join(" ")})`;
    });
  },
};

export default plugin;

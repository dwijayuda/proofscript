import { parseBinderGroups } from "../../core/binders.js";
import { ProofScriptError } from "../../core/errors.js";
import type { DeclarationElaborationContext, PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import type {
  IRExpr,
  IRParam,
  IRType,
  IRTypeArgument,
  StructureDescriptor,
  StructureFieldDescriptor,
  SurfaceDecl,
  SurfaceExpr,
  SurfaceParam,
  SurfaceTypeExpr,
} from "../../core/model.js";
import {
  makePiType,
  makeTypeVariable,
  nominalType,
  substituteExpr,
  substituteType,
  typeArgument,
  typeArgumentDisplay,
} from "../../core/type-utils.js";
import { collectSurfaceExprNames, collectSurfaceParamTypeNames, collectSurfaceTypeNames, explicitBinderNames } from "../../core/surface-names.js";
import { declaredTypeFamilySpec } from "../../core/type-family.js";

interface SurfaceStructureField {
  readonly name: string;
  readonly type: SurfaceTypeExpr;
  readonly defaultValue?: SurfaceExpr;
}

interface StructurePayload {
  readonly name: string;
  readonly params: readonly SurfaceParam[];
  readonly parents?: readonly SurfaceTypeExpr[];
  readonly fields: readonly SurfaceStructureField[];
  readonly deriving?: readonly string[];
}

interface StructureInstancePayload {
  readonly mode: "construct" | "update";
  readonly base?: SurfaceExpr;
  readonly fields: readonly { readonly path: readonly string[]; readonly value: SurfaceExpr }[];
}

interface NormalizedStructurePayload {
  readonly descriptor: StructureDescriptor;
}

interface StructureConstructPayload {
  readonly structureName: string;
  readonly fieldNames: readonly string[];
  readonly fieldArgOffset?: number;
}

interface StructureUpdatePayload {
  readonly structureName: string;
  readonly fieldPaths: readonly (readonly string[])[];
}


function beqRequirementTypesForStructure(descriptor: StructureDescriptor, subject: IRType): IRType[] {
  const requirements: IRType[] = [];
  const seen = new Set<string>();
  for (const field of descriptor.fields) {
    const type = field.type;
    if (["Nat", "Bool", "String"].includes(type.id)) continue;
    if (type.family === subject.family) continue;
    if (seen.has(type.id)) continue;
    seen.add(type.id);
    requirements.push(type);
  }
  return requirements;
}

function payloadOf(decl: SurfaceDecl): StructurePayload {
  if (decl.kind !== "lean.structure") throw new ProofScriptError("PS2601", "Invalid structure declaration payload.");
  return decl.payload as StructurePayload;
}

function referencedSectionNames(payload: StructurePayload): Set<string> {
  const names = new Set<string>();
  collectSurfaceParamTypeNames(payload.params, names);
  for (const parent of payload.parents ?? []) collectSurfaceTypeNames(parent, names);
  const priorFields = new Set<string>();
  for (const field of payload.fields) {
    const local = new Set<string>();
    collectSurfaceTypeNames(field.type, local);
    if (field.defaultValue) collectSurfaceExprNames(field.defaultValue, local);
    for (const fieldName of priorFields) local.delete(fieldName);
    for (const name of local) names.add(name);
    priorFields.add(field.name);
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

function structureType(name: string, args: readonly IRTypeArgument[]): IRType {
  const display = args.length === 0 ? name : `${name}(${args.map(typeArgumentDisplay).join(",")})`;
  return nominalType(
    args.length === 0 ? name : `${name}(${args.map((arg) => `${arg.kind}:${typeArgumentDisplay(arg)}`).join(",")})`,
    display,
    `lean.structure:${name}`,
    args,
  );
}

function elaborateParams(
  surface: readonly SurfaceParam[],
  context: DeclarationElaborationContext,
  initialTypes: ReadonlyMap<string, IRType> = new Map(),
  initialValues: ReadonlyMap<string, IRType> = new Map(),
) {
  const typeLocals = new Map<string, IRType>(initialTypes);
  const valueLocals = new Map<string, IRType>(initialValues);
  const params: IRParam[] = [];
  for (const item of surface) {
    const type = context.withTypeLocals(typeLocals, () => context.withLocals(valueLocals, () => context.resolveTypeExpression(item.type)));
    const isTypeParam = type.form === "sort";
    const param: IRParam = { name: item.name, type, binderInfo: item.binderInfo, ...(isTypeParam ? { isTypeParam: true } : {}) };
    params.push(param);
    if (isTypeParam) typeLocals.set(item.name, makeTypeVariable(item.name, type));
    else valueLocals.set(item.name, type);
  }
  return { params, typeLocals, valueLocals };
}

function argumentForParam(param: IRParam): IRTypeArgument {
  if (!param.isTypeParam) {
    return { kind: "term", value: { kind: "var", name: param.name, type: param.type } };
  }
  return typeArgument(makeTypeVariable(param.name, param.type));
}

function parseStructure(cursor: import("../../core/plugin-api.js").ParserCursor): SurfaceDecl {
  const name = cursor.parseIdentifier();
  const params = parseBinderGroups(cursor, { stopBeforeBodyBrace: true });
  const parents: SurfaceTypeExpr[] = [];
  if (cursor.peek("extends")) {
    cursor.consume("extends");
    parents.push(cursor.parseTypeExpression());
    while (cursor.peek(",")) { cursor.consume(","); parents.push(cursor.parseTypeExpression()); }
  }
  cursor.expect("{");
  const fields: SurfaceStructureField[] = [];
  while (!cursor.peek("}")) {
    const fieldName = cursor.parseIdentifier();
    cursor.expect(":");
    const type = cursor.parseTypeExpression();
    let defaultValue: SurfaceExpr | undefined;
    if (cursor.peek(":=")) {
      cursor.consume(":=");
      defaultValue = cursor.parseExpression();
    }
    cursor.expect(";");
    fields.push({ name: fieldName, type, ...(defaultValue ? { defaultValue } : {}) });
  }
  cursor.expect("}");
  const deriving: string[] = [];
  if (cursor.peek("deriving")) {
    cursor.consume("deriving");
    deriving.push(cursor.parseIdentifier());
    while (cursor.peek(",")) { cursor.consume(","); deriving.push(cursor.parseIdentifier()); }
  }
  return { kind: "lean.structure", payload: { name, params, ...(parents.length ? { parents } : {}), fields, ...(deriving.length ? { deriving } : {}) } satisfies StructurePayload };
}
function parseStructureInstance(cursor: import("../../core/plugin-api.js").ParserCursor): SurfaceExpr {
  if (cursor.peek("}")) throw new ProofScriptError("PS2610", "Empty structure instances are not supported by the current structure-construction slice.");

  const first = cursor.parseIdentifier();
  if (cursor.peek("with")) {
    cursor.consume("with");
    const fields: { path: string[]; value: SurfaceExpr }[] = [];
    while (true) {
      const path = [cursor.parseIdentifier()];
      while (cursor.peek(".")) { cursor.consume("."); path.push(cursor.parseIdentifier()); }
      cursor.expect(":=");
      fields.push({ path, value: cursor.parseExpression() });
      if (cursor.peek(",")) { cursor.consume(","); if (cursor.peek("}")) break; continue; }
      break;
    }
    cursor.expect("}");
    return {
      kind: "extension",
      owner: "lean.structure.instance",
      payload: { mode: "update", base: { kind: "identifier", name: first }, fields } satisfies StructureInstancePayload,
    };
  }

  const fields: { path: string[]; value: SurfaceExpr }[] = [];
  let value: SurfaceExpr;
  if (cursor.peek(":=")) {
    cursor.consume(":=");
    value = cursor.parseExpression();
  } else {
    value = { kind: "identifier", name: first };
  }
  fields.push({ path: [first], value });
  while (cursor.peek(",")) {
    cursor.consume(",");
    if (cursor.peek("}")) break;
    const name = cursor.parseIdentifier();
    if (cursor.peek(".")) throw new ProofScriptError("PS2620", "Nested paths are supported for structure updates, not structure construction field provision.");
    let fieldValue: SurfaceExpr;
    if (cursor.peek(":=")) { cursor.consume(":="); fieldValue = cursor.parseExpression(); }
    else fieldValue = { kind: "identifier", name };
    fields.push({ path: [name], value: fieldValue });
  }
  cursor.expect("}");
  return { kind: "extension", owner: "lean.structure.instance", payload: { mode: "construct", fields } satisfies StructureInstancePayload };
}
function substitutionsForStructure(descriptor: StructureDescriptor, type: IRType) {
  const typeSubs = new Map<string, IRType>();
  const valueSubs = new Map<string, IRExpr>();
  const args = type.args ?? [];
  descriptor.params.forEach((param, index) => {
    const arg = args[index];
    if (!arg) return;
    if (param.isTypeParam && arg.kind === "type") typeSubs.set(param.name, arg.value);
    else if (!param.isTypeParam && arg.kind === "term") valueSubs.set(param.name, arg.value);
  });
  return { typeSubs, valueSubs };
}


function parameterExprs(descriptor: StructureDescriptor, type: IRType): IRExpr[] {
  const args = type.args ?? [];
  return descriptor.params.flatMap((param, index) => {
    const arg = args[index];
    if (!arg) return [];
    return [arg.kind === "type" ? ({ kind: "type", value: arg.value, type: param.type } satisfies IRExpr) : arg.value];
  });
}

function projectionExpr(
  descriptor: StructureDescriptor,
  structureTypeValue: IRType,
  self: IRExpr,
  field: StructureFieldDescriptor,
  projectedType: IRType,
): IRExpr {
  return {
    kind: "op",
    op: "lean.structure.project",
    args: [...parameterExprs(descriptor, structureTypeValue), self],
    payload: {
      structureName: descriptor.name,
      fieldName: field.name,
      structureParamCount: descriptor.params.length,
      ...(field.inheritedFrom ? { inheritedFrom: field.inheritedFrom } : {}),
    },
    type: projectedType,
  };
}

function instantiatedFieldEnvironment(descriptor: StructureDescriptor, type: IRType, self: IRExpr): {
  readonly typeSubs: Map<string, IRType>;
  readonly valueSubs: Map<string, IRExpr>;
  readonly types: Map<string, IRType>;
  readonly projections: Map<string, IRExpr>;
} {
  const base = substitutionsForStructure(descriptor, type);
  const valueSubs = new Map(base.valueSubs);
  const types = new Map<string, IRType>();
  const projections = new Map<string, IRExpr>();
  for (const field of descriptor.fields) {
    const fieldType = substituteType(field.type, base.typeSubs, valueSubs);
    const projection = projectionExpr(descriptor, type, self, field, fieldType);
    types.set(field.name, fieldType);
    projections.set(field.name, projection);
    valueSubs.set(field.name, projection);
  }
  return { typeSubs: base.typeSubs, valueSubs, types, projections };
}

function exprUsesVar(expr: IRExpr, name: string): boolean {
  switch (expr.kind) {
    case "var": return expr.name === name;
    case "literal": case "type": return false;
    case "apply": return exprUsesVar(expr.callee, name) || expr.args.some((arg) => exprUsesVar(arg, name));
    case "lambda": case "quantifier": return expr.params.some((param) => param.name === name) ? false : exprUsesVar(expr.body, name);
    case "call": case "op": case "extension": return expr.args.some((arg) => exprUsesVar(arg, name));
  }
}

function typeUsesVar(type: IRType, name: string): boolean {
  if (type.form === "term" && type.term) return exprUsesVar(type.term, name);
  if (type.form === "pi" && type.domain && type.codomain && type.binder) {
    return typeUsesVar(type.domain, name) || (type.binder.name === name ? false : typeUsesVar(type.codomain, name));
  }
  return (type.args ?? []).some((arg) => arg.kind === "type" ? typeUsesVar(arg.value, name) : exprUsesVar(arg.value, name));
}

function parentTypesOf(descriptor: StructureDescriptor): readonly IRType[] {
  return descriptor.parentTypes ?? (descriptor.parentType ? [descriptor.parentType] : []);
}

function flattenPi(type: IRType): { params: IRParam[]; result: IRType } {
  const params: IRParam[] = [];
  let current = type;
  while (current.form === "pi" && current.binder && current.domain && current.codomain) {
    params.push({ ...current.binder, type: current.domain });
    current = current.codomain;
  }
  return { params, result: current };
}

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.structure",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.structure.decl", "lean.structure.construct", "lean.structure.project", "lean.structure.update"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  setup(registry) {
    registry.registerOperation("lean.structure.decl", {
      requiredCapabilities: ["lean.structure"],
      verification: { level: "kernel-checkable", notes: "Structure declarations lower to Lean restricted inductive structures." },
    });
    registry.registerOperation("lean.structure.construct", {
      requiredCapabilities: ["lean.structure"],
      verification: { level: "kernel-checkable", notes: "Structure instance construction lowers to Lean field provision." },
    });
    registry.registerOperation("lean.structure.project", {
      requiredCapabilities: ["lean.structure"],
      verification: { level: "kernel-checkable", notes: "Generated structure projections lower to Lean projection declarations." },
    });
    registry.registerOperation("lean.structure.parentProject", {
      requiredCapabilities: ["lean.structure"],
      verification: { level: "kernel-checkable", notes: "Generated structure parent projections lower to Lean parent projection functions." },
    });
    registry.registerOperation("lean.structure.update", {
      requiredCapabilities: ["lean.structure"],
      verification: { level: "kernel-checkable", notes: "Structure update lowers to Lean field-path update syntax, including nested paths validated by the frontend." },
    });

    registry.registerDeclarationSyntax({ keyword: "structure", parse: parseStructure });
    registry.registerExpressionSyntax({ keyword: "{", owner: "lean.structure.instance", parse: parseStructureInstance });

    registry.registerDeclarationElaborator({
      kind: "lean.structure",
      declare(decl, context) {
        const payload = payloadOf(decl);
        const semanticName = context.qualifyName(payload.name);
        const sectionParams = context.selectSectionVariables(referencedSectionNames(payload), explicitBinderNames(payload.params));
        const sectionLocals = sectionLocalMaps(sectionParams);
        const explicit = elaborateParams(payload.params, context, sectionLocals.typeLocals, sectionLocals.valueLocals);
        const normalized = { params: [...sectionParams, ...explicit.params], typeLocals: explicit.typeLocals, valueLocals: explicit.valueLocals };
        const baseArgs = normalized.params.map(argumentForParam);

        const parentTypes: IRType[] = [];
        const inherited: StructureFieldDescriptor[] = [];
        for (const parentSurface of payload.parents ?? []) {
          const parentType = context.withTypeLocals(normalized.typeLocals, () => context.withLocals(normalized.valueLocals, () => context.resolveTypeExpression(parentSurface)));
          if (!parentType.family?.startsWith("lean.structure:")) {
            throw new ProofScriptError("PS2602", `Structure '${payload.name}' may extend only declared structures.`);
          }
          const parentName = parentType.family.slice("lean.structure:".length);
          const parent = context.getSemanticInfo<StructureDescriptor>(`structure.decl:${parentName}`);
          if (!parent) throw new ProofScriptError("PS2603", `Structure metadata for parent '${parentName}' is unavailable.`);
          const parentSubs = substitutionsForStructure(parent, parentType);
          parentTypes.push(parentType);
          for (const field of parent.fields) {
            const inheritedField: StructureFieldDescriptor = {
              ...field,
              type: substituteType(field.type, parentSubs.typeSubs, parentSubs.valueSubs),
              inheritedFrom: field.inheritedFrom ?? parentName,
            };
            const prior = inherited.find((candidate) => candidate.name === field.name);
            if (prior) {
              if (prior.type.id !== inheritedField.type.id) throw new ProofScriptError("PS2621", `Structure '${payload.name}' inherits incompatible overlapping field '${field.name}'.`);
              continue;
            }
            inherited.push(inheritedField);
          }
        }

        const ownFields: StructureFieldDescriptor[] = [];
        const valueLocals = new Map(normalized.valueLocals);
        for (const inheritedField of inherited) valueLocals.set(inheritedField.name, inheritedField.type);
        for (const field of payload.fields) {
          if ([...inherited, ...ownFields].some((item) => item.name === field.name)) {
            throw new ProofScriptError("PS2604", `Structure '${payload.name}' redeclares field '${field.name}'.`);
          }
          const type = context.withTypeLocals(normalized.typeLocals, () => context.withLocals(valueLocals, () => context.resolveTypeExpression(field.type)));
          let defaultValue: IRExpr | undefined;
          if (field.defaultValue) {
            defaultValue = context.withTypeLocals(normalized.typeLocals, () => context.withLocals(valueLocals, () => context.elaborateExpression(field.defaultValue!, type)));
          }
          ownFields.push({ name: field.name, type, ...(defaultValue ? { defaultValue } : {}) });
          valueLocals.set(field.name, type);
        }
        const descriptor: StructureDescriptor = {
          name: semanticName,
          sourceName: payload.name,
          params: normalized.params,
          fields: [...inherited, ...ownFields],
          ownFields,
          ...(parentTypes.length ? { parentTypes, parentType: parentTypes[0] } : {}),
          ...(payload.deriving?.length ? { deriving: payload.deriving } : {}),
          generated: {
            constructor: `${semanticName}.mk`,
            projections: [...inherited, ...ownFields].map((field) => `${semanticName}.${field.name}`),
            parentProjections: parentTypes.map((parentType) => {
              const parentName = parentType.family!.slice("lean.structure:".length);
              return { parentName, projection: `${semanticName}.to${parentName.split(".").at(-1)!}` };
            }),
          },
          family: `lean.structure:${semanticName}`,
        };
        context.declareSemanticInfo(`structure.decl:${semanticName}`, descriptor);

        if (normalized.params.length === 0) context.declareType(semanticName, semanticName, descriptor.family);
        else context.declareTypeFamily(semanticName, declaredTypeFamilySpec({
          schema: "proofscript.type-family/v1",
          name: semanticName,
          family: descriptor.family,
          params: normalized.params,
        }));

        const resultType = structureType(semanticName, baseArgs);
        const selfVar: IRExpr = { kind: "var", name: "self", type: resultType };
        const projected = instantiatedFieldEnvironment(descriptor, resultType, selfVar);
        for (const field of descriptor.fields) {
          const params: IRParam[] = normalized.params.map((param) => ({ ...param, binderInfo: "implicit" }));
          params.push({ name: "self", type: resultType, binderInfo: "explicit" });
          context.declareFunction(`${semanticName}.${field.name}`, params, projected.types.get(field.name)!, {
            operation: "lean.structure.project",
            payload: {
              structureName: semanticName,
              fieldName: field.name,
              structureParamCount: normalized.params.length,
              ...(field.inheritedFrom ? { inheritedFrom: field.inheritedFrom } : {}),
            },
          });
        }
        for (const parentType of parentTypes) {
          const parentName = parentType.family!.slice("lean.structure:".length);
          const parentBase = parentName.split(".").at(-1)!;
          const params: IRParam[] = normalized.params.map((param) => ({ ...param, binderInfo: "implicit" }));
          params.push({ name: "self", type: resultType, binderInfo: "explicit" });
          context.declareFunction(`${semanticName}.to${parentBase}`, params, parentType, {
            operation: "lean.structure.parentProject",
            payload: { structureName: semanticName, parentName, structureParamCount: normalized.params.length },
          });
        }
        if (parentTypes.length === 0) {
          const ctorParams: IRParam[] = [
            ...normalized.params.map((param) => ({ ...param, binderInfo: "implicit" as const })),
            ...descriptor.fields.map((field) => ({ name: field.name, type: field.type, binderInfo: "explicit" as const })),
          ];
          context.declareFunction(`${semanticName}.mk`, ctorParams, resultType, {
            operation: "lean.structure.construct",
            payload: { structureName: semanticName, fieldNames: descriptor.fields.map((field) => field.name), fieldArgOffset: normalized.params.length },
          });
        }
        if (payload.deriving?.length) context.declareSemanticInfo(`structure.deriving:${semanticName}`, payload.deriving);
        if (payload.deriving?.includes("BEq") && normalized.params.every((param) => param.isTypeParam) && context.getClass("BEq")) {
          const typeParams = normalized.params;
          const subject = structureType(semanticName, typeParams.map((param) => typeArgument(makeTypeVariable(param.name, param.type))));
          const resultType = nominalType(`BEq(type:${subject.displayName})`, `BEq(${subject.displayName})`, "lean.class:BEq", [typeArgument(subject)]);
          const requirements = beqRequirementTypesForStructure(descriptor, subject);
          const prerequisiteParams: IRParam[] = requirements.map((requirement, index) => {
            const beqType = nominalType(`BEq(type:${requirement.displayName})`, `BEq(${requirement.displayName})`, "lean.class:BEq", [typeArgument(requirement)]);
            return { name: `__beq_req_${index}`, type: beqType, binderInfo: "instance" as const };
          });
          context.declareInstanceCandidate({
            name: `${semanticName}.__derived_BEq`,
            params: [...typeParams.map((param) => ({ ...param, binderInfo: "implicit" as const })), ...prerequisiteParams],
            resultType, priority: 1000,
            derived: { handler: "BEq", subject, ...(requirements.length ? { requirements } : {}) },
          });
        }
        context.declareSemanticInfo(`structure.generated:${semanticName}`, descriptor.generated);
        context.setElaborationInfo(`structure.normalized:${semanticName}`, { descriptor } satisfies NormalizedStructurePayload);
      },
      elaborate(decl, context) {
        const payload = payloadOf(decl);
        const semanticName = context.qualifyName(payload.name);
        const normalized = context.getElaborationInfo<NormalizedStructurePayload>(`structure.normalized:${semanticName}`);
        if (!normalized) throw new ProofScriptError("PS2606", `Missing normalized structure '${payload.name}'.`);
        return { kind: "extension", op: "lean.structure.decl", payload: normalized.descriptor };
      },
    });

    registry.registerExpressionElaborator({
      owner: "lean.structure.instance",
      elaborate(expr, expected, context) {
        if (expr.kind !== "extension") throw new ProofScriptError("PS2617", "Expected structure instance extension expression.");
        const payload = expr.payload as StructureInstancePayload;
        if (payload.mode === "update") {
          const base = context.elaborateExpression(payload.base!);
          if (!base.type.family?.startsWith("lean.structure:")) throw new ProofScriptError("PS2618", `Structure update base has non-structure type '${base.type.displayName}'.`);
          if (expected && expected.id !== base.type.id) throw new ProofScriptError("PS2619", `Structure update expected '${expected.displayName}', got base '${base.type.displayName}'.`);
          const name = base.type.family.slice("lean.structure:".length);
          const descriptor = context.getSemanticInfo<StructureDescriptor>(`structure.decl:${name}`);
          if (!descriptor) throw new ProofScriptError("PS2613", `Structure metadata for '${name}' is unavailable.`);
          const rootEnvironment = instantiatedFieldEnvironment(descriptor, base.type, base);
          const seen = new Set<string>();
          for (const item of payload.fields) {
            const key = item.path.join(".");
            if (seen.has(key)) throw new ProofScriptError("PS2614", `Structure field path '${key}' is updated more than once.`);
            seen.add(key);
          }
          for (const item of payload.fields) {
            const directConflict = payload.fields.some((other) => other !== item && other.path[0] === item.path[0] && (other.path.length === 1 || item.path.length === 1));
            if (directConflict) throw new ProofScriptError("PS2626", `Structure update cannot replace field '${item.path[0]}' and also update a nested path beneath the same field.`);
          }

          const baseSubs = substitutionsForStructure(descriptor, base.type);
          const valueSubs = new Map(baseSubs.valueSubs);
          const fieldTypes = new Map<string, IRType>();
          const directValues = new Map<string, IRExpr>();
          for (const field of descriptor.fields) {
            const fieldType = substituteType(field.type, baseSubs.typeSubs, valueSubs);
            fieldTypes.set(field.name, fieldType);
            const direct = payload.fields.find((item) => item.path.length === 1 && item.path[0] === field.name);
            if (direct) {
              const value = context.elaborateExpression(direct.value, fieldType);
              directValues.set(field.name, value);
              valueSubs.set(field.name, value);
              continue;
            }
            const originalProjection = rootEnvironment.projections.get(field.name)!;
            if (originalProjection.type.id !== fieldType.id) {
              throw new ProofScriptError("PS2624", `Updating an earlier dependent field also requires replacing '${field.name}' because its type changes.`);
            }
            valueSubs.set(field.name, originalProjection);
          }

          // A nested update changes the value of its top-level field. Until a
          // nested updated value is represented in the dependent substitution
          // environment, conservatively reject later field types that depend on
          // that top-level value.
          for (const item of payload.fields.filter((entry) => entry.path.length > 1)) {
            const outer = item.path[0]!;
            const outerIndex = descriptor.fields.findIndex((field) => field.name === outer);
            for (const dependent of descriptor.fields.slice(outerIndex + 1)) {
              if (typeUsesVar(dependent.type, outer)) {
                throw new ProofScriptError("PS2625", `Nested update of '${outer}' changes a value used by dependent field '${dependent.name}'; this dependent nested-update case remains fail-closed.`);
              }
            }
          }

          const values: IRExpr[] = [base];
          const fieldPaths: string[][] = [];
          for (const item of payload.fields) {
            const pathKey = item.path.join(".");
            if (item.path.length === 1) {
              values.push(directValues.get(item.path[0]!)!);
              fieldPaths.push([...item.path]);
              continue;
            }
            let currentDescriptor = descriptor;
            let currentType = base.type;
            let currentExpr = base;
            let leafType: IRType | undefined;
            for (let index = 0; index < item.path.length; index += 1) {
              const fieldName = item.path[index]!;
              let environment: ReturnType<typeof instantiatedFieldEnvironment>;
              if (index === 0) {
                environment = rootEnvironment;
                leafType = fieldTypes.get(fieldName);
              } else {
                environment = instantiatedFieldEnvironment(currentDescriptor, currentType, currentExpr);
                leafType = environment.types.get(fieldName);
              }
              const field = currentDescriptor.fields.find((candidate) => candidate.name === fieldName);
              if (!field || !leafType) throw new ProofScriptError("PS2615", `Structure '${currentDescriptor.name}' has no field '${fieldName}' in update path '${pathKey}'.`);
              currentExpr = environment.projections.get(fieldName)!;
              if (index < item.path.length - 1) {
                if (!leafType.family?.startsWith("lean.structure:")) throw new ProofScriptError("PS2622", `Nested update path '${pathKey}' crosses non-structure field '${fieldName}'.`);
                const nestedName = leafType.family.slice("lean.structure:".length);
                const nested = context.getSemanticInfo<StructureDescriptor>(`structure.decl:${nestedName}`);
                if (!nested) throw new ProofScriptError("PS2623", `Structure metadata for nested update type '${nestedName}' is unavailable.`);
                currentDescriptor = nested;
                currentType = leafType;
              }
            }
            values.push(context.elaborateExpression(item.value, leafType!));
            fieldPaths.push([...item.path]);
          }
          return { kind: "op", op: "lean.structure.update", args: values, payload: { structureName: name, fieldPaths } satisfies StructureUpdatePayload, type: base.type };
        }

        if (!expected?.family?.startsWith("lean.structure:")) {
          throw new ProofScriptError("PS2612", "A structure construction requires an expected structure type.");
        }
        const name = expected.family.slice("lean.structure:".length);
        const descriptor = context.getSemanticInfo<StructureDescriptor>(`structure.decl:${name}`);
        if (!descriptor) throw new ProofScriptError("PS2613", `Structure metadata for '${name}' is unavailable.`);
        const supplied = new Map<string, SurfaceExpr>();
        for (const item of payload.fields) {
          const fieldName = item.path[0]!;
          if (item.path.length !== 1) throw new ProofScriptError("PS2620", "Nested field provision is not part of structure construction; use a nested structure value explicitly.");
          if (supplied.has(fieldName)) throw new ProofScriptError("PS2614", `Structure field '${fieldName}' is supplied more than once.`);
          if (!descriptor.fields.some((field) => field.name === fieldName)) throw new ProofScriptError("PS2615", `Structure '${name}' has no field '${fieldName}'.`);
          supplied.set(fieldName, item.value);
        }
        const subs = substitutionsForStructure(descriptor, expected);
        const valueSubs = new Map(subs.valueSubs);
        const args: IRExpr[] = [];
        const fieldNames: string[] = [];
        for (const field of descriptor.fields) {
          const fieldType = substituteType(field.type, subs.typeSubs, valueSubs);
          const source = supplied.get(field.name);
          let value: IRExpr;
          if (source) value = context.elaborateExpression(source, fieldType);
          else if (field.defaultValue) value = substituteExpr(field.defaultValue, subs.typeSubs, valueSubs);
          else throw new ProofScriptError("PS2616", `Structure instance of '${name}' is missing field '${field.name}'.`);
          args.push(value);
          fieldNames.push(field.name);
          valueSubs.set(field.name, value);
        }
        return {
          kind: "op",
          op: "lean.structure.construct",
          args,
          payload: { structureName: name, fieldNames } satisfies StructureConstructPayload,
          type: expected,
        };
      },
    });

    registry.registerLeanTypeFamilyLowering("lean.structure", (type, context) => {
      const name = type.family?.slice("lean.structure:".length) ?? type.displayName;
      const leanName = name.includes(".") ? `_root_.ProofScript.Generated.${name}` : name;
      const args = (type.args ?? []).map((arg) => context.emitTypeArgument(arg)).join(" ");
      return args ? `(${leanName} ${args})` : leanName;
    });

    registry.registerLeanDeclarationLowering("lean.structure.decl", (declaration, context) => {
      const descriptor = declaration.payload as StructureDescriptor;
      const renderBinder = (param: IRParam) => {
        const type = context.emitType(param.type);
        switch (param.binderInfo) {
          case "explicit": return `(${param.name} : ${type})`;
          case "implicit": return `{${param.name} : ${type}}`;
          case "strictImplicit": return `⦃${param.name} : ${type}⦄`;
          case "instance": return `[${param.name} : ${type}]`;
        }
      };
      const params = descriptor.params.map(renderBinder).join(" ");
      const parents = parentTypesOf(descriptor);
      const parent = parents.length ? ` extends ${parents.map((item) => context.emitType(item)).join(", ")}` : "";
      const fields = descriptor.ownFields.map((field) => `  ${field.name} : ${context.emitType(field.type)}${field.defaultValue ? ` := ${context.emitExpr(field.defaultValue)}` : ""}`).join("\n");
      const rendered = `structure ${descriptor.sourceName ?? descriptor.name}${params ? ` ${params}` : ""}${parent} where${fields ? `\n${fields}` : ""}`;
      return descriptor.deriving?.length ? `${rendered}\nderiving ${descriptor.deriving.join(", ")}` : rendered;
    });

    registry.registerLeanExprLowering("lean.structure.construct", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4610", "Expected structure construction operation.");
      const payload = expr.payload as StructureConstructPayload;
      const offset = Math.max(0, expr.args.length - payload.fieldNames.length);
      return `{ ${payload.fieldNames.map((name, index) => `${name} := ${context.emitExpr(expr.args[index + offset]!)}`).join(", ")} }`;
    });

    registry.registerLeanExprLowering("lean.structure.update", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4612", "Expected structure update operation.");
      const payload = expr.payload as StructureUpdatePayload;
      const base = context.emitExpr(expr.args[0]!);
      const fields = payload.fieldPaths.map((path, index) => `${path.join(".")} := ${context.emitExpr(expr.args[index + 1]!)}`).join(", ");
      return `{ ${base} with ${fields} }`;
    });

    registry.registerLeanExprLowering("lean.structure.parentProject", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4614", "Expected structure parent projection operation.");
      const payload = expr.payload as { structureName: string; parentName: string; structureParamCount?: number };
      const self = expr.args.at(-1);
      if (!self) throw new ProofScriptError("PS4615", "Malformed structure parent projection: missing self argument.");
      const childName = payload.structureName.includes(".") ? `_root_.ProofScript.Generated.${payload.structureName}` : payload.structureName;
      const parentBase = payload.parentName.split(".").at(-1)!;
      return `(${childName}.to${parentBase} ${context.emitExpr(self)})`;
    });

    registry.registerLeanExprLowering("lean.structure.project", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4611", "Expected structure projection operation.");
      const payload = expr.payload as { structureName: string; fieldName: string; structureParamCount?: number; inheritedFrom?: string };
      const self = expr.args.at(-1);
      if (!self) throw new ProofScriptError("PS4613", "Malformed structure projection: missing self argument.");
      const childName = payload.structureName.includes(".") ? `_root_.ProofScript.Generated.${payload.structureName}` : payload.structureName;
      if (payload.inheritedFrom) {
        const parentName = payload.inheritedFrom.includes(".") ? `_root_.ProofScript.Generated.${payload.inheritedFrom}` : payload.inheritedFrom;
        const parentBase = payload.inheritedFrom.split(".").at(-1)!;
        return `(${parentName}.${payload.fieldName} (${childName}.to${parentBase} ${context.emitExpr(self)}))`;
      }
      return `(${childName}.${payload.fieldName} ${context.emitExpr(self)})`;
    });
  },
};

export default plugin;

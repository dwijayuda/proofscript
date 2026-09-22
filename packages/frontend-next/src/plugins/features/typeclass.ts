import { parseBinderGroups } from "../../core/binders.js";
import { ProofScriptError } from "../../core/errors.js";
import type { DeclarationElaborationContext, PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import type {
  ClassDescriptor,
  IRExpr,
  IRParam,
  IRType,
  IRTypeArgument,
  SurfaceDecl,
  SurfaceExpr,
  SurfaceParam,
  SurfaceTypeExpr,
} from "../../core/model.js";
import {
  makePiType,
  makeSortType,
  makeTypeVariable,
  makeTypeTerm,
  nominalType,
  substituteType,
  typeArgument,
  termArgument,
  typeArgumentDisplay,
} from "../../core/type-utils.js";
import { collectSurfaceExprNames, collectSurfaceParamTypeNames, collectSurfaceTypeNames, explicitBinderNames } from "../../core/surface-names.js";
import { declaredTypeFamilySpec } from "../../core/type-family.js";
import { parsePriority } from "../../core/priority.js";

interface ClassFieldSurface {
  readonly name: string;
  readonly params: readonly SurfaceParam[];
  readonly resultType: SurfaceTypeExpr;
}

interface ClassPayload {
  readonly name: string;
  readonly params: readonly SurfaceParam[];
  readonly parents?: readonly SurfaceTypeExpr[];
  readonly fields: readonly ClassFieldSurface[];
  readonly deriving?: readonly string[];
}

interface InstanceFieldSurface {
  readonly name: string;
  readonly params: readonly SurfaceParam[];
  readonly value: SurfaceExpr;
}

interface InstancePayload {
  readonly sourceName: string;
  readonly priority: number;
  readonly params: readonly SurfaceParam[];
  readonly target: SurfaceTypeExpr;
  readonly fields: readonly InstanceFieldSurface[];
}

interface NormalizedClassPayload {
  readonly descriptor: ClassDescriptor;
}

interface NormalizedInstancePayload {
  readonly name: string;
  readonly sourceName: string;
  readonly priority: number;
  readonly params: readonly IRParam[];
  readonly targetType: IRType;
  readonly fields: readonly { readonly name: string; readonly value: IRExpr }[];
  readonly visibility: "global" | "local" | "scoped";
  readonly localScopeId?: number;
  readonly scopeName?: string;
  readonly defaultInstancePriority?: number;
  readonly hasDefaultInstanceAttribute?: boolean;
}

function classPayloadOf(decl: SurfaceDecl): ClassPayload {
  if (decl.kind !== "lean.class") throw new ProofScriptError("PS2501", "Invalid class declaration payload.");
  return decl.payload as ClassPayload;
}

function instancePayloadOf(decl: SurfaceDecl): InstancePayload {
  if (decl.kind !== "lean.instance") throw new ProofScriptError("PS2510", "Invalid instance declaration payload.");
  return decl.payload as InstancePayload;
}

function classReferencedSectionNames(payload: ClassPayload): Set<string> {
  const names = new Set<string>();
  collectSurfaceParamTypeNames(payload.params, names);
  for (const parent of payload.parents ?? []) collectSurfaceTypeNames(parent, names);
  for (const field of payload.fields) {
    const local = new Set<string>();
    collectSurfaceParamTypeNames(field.params, local);
    collectSurfaceTypeNames(field.resultType, local);
    for (const binder of field.params) local.delete(binder.name);
    for (const name of local) names.add(name);
  }
  return names;
}

function instanceReferencedSectionNames(payload: InstancePayload): Set<string> {
  const names = new Set<string>();
  collectSurfaceParamTypeNames(payload.params, names);
  collectSurfaceTypeNames(payload.target, names);
  for (const field of payload.fields) {
    const local = new Set<string>();
    collectSurfaceParamTypeNames(field.params, local);
    collectSurfaceExprNames(field.value, local);
    for (const binder of field.params) local.delete(binder.name);
    for (const name of local) names.add(name);
  }
  return names;
}

function sectionLocalMaps(params: readonly IRParam[]): { typeLocals: Map<string, IRType>; valueLocals: Map<string, IRType>; instanceLocals: Map<string, IRType> } {
  const typeLocals = new Map<string, IRType>();
  const valueLocals = new Map<string, IRType>();
  const instanceLocals = new Map<string, IRType>();
  for (const param of params) {
    if (param.isTypeParam) typeLocals.set(param.name, makeTypeVariable(param.name, param.type));
    else {
      valueLocals.set(param.name, param.type);
      if (param.binderInfo === "instance") instanceLocals.set(param.name, param.type);
    }
  }
  return { typeLocals, valueLocals, instanceLocals };
}

function instanceEnvironmentOf(decl: SurfaceDecl, context: DeclarationElaborationContext): {
  readonly visibility: "global" | "local" | "scoped";
  readonly localScopeId?: number;
  readonly scopeName?: string;
  readonly defaultInstancePriority?: number;
  readonly hasDefaultInstanceAttribute?: boolean;
} {
  let visibility: "global" | "local" | "scoped" = "global";
  let localScopeId: number | undefined;
  let scopeName: string | undefined;
  let defaultInstancePriority: number | undefined;
  let hasDefaultInstanceAttribute = false;
  for (const prefix of decl.prefixes ?? []) {
    switch (prefix.owner) {
      case "lean.instance.local": {
        if (visibility !== "global") throw new ProofScriptError("PS2522", "An instance cannot be both local and scoped.");
        const scope = context.currentSectionScopeId();
        if (scope === undefined) throw new ProofScriptError("PS2523", "'local instance' requires an active section in the v0.15 scope slice.");
        visibility = "local";
        localScopeId = scope;
        break;
      }
      case "lean.instance.scoped": {
        if (visibility !== "global") throw new ProofScriptError("PS2522", "An instance cannot be both local and scoped.");
        const namespace = context.currentNamespaceName();
        if (!namespace) throw new ProofScriptError("PS2524", "'scoped instance' requires an active namespace, matching Lean scoped-instance semantics.");
        visibility = "scoped";
        scopeName = namespace;
        break;
      }
      case "lean.attribute.default_instance": {
        hasDefaultInstanceAttribute = true;
        const payload = prefix.payload as { readonly priority?: number };
        defaultInstancePriority = payload.priority ?? 1000;
        break;
      }
      case "lean.declaration.attributes": {
        const attributes = (prefix.payload as { readonly attributes?: readonly { readonly name: string; readonly priority?: number }[] }).attributes ?? [];
        const defaultAttr = attributes.find((attribute) => attribute.name === "default_instance");
        if (defaultAttr) { hasDefaultInstanceAttribute = true; defaultInstancePriority = defaultAttr.priority ?? 1000; }
        break;
      }
      case "lean.declaration.visibility": break;
      default: throw new ProofScriptError("PS2525", `Unsupported instance prefix '${prefix.owner}'.`);
    }
  }
  if (visibility !== "global" && (decl.prefixes ?? []).some((prefix) => prefix.owner === "lean.declaration.visibility")) {
    throw new ProofScriptError("PS2526", "private/public instance visibility cannot yet be combined with local/scoped instance registration.");
  }
  return {
    visibility,
    ...(localScopeId === undefined ? {} : { localScopeId }),
    ...(scopeName === undefined ? {} : { scopeName }),
    ...(defaultInstancePriority === undefined ? {} : { defaultInstancePriority }),
    ...(hasDefaultInstanceAttribute ? { hasDefaultInstanceAttribute: true } : {}),
  };
}

function classType(name: string, args: readonly IRTypeArgument[]): IRType {
  const display = args.length === 0 ? name : `${name}(${args.map(typeArgumentDisplay).join(",")})`;
  return nominalType(
    args.length === 0 ? name : `${name}(${args.map((arg) => `${arg.kind}:${typeArgumentDisplay(arg)}`).join(",")})`,
    display,
    `lean.class:${name}`,
    args,
  );
}


function classParamSurface(surface: SurfaceParam): { readonly type: SurfaceTypeExpr; readonly mode: "input" | "out" | "semiOut" } {
  if (surface.type.kind === "term" && surface.type.expr.kind === "call" &&
      (surface.type.expr.callee === "outParam" || surface.type.expr.callee === "semiOutParam")) {
    const call = surface.type.expr;
    if (call.args.length !== 1 || (call.namedArgs?.length ?? 0) !== 0) {
      throw new ProofScriptError("PS2520", `${call.callee} expects exactly one type argument.`);
    }
    return {
      type: { kind: "term", expr: call.args[0]! },
      mode: call.callee === "outParam" ? "out" : "semiOut",
    };
  }
  return { type: surface.type, mode: "input" };
}

function elaborateTypeParams(
  surface: readonly SurfaceParam[],
  context: DeclarationElaborationContext,
  initialParams: readonly IRParam[] = [],
): {
  readonly params: readonly IRParam[];
  readonly typeLocals: ReadonlyMap<string, IRType>;
  readonly valueLocals: ReadonlyMap<string, IRType>;
} {
  const typeLocals = new Map<string, IRType>();
  const valueLocals = new Map<string, IRType>();
  const params: IRParam[] = [...initialParams];
  for (const param of initialParams) {
    if (param.isTypeParam) typeLocals.set(param.name, makeTypeVariable(param.name, param.type));
    else valueLocals.set(param.name, param.type);
  }
  for (const item of surface) {
    const normalizedSurface = classParamSurface(item);
    const type = context.withTypeLocals(typeLocals, () => context.withLocals(valueLocals, () => context.resolveTypeExpression(normalizedSurface.type)));
    if (item.binderInfo === "instance") {
      throw new ProofScriptError("PS2503", `Class parameter '${item.name}' cannot itself be an instance binder.`);
    }
    const isTypeParam = type.form === "sort";
    const param: IRParam = {
      name: item.name,
      type,
      binderInfo: item.binderInfo,
      ...(isTypeParam ? { isTypeParam: true } : {}),
      ...(normalizedSurface.mode === "input" ? {} : { instanceSearchMode: normalizedSurface.mode }),
    };
    params.push(param);
    if (isTypeParam) typeLocals.set(item.name, makeTypeVariable(item.name, type));
    else valueLocals.set(item.name, type);
  }
  return { params, typeLocals, valueLocals };
}

function fieldType(
  field: ClassFieldSurface,
  context: DeclarationElaborationContext,
  classTypeLocals: ReadonlyMap<string, IRType>,
  classValueLocals: ReadonlyMap<string, IRType> = new Map(),
  priorFieldLocals: ReadonlyMap<string, IRType> = new Map(),
): IRType {
  const typeLocals = new Map(classTypeLocals);
  const valueLocals = new Map<string, IRType>(classValueLocals);
  for (const [name, type] of priorFieldLocals) valueLocals.set(name, type);
  const params: IRParam[] = [];
  for (const surface of field.params) {
    const type = context.withTypeLocals(typeLocals, () => context.withLocals(valueLocals, () => context.resolveTypeExpression(surface.type)));
    const isTypeParam = type.form === "sort";
    const param: IRParam = { name: surface.name, type, binderInfo: surface.binderInfo, ...(isTypeParam ? { isTypeParam: true } : {}) };
    params.push(param);
    if (isTypeParam) typeLocals.set(surface.name, makeTypeVariable(surface.name, type));
    else valueLocals.set(surface.name, type);
  }
  let result = context.withTypeLocals(typeLocals, () => context.withLocals(valueLocals, () => context.resolveTypeExpression(field.resultType)));
  for (let i = params.length - 1; i >= 0; i -= 1) {
    const param = params[i]!;
    result = makePiType({ name: param.name, binderInfo: param.binderInfo }, param.type, result);
  }
  return result;
}

function parseClass(cursor: import("../../core/plugin-api.js").ParserCursor): SurfaceDecl {
  const name = cursor.parseIdentifier();
  const params = parseBinderGroups(cursor, { stopBeforeBodyBrace: true });
  const parents: SurfaceTypeExpr[] = [];
  if (cursor.peek("extends")) {
    cursor.consume("extends");
    parents.push(cursor.parseTypeExpression());
    while (cursor.peek(",")) { cursor.consume(","); parents.push(cursor.parseTypeExpression()); }
  }
  cursor.expect("{");
  const fields: ClassFieldSurface[] = [];
  while (!cursor.peek("}")) {
    const fieldName = cursor.parseIdentifier();
    const fieldParams = parseBinderGroups(cursor);
    cursor.expect(":");
    const resultType = cursor.parseTypeExpression();
    cursor.expect(";");
    fields.push({ name: fieldName, params: fieldParams, resultType });
  }
  cursor.expect("}");
  if (fields.length === 0 && parents.length === 0) throw new ProofScriptError("PS2505", `Class '${name}' must declare at least one field or parent.`);
  const deriving: string[] = [];
  if (cursor.peek("deriving")) {
    cursor.consume("deriving");
    deriving.push(cursor.parseIdentifier());
    while (cursor.peek(",")) { cursor.consume(","); deriving.push(cursor.parseIdentifier()); }
  }
  return { kind: "lean.class", payload: { name, params, ...(parents.length ? { parents } : {}), fields, ...(deriving.length ? { deriving } : {}) } satisfies ClassPayload };
}
let anonymousInstanceCounter = 0;

function parseInstance(cursor: import("../../core/plugin-api.js").ParserCursor): SurfaceDecl {
  let priority = 1000;
  if (cursor.peek("(")) {
    cursor.consume("(");
    cursor.expect("priority");
    cursor.expect(":=");
    priority = parsePriority(cursor, "PS2511");
    cursor.expect(")");
  }

  let sourceName: string | undefined;
  if (!cursor.peek(":") && !cursor.peek("{") && !cursor.peek("⦃") && !cursor.peek("[")) {
    sourceName = cursor.parseIdentifier();
  }
  const params = parseBinderGroups(cursor);
  cursor.expect(":");
  const target = cursor.parseTypeExpression();
  cursor.expect(":=");
  cursor.expect("{");
  const fields: InstanceFieldSurface[] = [];
  while (!cursor.peek("}")) {
    const name = cursor.parseIdentifier();
    const fieldParams = parseBinderGroups(cursor);
    cursor.expect(":=");
    const value = cursor.parseExpression();
    fields.push({ name, params: fieldParams, value });
    if (cursor.peek(",") || cursor.peek(";")) cursor.consume();
    else if (!cursor.peek("}")) throw new ProofScriptError("PS2512", "Instance fields must be separated by ',' or ';'.");
  }
  cursor.expect("}");
  if (cursor.peek(";")) cursor.consume(";");
  const normalizedName = sourceName ?? `__ps_instance_${++anonymousInstanceCounter}`;
  return { kind: "lean.instance", payload: { sourceName: normalizedName, priority, params, target, fields } satisfies InstancePayload };
}

function normalizeInstanceParams(payload: InstancePayload, context: DeclarationElaborationContext, extraReferenced: ReadonlySet<string> = new Set()): {
  readonly params: readonly IRParam[];
  readonly typeLocals: ReadonlyMap<string, IRType>;
  readonly valueLocals: ReadonlyMap<string, IRType>;
  readonly instanceLocals: ReadonlyMap<string, IRType>;
} {
  const referenced = instanceReferencedSectionNames(payload);
  for (const name of extraReferenced) referenced.add(name);
  const sectionParams = context.selectSectionVariables(referenced, explicitBinderNames(payload.params));
  const seeded = sectionLocalMaps(sectionParams);
  const typeLocals = new Map<string, IRType>(seeded.typeLocals);
  const valueLocals = new Map<string, IRType>(seeded.valueLocals);
  const instanceLocals = new Map<string, IRType>(seeded.instanceLocals);
  const params: IRParam[] = [...sectionParams];
  for (const surface of payload.params) {
    const type = context.withTypeLocals(typeLocals, () => context.withLocals(valueLocals, () => context.resolveTypeExpression(surface.type)));
    const isTypeParam = type.form === "sort";
    const param: IRParam = { name: surface.name, type, binderInfo: surface.binderInfo, ...(isTypeParam ? { isTypeParam: true } : {}) };
    params.push(param);
    if (isTypeParam) typeLocals.set(surface.name, makeTypeVariable(surface.name, type));
    else {
      valueLocals.set(surface.name, type);
      if (surface.binderInfo === "instance") instanceLocals.set(surface.name, type);
    }
  }
  return { params, typeLocals, valueLocals, instanceLocals };
}

function classNameFromType(type: IRType): string | undefined {
  return type.family?.startsWith("lean.class:") ? type.family.slice("lean.class:".length) : undefined;
}

function flattenPi(type: IRType): { readonly params: readonly IRParam[]; readonly result: IRType } {
  const params: IRParam[] = [];
  const used = new Set<string>();
  let current = type;
  while (current.form === "pi" && current.binder && current.domain && current.codomain) {
    let name = current.binder.name;
    if (name === "_" || used.has(name)) name = `_arg${params.length + 1}`;
    used.add(name);
    params.push({ ...current.binder, name, type: current.domain });
    current = current.codomain;
  }
  return { params, result: current };
}

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.typeclass",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.class.decl", "lean.instance.decl", "lean.instance.synthesis"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  setup(registry) {
    // Bootstrap Lean's coercion classes as existing environment data rather
    // than re-declaring them in generated source.  Their search-direction
    // annotations are semantically important: Coe/CoeTail infer from the
    // expected target backwards, while CoeOut/CoeHead infer forwards.
    const typeSort = makeSortType("Type");
    const coeA = makeTypeVariable("A", typeSort);
    const coeB = makeTypeVariable("B", typeSort);
    const boolType = nominalType("Bool", "Bool");
    const ordinaryCoeDescriptor = (
      name: "Coe" | "CoeOut" | "CoeHead" | "CoeTail",
      sourceMode: "input" | "semiOut",
      targetMode: "input" | "semiOut",
    ): ClassDescriptor => ({
      name,
      params: [
        { name: "A", type: typeSort, binderInfo: "explicit", isTypeParam: true, ...(sourceMode === "input" ? {} : { instanceSearchMode: sourceMode }) },
        { name: "B", type: typeSort, binderInfo: "explicit", isTypeParam: true, ...(targetMode === "input" ? {} : { instanceSearchMode: targetMode }) },
      ],
      fields: [{ name: "coe", type: makePiType(undefined, coeA, coeB) }],
      ownFields: [{ name: "coe", type: makePiType(undefined, coeA, coeB) }],
      family: `lean.class:${name}`,
    });
    const coeDescriptors: ClassDescriptor[] = [
      ordinaryCoeDescriptor("Coe", "semiOut", "input"),
      ordinaryCoeDescriptor("CoeOut", "input", "semiOut"),
      ordinaryCoeDescriptor("CoeHead", "input", "semiOut"),
      ordinaryCoeDescriptor("CoeTail", "semiOut", "input"),
      {
        name: "CoeDep",
        params: [
          { name: "A", type: typeSort, binderInfo: "explicit", isTypeParam: true },
          { name: "x", type: coeA, binderInfo: "explicit" },
          { name: "B", type: typeSort, binderInfo: "explicit", isTypeParam: true },
        ],
        fields: [{ name: "coe", type: coeB }],
        ownFields: [{ name: "coe", type: coeB }],
        family: "lean.class:CoeDep",
      },
      (() => {
        const gammaType = makePiType({ name: "a", binderInfo: "explicit" }, coeA, typeSort);
        const gamma: IRExpr = { kind: "var", name: "gamma", type: gammaType };
        const f: IRExpr = { kind: "var", name: "f", type: coeA };
        const gammaF: IRExpr = { kind: "apply", callee: gamma, args: [f], type: typeSort };
        const result = makeTypeTerm(gammaF);
        return {
          name: "CoeFun",
          params: [
            { name: "A", type: typeSort, binderInfo: "explicit", isTypeParam: true },
            { name: "gamma", type: gammaType, binderInfo: "explicit", instanceSearchMode: "out" },
          ],
          fields: [{ name: "coe", type: makePiType({ name: "f", binderInfo: "explicit" }, coeA, result) }],
          ownFields: [{ name: "coe", type: makePiType({ name: "f", binderInfo: "explicit" }, coeA, result) }],
          family: "lean.class:CoeFun",
        } satisfies ClassDescriptor;
      })(),
      {
        name: "CoeSort",
        params: [
          { name: "A", type: typeSort, binderInfo: "explicit", isTypeParam: true },
          { name: "B", type: typeSort, binderInfo: "explicit", isTypeParam: true, instanceSearchMode: "out" },
        ],
        fields: [{ name: "coe", type: makePiType(undefined, coeA, coeB) }],
        ownFields: [{ name: "coe", type: makePiType(undefined, coeA, coeB) }],
        family: "lean.class:CoeSort",
      },
      {
        name: "BEq",
        params: [{ name: "A", type: typeSort, binderInfo: "explicit", isTypeParam: true }],
        fields: [{ name: "beq", type: makePiType(undefined, coeA, makePiType(undefined, coeA, boolType)) }],
        ownFields: [{ name: "beq", type: makePiType(undefined, coeA, makePiType(undefined, coeA, boolType)) }],
        family: "lean.class:BEq",
      },
    ];
    for (const descriptor of coeDescriptors) registry.registerBuiltinClass(descriptor);
    for (const name of ["Coe", "CoeOut", "CoeHead", "CoeTail"] as const) {
      registry.registerTypeFamily(name, {
        params: [{ kind: "type" }, { kind: "type" }],
        resolve(args) {
          if (args.length !== 2 || args.some((arg) => arg.kind !== "type")) throw new ProofScriptError("PS2521", `${name} expects two type arguments.`);
          return classType(name, args);
        },
      });
    }
    registry.registerTypeFamily("CoeDep", {
      params: [
        { kind: "type" },
        { kind: "term", expectedType: (prior) => prior[0]?.kind === "type" ? prior[0].value : typeSort },
        { kind: "type" },
      ],
      resolve(args) {
        if (args.length !== 3 || args[0]?.kind !== "type" || args[1]?.kind !== "term" || args[2]?.kind !== "type") {
          throw new ProofScriptError("PS2522", "CoeDep expects (sourceType, sourceValue, targetType).");
        }
        return classType("CoeDep", args);
      },
    });
    registry.registerTypeFamily("CoeFun", {
      params: [
        { kind: "type" },
        { kind: "term", expectedType: (prior) => {
          const source = prior[0]?.kind === "type" ? prior[0].value : coeA;
          return makePiType({ name: "a", binderInfo: "explicit" }, source, typeSort);
        } },
      ],
      resolve(args) {
        if (args.length !== 2 || args[0]?.kind !== "type" || args[1]?.kind !== "term") {
          throw new ProofScriptError("PS2527", "CoeFun expects (sourceType, gammaFunction).");
        }
        return classType("CoeFun", args);
      },
    });
    registry.registerTypeFamily("CoeSort", {
      params: [{ kind: "type" }, { kind: "type" }],
      resolve(args) {
        if (args.length !== 2 || args.some((arg) => arg.kind !== "type")) throw new ProofScriptError("PS2528", "CoeSort expects (sourceType, targetSort).");
        return classType("CoeSort", args);
      },
    });
    registry.registerTypeFamily("BEq", {
      params: [{ kind: "type" }],
      resolve(args) {
        if (args.length !== 1 || args[0]?.kind !== "type") throw new ProofScriptError("PS2529", "BEq expects one type argument.");
        return classType("BEq", args);
      },
    });

    registry.registerOperation("lean.coercion.apply", {
      requiredCapabilities: ["lean.coercion"],
      verification: { level: "kernel-checkable", notes: "Selected Lean coercion evidence/path retained explicitly in Semantic IR." },
    });
    registry.registerLeanExprLowering("lean.coercion.apply", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4600", "Expected coercion application operation.");
      const payload = expr.payload as { readonly steps: readonly { readonly className: string; readonly source: IRType; readonly target: IRType; readonly dependent?: boolean }[] };
      let value = context.emitExpr(expr.args[0]!);
      for (let index = 0; index < payload.steps.length; index += 1) {
        const step = payload.steps[index]!;
        const evidence = context.emitExpr(expr.args[index + 1]!);
        value = step.dependent
          ? `(@CoeDep.coe ${context.emitType(step.source)} ${value} ${context.emitType(step.target)} ${evidence})`
          : `(@${step.className}.coe ${context.emitType(step.source)} ${context.emitType(step.target)} ${evidence} ${value})`;
      }
      return value;
    });

    registry.registerOperation("lean.coercion.fun", {
      requiredCapabilities: ["lean.coercion"],
      verification: { level: "kernel-checkable", notes: "CoeFun evidence and inferred value-dependent function family are explicit in Semantic IR." },
    });
    registry.registerOperation("lean.coercion.sort", {
      requiredCapabilities: ["lean.coercion"],
      verification: { level: "kernel-checkable", notes: "CoeSort evidence is explicit in Semantic IR; backend type correspondence may remain unsupported." },
    });
    registry.registerLeanExprLowering("lean.coercion.fun", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4601", "Expected CoeFun coercion operation.");
      const source = (expr.payload as { source: IRType }).source;
      const value = context.emitExpr(expr.args[0]!);
      const evidence = context.emitExpr(expr.args[1]!);
      const gamma = context.emitExpr(expr.args[2]!);
      return `(@CoeFun.coe ${context.emitType(source)} ${gamma} ${evidence} ${value})`;
    });
    registry.registerLeanExprLowering("lean.coercion.sort", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4602", "Expected CoeSort coercion operation.");
      const payload = expr.payload as { source: IRType; targetSort: IRType };
      return `(@CoeSort.coe ${context.emitType(payload.source)} ${context.emitType(payload.targetSort)} ${context.emitExpr(expr.args[1]!)} ${context.emitExpr(expr.args[0]!)})`;
    });

    registry.registerOperation("lean.derived.instance", {
      requiredCapabilities: ["lean.typeclass"],
      verification: { level: "kernel-checkable", notes: "Derived instance evidence selected by ProofScript; generated Lean reconstructs the deriving-produced instance through infer_instance." },
    });
    registry.registerLeanExprLowering("lean.derived.instance", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4603", "Expected derived-instance evidence operation.");
      return `(by infer_instance)`;
    });

    registry.registerOperation("lean.class.decl", {
      requiredCapabilities: ["lean.typeclass"],
      verification: { level: "kernel-checkable", notes: "Class declarations lower to ordinary Lean class declarations." },
    });
    registry.registerOperation("lean.class.project", {
      requiredCapabilities: ["lean.typeclass"],
      verification: { level: "kernel-checkable", notes: "Class methods lower to Lean generated instance-implicit field projections." },
    });
    registry.registerOperation("lean.instance.decl", {
      requiredCapabilities: ["lean.typeclass"],
      verification: { level: "kernel-checkable", notes: "Instance declarations lower to ordinary Lean instance declarations." },
    });

    registry.registerDeclarationSyntax({ keyword: "class", parse: parseClass });
    registry.registerDeclarationSyntax({ keyword: "instance", parse: parseInstance });

    registry.registerDeclarationElaborator({
      kind: "lean.class",
      declare(decl, context) {
        const payload = classPayloadOf(decl);
        const semanticName = context.qualifyName(payload.name);
        const sectionParams = context.selectSectionVariables(classReferencedSectionNames(payload), explicitBinderNames(payload.params));
        const normalized = elaborateTypeParams(payload.params, context, sectionParams);
        const parentTypes: IRType[] = [];
        const inheritedFields: { readonly name: string; readonly type: IRType }[] = [];
        for (const parentSurface of payload.parents ?? []) {
          const parentType = context.withTypeLocals(normalized.typeLocals, () => context.withLocals(normalized.valueLocals, () => context.resolveTypeExpression(parentSurface)));
          const parentName = classNameFromType(parentType);
          if (!parentName) throw new ProofScriptError("PS2504", `Class '${payload.name}' may extend only declared classes.`);
          const parent = context.getClass(parentName);
          if (!parent) throw new ProofScriptError("PS2508", `Parent class metadata for '${parentName}' is unavailable.`);
          const typeSubs = new Map<string, IRType>();
          const valueSubs = new Map<string, IRExpr>();
          parent.params.forEach((param, index) => {
            const arg = parentType.args?.[index];
            if (param.isTypeParam && arg?.kind === "type") typeSubs.set(param.name, arg.value);
            else if (!param.isTypeParam && arg?.kind === "term") valueSubs.set(param.name, arg.value);
          });
          parentTypes.push(parentType);
          for (const field of parent.fields) {
            const inherited = { name: field.name, type: substituteType(field.type, typeSubs, valueSubs), inheritedFrom: field.inheritedFrom ?? parentName };
            const prior = inheritedFields.find((candidate) => candidate.name === field.name);
            if (prior) {
              if (prior.type.id !== inherited.type.id) throw new ProofScriptError("PS2531", `Class '${payload.name}' inherits incompatible overlapping field '${field.name}'.`);
              continue;
            }
            inheritedFields.push(inherited);
          }
        }
        const ownFields: { readonly name: string; readonly type: IRType }[] = [];
        const priorFieldLocals = new Map<string, IRType>();
        for (const field of inheritedFields) priorFieldLocals.set(field.name, field.type);
        for (const field of payload.fields) {
          if (inheritedFields.some((item) => item.name === field.name) || ownFields.some((item) => item.name === field.name)) {
            throw new ProofScriptError("PS2509", `Class '${payload.name}' redeclares inherited or prior field '${field.name}'.`);
          }
          const type = fieldType(field, context, normalized.typeLocals, normalized.valueLocals, priorFieldLocals);
          ownFields.push({ name: field.name, type });
          priorFieldLocals.set(field.name, type);
        }
        const descriptor: ClassDescriptor = {
          name: semanticName,
          sourceName: payload.name,
          params: normalized.params,
          fields: [...inheritedFields, ...ownFields],
          ownFields,
          ...(parentTypes.length ? { parentTypes, parentType: parentTypes[0] } : {}),
          ...(payload.deriving?.length ? { deriving: payload.deriving } : {}),
          generated: {
            methods: ownFields.map((field) => `${semanticName}.${field.name}`),
            parentProjections: parentTypes.map((parentType) => {
              const parentName = classNameFromType(parentType)!;
              return { parentName, projection: `${semanticName}.to${parentName.split(".").at(-1)!}` };
            }),
          },
          family: `lean.class:${semanticName}`,
        };
        context.declareClass(descriptor);
        context.declareSemanticInfo(`class.decl:${semanticName}`, descriptor);
        if (normalized.params.length === 0) context.declareType(semanticName, semanticName, `lean.class:${semanticName}`);
        else context.declareTypeFamily(semanticName, declaredTypeFamilySpec({
          schema: "proofscript.type-family/v1",
          name: semanticName,
          family: `lean.class:${semanticName}`,
          params: normalized.params,
        }));

        // Lean class fields generate projections whose class instance is itself
        // an instance-implicit argument. Register those projections as ordinary
        // functions so the existing application elaborator performs parameter
        // inference and instance synthesis rather than special-casing methods.
        const classArgs = normalized.params.map((param) => param.isTypeParam
          ? typeArgument(makeTypeVariable(param.name, param.type))
          : termArgument({ kind: "var", name: param.name, type: param.type }));
        const selfType = classType(semanticName, classArgs);
        for (const field of descriptor.ownFields ?? descriptor.fields) {
          const flattened = flattenPi(field.type);
          const projectionParams: IRParam[] = [
            ...normalized.params.map((param) => ({ ...param, binderInfo: "implicit" as const })),
            { name: "self", type: selfType, binderInfo: "instance" as const },
            ...flattened.params,
          ];
          context.declareFunction(`${semanticName}.${field.name}`, projectionParams, flattened.result, {
            operation: "lean.class.project",
            payload: { className: semanticName, fieldName: field.name, classParamCount: normalized.params.length, methodParamCount: flattened.params.length },
          });
        }
        for (const parentType of parentTypes) {
          const selfType = classType(semanticName, classArgs);
          const parentName = classNameFromType(parentType)!;
          const parentBaseName = parentName.split(".").at(-1)!;
          context.declareInstanceCandidate({
            name: `${semanticName}.to${parentBaseName}`,
            params: [
              ...normalized.params.map((param) => ({ ...param, binderInfo: "implicit" as const })),
              { name: "self", type: selfType, binderInfo: "instance" as const },
            ],
            resultType: parentType,
            priority: 1000,
          });
        }
        if (payload.deriving?.length) context.declareSemanticInfo(`class.deriving:${semanticName}`, payload.deriving);
        context.declareSemanticInfo(`class.generated:${semanticName}`, descriptor.generated);
        context.setElaborationInfo(`class.normalized:${semanticName}`, { descriptor } satisfies NormalizedClassPayload);
      },
      elaborate(decl, context) {
        const payload = classPayloadOf(decl);
        const semanticName = context.qualifyName(payload.name);
        const normalized = context.getElaborationInfo<NormalizedClassPayload>(`class.normalized:${semanticName}`);
        if (!normalized) throw new ProofScriptError("PS2507", `Missing normalized class '${payload.name}'.`);
        return { kind: "extension", op: "lean.class.decl", payload: normalized.descriptor };
      },
    });

    registry.registerDeclarationElaborator({
      kind: "lean.instance",
      acceptedPrefixOwners: ["lean.instance.local", "lean.instance.scoped", "lean.attribute.default_instance", "lean.declaration.attributes", "lean.declaration.visibility"],
      declare(decl, context) {
        const payload = instancePayloadOf(decl);
        const normalizedParams = normalizeInstanceParams(payload, context);
        const targetType = context.withTypeLocals(normalizedParams.typeLocals, () =>
          context.withLocals(normalizedParams.valueLocals, () => context.resolveTypeExpression(payload.target)),
        );
        const className = classNameFromType(targetType);
        if (!className) throw new ProofScriptError("PS2513", `Instance target '${targetType.displayName}' is not a declared class type.`);
        const descriptor = context.getClass(className);
        if (!descriptor) throw new ProofScriptError("PS2514", `Class metadata for '${className}' is unavailable.`);
        const name = context.qualifyName(payload.sourceName);
        const environment = instanceEnvironmentOf(decl, context);
        context.setElaborationInfo(`instance.normalized:${name}`, { name, priority: payload.priority, params: normalizedParams.params, targetType, fields: [], descriptor, payload, normalizedParams, ...environment });
      },
      elaborate(decl, context) {
        const payload = instancePayloadOf(decl);
        const preliminary = context.getElaborationInfo<any>(`instance.normalized:${context.qualifyName(payload.sourceName)}`);
        if (!preliminary) throw new ProofScriptError("PS2515", "Missing normalized instance declaration.");

        const elaborateFields = (head: any): { readonly fields: { name: string; value: IRExpr }[]; readonly descriptor: ClassDescriptor } => {
          const descriptor = head.descriptor as ClassDescriptor;
          const targetArgs = head.targetType.args ?? [];
          const typeSubstitutions = new Map<string, IRType>();
          const fieldValueSubstitutions = new Map<string, IRExpr>();
          descriptor.params.forEach((param, index) => {
            const arg = targetArgs[index];
            if (param.isTypeParam && arg?.kind === "type") typeSubstitutions.set(param.name, arg.value);
            else if (!param.isTypeParam && arg?.kind === "term") fieldValueSubstitutions.set(param.name, arg.value);
          });
          const supplied = new Map<string, InstanceFieldSurface>();
          for (const field of payload.fields) {
            if (supplied.has(field.name)) throw new ProofScriptError("PS2516", `Instance field '${field.name}' is supplied more than once.`);
            if (!descriptor.fields.some((item) => item.name === field.name)) throw new ProofScriptError("PS2517", `Class '${descriptor.name}' has no field '${field.name}'.`);
            supplied.set(field.name, field);
          }
          const missing = descriptor.fields.find((field) => !supplied.has(field.name));
          if (missing) throw new ProofScriptError("PS2518", `Instance '${head.name}' is missing class field '${missing.name}'.`);
          const fields: { name: string; value: IRExpr }[] = [];
          const localTypes = head.normalizedParams.typeLocals as ReadonlyMap<string, IRType>;
          const localValues = head.normalizedParams.valueLocals as ReadonlyMap<string, IRType>;
          const instanceLocals = head.normalizedParams.instanceLocals as ReadonlyMap<string, IRType>;
          for (const fieldDescriptor of descriptor.fields) {
            const source = supplied.get(fieldDescriptor.name)!;
            let sourceExpr: SurfaceExpr = source.value;
            if (source.params.length > 0) sourceExpr = { kind: "lambda", params: source.params, body: source.value };
            const expected = substituteType(fieldDescriptor.type, typeSubstitutions, fieldValueSubstitutions);
            const value = context.withTypeLocals(localTypes, () => context.withInstanceLocals(instanceLocals, () =>
              context.withLocals(localValues, () => context.elaborateExpression(sourceExpr, expected)),
            ));
            fields.push({ name: fieldDescriptor.name, value });
            fieldValueSubstitutions.set(fieldDescriptor.name, value);
          }
          return { fields, descriptor };
        };

        const usage = context.captureSectionInstanceUsage(() => elaborateFields(preliminary));
        let normalized = preliminary;
        let fieldResult = usage.value;
        if (usage.usedNames.size > 0) {
          const normalizedParams = normalizeInstanceParams(payload, context, usage.usedNames);
          const targetType = context.withTypeLocals(normalizedParams.typeLocals, () =>
            context.withLocals(normalizedParams.valueLocals, () => context.resolveTypeExpression(payload.target)),
          );
          const className = classNameFromType(targetType);
          if (!className) throw new ProofScriptError("PS2513", `Instance target '${targetType.displayName}' is not a declared class type.`);
          const descriptor = context.getClass(className);
          if (!descriptor) throw new ProofScriptError("PS2514", `Class metadata for '${className}' is unavailable.`);
          normalized = { ...preliminary, params: normalizedParams.params, targetType, descriptor, normalizedParams };
          fieldResult = elaborateFields(normalized);
          context.setElaborationInfo(`instance.normalized:${normalized.name}`, normalized);
        }
        const fields = fieldResult.fields;

        context.declareInstanceCandidate({
          name: normalized.name,
          params: normalized.params,
          resultType: normalized.targetType,
          priority: normalized.priority,
          visibility: normalized.visibility,
          ...(normalized.localScopeId === undefined ? {} : { localScopeId: normalized.localScopeId }),
          ...(normalized.scopeName === undefined ? {} : { scopeName: normalized.scopeName }),
          ...(normalized.defaultInstancePriority === undefined ? {} : { defaultInstancePriority: normalized.defaultInstancePriority }),
        });
        return {
          kind: "extension",
          op: "lean.instance.decl",
          args: fields.map((field) => field.value),
          payload: {
            name: normalized.name,
            sourceName: payload.sourceName,
            priority: normalized.priority,
            params: normalized.params,
            targetType: normalized.targetType,
            fields,
            visibility: normalized.visibility,
            ...(normalized.localScopeId === undefined ? {} : { localScopeId: normalized.localScopeId }),
            ...(normalized.scopeName === undefined ? {} : { scopeName: normalized.scopeName }),
            ...(normalized.defaultInstancePriority === undefined ? {} : { defaultInstancePriority: normalized.defaultInstancePriority }),
            ...(normalized.hasDefaultInstanceAttribute ? { hasDefaultInstanceAttribute: true } : {}),
          } satisfies NormalizedInstancePayload,
        };
      },
    });

    registry.registerLeanTypeFamilyLowering("lean.class", (type, context) => {
      const name = type.family?.slice("lean.class:".length) ?? type.displayName;
      const leanName = name.includes(".") ? `_root_.ProofScript.Generated.${name}` : name;
      const args = (type.args ?? []).map((arg) => context.emitTypeArgument(arg)).join(" ");
      return args ? `(${leanName} ${args})` : leanName;
    });

    registry.registerLeanDeclarationLowering("lean.class.decl", (declaration, context) => {
      const descriptor = declaration.payload as ClassDescriptor;
      const params = descriptor.params.map((param) => {
        const base = context.emitType(param.type);
        const rendered = param.instanceSearchMode === "out" ? `outParam ${base}` : param.instanceSearchMode === "semiOut" ? `semiOutParam ${base}` : base;
        switch (param.binderInfo) {
          case "explicit": return `(${param.name} : ${rendered})`;
          case "implicit": return `{${param.name} : ${rendered}}`;
          case "strictImplicit": return `⦃${param.name} : ${rendered}⦄`;
          case "instance": return `[${param.name} : ${rendered}]`;
        }
      }).join(" ");
      const parents = descriptor.parentTypes ?? (descriptor.parentType ? [descriptor.parentType] : []);
      const parent = parents.length ? ` extends ${parents.map((item) => context.emitType(item)).join(", ")}` : "";
      const fields = (descriptor.ownFields ?? descriptor.fields).map((field) => `  ${field.name} : ${context.emitType(field.type)}`).join("\n");
      const rendered = `class ${descriptor.sourceName ?? descriptor.name}${params ? ` ${params}` : ""}${parent} where${fields ? `\n${fields}` : ""}`;
      return descriptor.deriving?.length ? `${rendered}\nderiving ${descriptor.deriving.join(", ")}` : rendered;
    });

    registry.registerLeanExprLowering("lean.class.project", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4520", "Expected class projection operation.");
      const payload = expr.payload as { className: string; fieldName: string; methodParamCount?: number };
      const methodCount = payload.methodParamCount ?? 0;
      const selfIndex = Math.max(0, expr.args.length - methodCount - 1);
      const self = expr.args[selfIndex];
      if (!self) throw new ProofScriptError("PS4521", "Malformed class projection: missing instance argument.");
      const methodArgs = expr.args.slice(selfIndex + 1);
      const className = payload.className.includes(".") ? `_root_.ProofScript.Generated.${payload.className}` : payload.className;
      const renderedArgs = methodArgs.map((arg) => context.emitExpr(arg)).join(" ");
      return `(${className}.${payload.fieldName} (self := ${context.emitExpr(self)})${renderedArgs ? ` ${renderedArgs}` : ""})`;
    });

    registry.registerLeanDeclarationLowering("lean.instance.decl", (declaration, context) => {
      const payload = declaration.payload as NormalizedInstancePayload;
      const params = payload.params.map((param) => {
        const type = context.emitType(param.type);
        switch (param.binderInfo) {
          case "explicit": return `(${param.name} : ${type})`;
          case "implicit": return `{${param.name} : ${type}}`;
          case "strictImplicit": return `⦃${param.name} : ${type}⦄`;
          case "instance": return `[${param.name} : ${type}]`;
        }
      }).join(" ");
      const priority = payload.priority === 1000 ? "" : ` (priority := ${payload.priority})`;
      const visibility = payload.visibility === "local" ? "local " : payload.visibility === "scoped" ? "scoped " : "";
      const defaultAttr = payload.hasDefaultInstanceAttribute
        ? `@[default_instance${payload.defaultInstancePriority === undefined || payload.defaultInstancePriority === 1000 ? "" : ` ${payload.defaultInstancePriority}`}]\n`
        : "";
      const fields = payload.fields.map((field) => `  ${field.name} := ${context.emitExpr(field.value)}`).join("\n");
      return `${defaultAttr}${visibility}instance${priority} ${payload.sourceName}${params ? ` ${params}` : ""} : ${context.emitType(payload.targetType)} := {\n${fields}\n}`;
    });
  },
};

export default plugin;

import { parseBinderGroups } from "../../core/binders.js";
import { ProofScriptError } from "../../core/errors.js";
import type { DeclarationElaborationContext, ParserCursor, PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import type { IRExpr, IRParam, IRType, SurfaceDecl, SurfaceExpr, SurfaceParam, SurfaceTypeExpr } from "../../core/model.js";
import { isPropSort, isPropositionType, isSortType, makeTypeVariable } from "../../core/type-utils.js";
import { collectSurfaceExprNames, collectSurfaceParamTypeNames, collectSurfaceTypeNames, explicitBinderNames } from "../../core/surface-names.js";

interface NamedHeader {
  readonly name: string;
  readonly universeParams: readonly string[];
  readonly params: readonly SurfaceParam[];
}
interface TypeAbbrevSurface extends NamedHeader { readonly target: SurfaceTypeExpr; }
interface ValueDeclSurface extends NamedHeader {
  readonly returnType: SurfaceTypeExpr;
  readonly body?: SurfaceExpr;
}
interface ExampleSurface {
  readonly params: readonly SurfaceParam[];
  readonly expectedType: SurfaceTypeExpr;
  readonly body?: SurfaceExpr;
  readonly proof?: string;
}
interface Telescope {
  readonly params: readonly IRParam[];
  readonly resultType: IRType;
  readonly typeLocals: ReadonlyMap<string, IRType>;
  readonly valueLocals: ReadonlyMap<string, IRType>;
  readonly instanceLocals: ReadonlyMap<string, IRType>;
}
interface NamedIrPayload {
  readonly name: string;
  readonly sourceName: string;
  readonly universeParams?: readonly string[];
  readonly params: readonly IRParam[];
  readonly returnType: IRType;
  readonly body?: IRExpr;
}
interface TypeAbbrevIrPayload {
  readonly name: string;
  readonly sourceName: string;
  readonly targetType: IRType;
}
interface ExampleIrPayload {
  readonly params: readonly IRParam[];
  readonly expectedType: IRType;
  readonly body?: IRExpr;
  readonly proof?: string;
}

function parseUniverses(cursor: ParserCursor): readonly string[] {
  const universeParams: string[] = [];
  if (cursor.peek(".") && cursor.peekAhead(1, "{")) {
    cursor.consume("."); cursor.consume("{"); universeParams.push(cursor.parseIdentifier());
    while (cursor.peek(",")) { cursor.consume(","); universeParams.push(cursor.parseIdentifier()); }
    cursor.expect("}");
  }
  return universeParams;
}

function parseNamedHeader(cursor: ParserCursor): NamedHeader {
  const name = cursor.parseIdentifier();
  const universeParams = parseUniverses(cursor);
  const params = parseBinderGroups(cursor, { allowDefaults: true });
  return { name, universeParams, params };
}

function parseDirectBody(cursor: ParserCursor): SurfaceExpr {
  cursor.expect(":=");
  if (cursor.peek("{")) {
    cursor.consume("{");
    const body = cursor.parseExpression();
    cursor.expect("}");
    if (cursor.peek(";")) cursor.consume(";");
    return body;
  }
  const body = cursor.parseExpression();
  if (cursor.peek(";")) cursor.consume(";");
  return body;
}

function parseAbbrev(cursor: ParserCursor): SurfaceDecl {
  const header = parseNamedHeader(cursor);
  if (cursor.peek(":=")) {
    if (header.params.length > 0) throw new ProofScriptError("PS2650", "Generic type abbreviations are deferred in the v0.32 declaration tranche; give value abbreviations an explicit result type.");
    cursor.consume(":=");
    const target = cursor.parseTypeExpression();
    if (cursor.peek(";")) cursor.consume(";");
    return { kind: "lean.abbrev", payload: { ...header, target } satisfies TypeAbbrevSurface };
  }
  cursor.expect(":");
  const returnType = cursor.parseTypeExpression();
  const body = parseDirectBody(cursor);
  return { kind: "lean.abbrev", payload: { ...header, returnType, body } satisfies ValueDeclSurface };
}

function parseOpaque(cursor: ParserCursor): SurfaceDecl {
  const header = parseNamedHeader(cursor);
  cursor.expect(":");
  const returnType = cursor.parseTypeExpression();
  if (cursor.peek(":=")) {
    const body = parseDirectBody(cursor);
    return { kind: "lean.opaque", payload: { ...header, returnType, body } satisfies ValueDeclSurface };
  }
  if (cursor.peek(";")) cursor.consume(";");
  return { kind: "lean.opaque", payload: { ...header, returnType } satisfies ValueDeclSurface };
}

function parseAxiom(cursor: ParserCursor): SurfaceDecl {
  const header = parseNamedHeader(cursor);
  cursor.expect(":");
  const returnType = cursor.parseTypeExpression();
  if (cursor.peek(":=")) throw new ProofScriptError("PS2651", "An axiom has a type but no value; remove ':=' and the body.");
  if (cursor.peek(";")) cursor.consume(";");
  return { kind: "lean.axiom", payload: { ...header, returnType } satisfies ValueDeclSurface };
}

function parseExample(cursor: ParserCursor): SurfaceDecl {
  const params = parseBinderGroups(cursor, { allowDefaults: true });
  cursor.expect(":");
  const expectedType = cursor.parseTypeExpression();
  cursor.expect(":=");
  if (cursor.peek("by")) {
    cursor.consume("by"); cursor.expect("{");
    const proofTokens: string[] = [];
    while (!cursor.peek("}")) proofTokens.push(cursor.consume());
    cursor.expect("}");
    if (cursor.peek(";")) cursor.consume(";");
    if (proofTokens.length === 0) throw new ProofScriptError("PS2652", "Example tactic proof body must not be empty.");
    return { kind: "lean.example", payload: { params, expectedType, proof: proofTokens.join(" ") } satisfies ExampleSurface };
  }
  let body: SurfaceExpr;
  if (cursor.peek("{")) {
    cursor.consume("{"); body = cursor.parseExpression(); cursor.expect("}");
  } else body = cursor.parseExpression();
  if (cursor.peek(";")) cursor.consume(";");
  return { kind: "lean.example", payload: { params, expectedType, body } satisfies ExampleSurface };
}

function referencedNames(surface: ValueDeclSurface): Set<string> {
  const result = new Set<string>();
  collectSurfaceParamTypeNames(surface.params, result);
  collectSurfaceTypeNames(surface.returnType, result);
  if (surface.body) collectSurfaceExprNames(surface.body, result);
  return result;
}

function elaborateTelescope(surface: Pick<ValueDeclSurface, "params" | "returnType">, context: DeclarationElaborationContext, extra: ReadonlySet<string> = new Set<string>()): Telescope {
  const referenced = new Set<string>();
  collectSurfaceParamTypeNames(surface.params, referenced);
  collectSurfaceTypeNames(surface.returnType, referenced);
  for (const item of extra) referenced.add(item);
  const sectionParams = context.selectSectionVariables(referenced, explicitBinderNames(surface.params));
  const params: IRParam[] = [...sectionParams];
  const typeLocals = new Map<string, IRType>();
  const valueLocals = new Map<string, IRType>();
  const instanceLocals = new Map<string, IRType>();
  for (const param of sectionParams) {
    if (param.isTypeParam) typeLocals.set(param.name, makeTypeVariable(param.name, param.type));
    else { valueLocals.set(param.name, param.type); if (param.binderInfo === "instance") instanceLocals.set(param.name, param.type); }
  }
  for (const surfaceParam of surface.params) {
    const type = context.withTypeLocals(typeLocals, () => context.withLocals(valueLocals, () => context.resolveTypeExpression(surfaceParam.type)));
    const isTypeParam = isSortType(type);
    params.push({ name: surfaceParam.name, type, binderInfo: surfaceParam.binderInfo, ...(isTypeParam ? { isTypeParam: true } : {}) });
    if (isTypeParam) typeLocals.set(surfaceParam.name, makeTypeVariable(surfaceParam.name, type));
    else { valueLocals.set(surfaceParam.name, type); if (surfaceParam.binderInfo === "instance") instanceLocals.set(surfaceParam.name, type); }
  }
  const resultType = context.withTypeLocals(typeLocals, () => context.withLocals(valueLocals, () => context.resolveTypeExpression(surface.returnType)));
  return { params, resultType, typeLocals, valueLocals, instanceLocals };
}

function elaborateBody(surface: ValueDeclSurface, telescope: Telescope, context: DeclarationElaborationContext): IRExpr | undefined {
  if (!surface.body) return undefined;
  return context.withTypeLocals(telescope.typeLocals, () => context.withInstanceLocals(telescope.instanceLocals, () => context.withLocals(telescope.valueLocals, () => context.elaborateExpression(surface.body!, telescope.resultType))));
}

function renderLeanBinder(param: IRParam, type: string): string {
  switch (param.binderInfo) {
    case "explicit": return `(${param.name} : ${type})`;
    case "implicit": return `{${param.name} : ${type}}`;
    case "strictImplicit": return `⦃${param.name} : ${type}⦄`;
    case "instance": return `[${param.name} : ${type}]`;
  }
}

function renderLeanNamed(keyword: string, payload: NamedIrPayload, context: import("../../core/model.js").LeanDeclarationContext, bodyMode: "required" | "optional" | "none"): string {
  const params = payload.params.map((param) => renderLeanBinder(param, context.emitType(param.type))).join(" ");
  const head = `${keyword} ${payload.sourceName}${payload.universeParams?.length ? `.{${payload.universeParams.join(", ")}}` : ""}${params ? ` ${params}` : ""} : ${context.emitType(payload.returnType)}`;
  if (bodyMode === "none") return head;
  if (!payload.body) return bodyMode === "optional" ? head : (() => { throw new ProofScriptError("PS4650", `Malformed ${keyword} declaration: missing body.`); })();
  return `${head} := ${context.emitExpr(payload.body)}`;
}

function emitTypescriptNamed(payload: NamedIrPayload, context: import("../../core/model.js").EmitContext, kind: string): string {
  if (!payload.body) throw new ProofScriptError("PS3650", `TypeScript cannot execute bodyless ${kind} '${payload.sourceName}' without an explicit runtime implementation.`);
  const typeParams = payload.params.filter((param) => param.isTypeParam);
  const badTypeParam = typeParams.find((param) => isPropSort(param.type) || param.binderInfo === "explicit");
  if (badTypeParam) throw new ProofScriptError("PS3651", `TypeScript correspondence for ${kind} '${payload.sourceName}' does not support binder '${badTypeParam.name}'.`);
  const valueParams = payload.params.filter((param) => !param.isTypeParam);
  const badValue = valueParams.find((param) => param.binderInfo !== "explicit" || isPropositionType(param.type));
  if (badValue) throw new ProofScriptError("PS3652", `TypeScript correspondence for ${kind} '${payload.sourceName}' does not support runtime binder '${badValue.name}'.`);
  if (isPropositionType(payload.returnType)) throw new ProofScriptError("PS3653", `Proposition-valued ${kind} '${payload.sourceName}' is compile-time/proof-only and must not be emitted as runtime data.`);
  const generics = typeParams.length ? `<${typeParams.map((param) => param.name).join(", ")}>` : "";
  const params = valueParams.map((param) => `${param.name}: ${context.emitType(param.type)}`).join(", ");
  return [`export function ${payload.sourceName}${generics}(${params}): ${context.emitType(payload.returnType)} {`, `  return ${context.emitExpr(payload.body)};`, `}`].join("\n");
}

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.declaration-kinds",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.abbrev.type", "lean.abbrev.value", "lean.opaque.value", "lean.opaque.bodyless", "lean.opaque.proof", "lean.axiom.proof", "lean.axiom.runtime", "lean.example"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "declared" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  setup(registry) {
    registry.registerDeclarationSyntax({ keyword: "abbrev", parse: parseAbbrev });
    registry.registerDeclarationSyntax({ keyword: "opaque", parse: parseOpaque });
    registry.registerDeclarationSyntax({ keyword: "axiom", parse: parseAxiom });
    registry.registerDeclarationSyntax({ keyword: "example", parse: parseExample });

    registry.registerDeclarationElaborator({
      kind: "lean.abbrev",
      declare(decl, context) {
        const surface = decl.payload as TypeAbbrevSurface | ValueDeclSurface;
        for (const u of surface.universeParams) if (!context.hasUniverse(u)) throw new ProofScriptError("PS2653", `Unknown declaration universe '${u}'.`);
        if ("target" in surface) {
          const target = context.resolveTypeExpression(surface.target);
          const semanticName = context.qualifyName(surface.name);
          context.declareNameAlias(semanticName, target.id);
          context.declareSemanticInfo(`type.abbrev:${semanticName}`, target);
          context.setElaborationInfo(`decl.abbrev.type:${semanticName}`, target);
          return;
        }
        const telescope = elaborateTelescope(surface, context);
        context.declareFunction(context.qualifyName(surface.name), telescope.params, telescope.resultType, { universeParams: surface.universeParams });
      },
      elaborate(decl, context) {
        const surface = decl.payload as TypeAbbrevSurface | ValueDeclSurface;
        const semanticName = context.qualifyName(surface.name);
        if ("target" in surface) {
          const targetType = context.getElaborationInfo<IRType>(`decl.abbrev.type:${semanticName}`) ?? context.resolveTypeExpression(surface.target);
          return { kind: "extension", op: "lean.abbrev.type", payload: { name: semanticName, sourceName: surface.name, targetType } satisfies TypeAbbrevIrPayload };
        }
        const preliminary = elaborateTelescope(surface, context);
        const usage = context.captureSectionInstanceUsage(() => elaborateBody(surface, preliminary, context));
        const telescope = elaborateTelescope(surface, context, usage.usedNames);
        const body = elaborateBody(surface, telescope, context)!;
        context.updateFunctionSignature(semanticName, telescope.params, telescope.resultType, { universeParams: surface.universeParams });
        return { kind: "extension", op: isPropositionType(telescope.resultType) ? "lean.abbrev.proof" : "lean.abbrev.value", args: [body], payload: { name: semanticName, sourceName: surface.name, universeParams: surface.universeParams, params: telescope.params, returnType: telescope.resultType, body } satisfies NamedIrPayload };
      },
    });

    registry.registerDeclarationElaborator({
      kind: "lean.opaque",
      declare(decl, context) {
        const surface = decl.payload as ValueDeclSurface;
        for (const u of surface.universeParams) if (!context.hasUniverse(u)) throw new ProofScriptError("PS2653", `Unknown declaration universe '${u}'.`);
        const telescope = elaborateTelescope(surface, context);
        context.declareFunction(context.qualifyName(surface.name), telescope.params, telescope.resultType, { universeParams: surface.universeParams });
      },
      elaborate(decl, context) {
        const surface = decl.payload as ValueDeclSurface;
        const semanticName = context.qualifyName(surface.name);
        const preliminary = elaborateTelescope(surface, context);
        const usage = context.captureSectionInstanceUsage(() => elaborateBody(surface, preliminary, context));
        const telescope = elaborateTelescope(surface, context, usage.usedNames);
        const body = elaborateBody(surface, telescope, context);
        context.updateFunctionSignature(semanticName, telescope.params, telescope.resultType, { universeParams: surface.universeParams });
        const op = isPropositionType(telescope.resultType) ? "lean.opaque.proof" : body ? "lean.opaque.value" : "lean.opaque.bodyless";
        return { kind: "extension", op, ...(body ? { args: [body] } : {}), payload: { name: semanticName, sourceName: surface.name, universeParams: surface.universeParams, params: telescope.params, returnType: telescope.resultType, ...(body ? { body } : {}) } satisfies NamedIrPayload };
      },
    });

    registry.registerDeclarationElaborator({
      kind: "lean.axiom",
      declare(decl, context) {
        const surface = decl.payload as ValueDeclSurface;
        for (const u of surface.universeParams) if (!context.hasUniverse(u)) throw new ProofScriptError("PS2653", `Unknown declaration universe '${u}'.`);
        const telescope = elaborateTelescope(surface, context);
        context.declareFunction(context.qualifyName(surface.name), telescope.params, telescope.resultType, { universeParams: surface.universeParams });
      },
      elaborate(decl, context) {
        const surface = decl.payload as ValueDeclSurface;
        const telescope = elaborateTelescope(surface, context);
        const semanticName = context.qualifyName(surface.name);
        context.updateFunctionSignature(semanticName, telescope.params, telescope.resultType, { universeParams: surface.universeParams });
        return { kind: "extension", op: isPropositionType(telescope.resultType) ? "lean.axiom.proof" : "lean.axiom.runtime", payload: { name: semanticName, sourceName: surface.name, universeParams: surface.universeParams, params: telescope.params, returnType: telescope.resultType } satisfies NamedIrPayload };
      },
    });

    registry.registerDeclarationElaborator({
      kind: "lean.example",
      declare() {},
      elaborate(decl, context) {
        const surface = decl.payload as ExampleSurface;
        const fake: ValueDeclSurface = { name: "<example>", universeParams: [], params: surface.params, returnType: surface.expectedType, ...(surface.body ? { body: surface.body } : {}) };
        const telescope = elaborateTelescope(fake, context);
        if (surface.proof && !isPropositionType(telescope.resultType)) throw new ProofScriptError("PS2654", "A tactic-style example must have a proposition result type.");
        const body = surface.body ? elaborateBody(fake, telescope, context) : undefined;
        return { kind: "extension", op: "lean.example", ...(body ? { args: [body] } : {}), payload: { params: telescope.params, expectedType: telescope.resultType, ...(body ? { body } : {}), ...(surface.proof ? { proof: surface.proof } : {}) } satisfies ExampleIrPayload };
      },
    });

    registry.registerOperation("lean.abbrev.type", { verification: { level: "kernel-checkable", notes: "Reducible type abbreviation preserved as Lean abbrev." }, domain: "runtime" });
    registry.registerOperation("lean.abbrev.value", { verification: { level: "kernel-checkable", notes: "Reducible value abbreviation preserved as Lean abbrev." }, domain: "runtime" });
    registry.registerOperation("lean.abbrev.proof", { verification: { level: "kernel-checkable", notes: "Proposition-valued abbreviation is checked by Lean and erased from TypeScript runtime output." }, domain: "proof" });
    registry.registerOperation("lean.opaque.value", { verification: { level: "kernel-checkable", notes: "Opaque definition body is checked by Lean but unavailable to ordinary kernel delta reduction." }, domain: "runtime" });
    registry.registerOperation("lean.opaque.bodyless", { requiredCapabilities: ["lean.opaque.bodyless.runtime"], verification: { level: "kernel-checkable", notes: "Bodyless opaque declaration delegates inhabitant synthesis to the pinned Lean elaborator; no axiom is introduced." }, domain: "runtime" });
    registry.registerOperation("lean.opaque.proof", { verification: { level: "kernel-checkable", notes: "Proposition-valued opaque declaration is checked by Lean and erased from TypeScript runtime output." }, domain: "proof" });
    registry.registerOperation("lean.axiom.proof", { verification: { level: "kernel-checkable", notes: "Explicit trusted axiom: Lean checks the type but there is no proof term. Certificates must treat this as an admitted assumption." }, domain: "proof" });
    registry.registerOperation("lean.axiom.runtime", { requiredCapabilities: ["lean.axiom.runtime"], verification: { level: "kernel-checkable", notes: "Computational axiom has no implementation; Lean checks only its type and runtime targets require an explicit implementation correspondence." }, domain: "runtime" });
    registry.registerOperation("lean.example", { verification: { level: "kernel-checkable", notes: "Unnamed example is checked by Lean but does not install a user-facing global declaration." }, domain: "proof" });

    registry.registerLeanDeclarationLowering("lean.abbrev.type", (declaration, context) => {
      const payload = declaration.payload as TypeAbbrevIrPayload;
      return `abbrev ${payload.sourceName} := ${context.emitType(payload.targetType)}`;
    });
    for (const op of ["lean.abbrev.value", "lean.abbrev.proof"] as const) registry.registerLeanDeclarationLowering(op, (declaration, context) => renderLeanNamed("abbrev", declaration.payload as NamedIrPayload, context, "required"));
    for (const op of ["lean.opaque.value", "lean.opaque.proof"] as const) registry.registerLeanDeclarationLowering(op, (declaration, context) => renderLeanNamed("opaque", declaration.payload as NamedIrPayload, context, "required"));
    registry.registerLeanDeclarationLowering("lean.opaque.bodyless", (declaration, context) => renderLeanNamed("opaque", declaration.payload as NamedIrPayload, context, "optional"));
    for (const op of ["lean.axiom.proof", "lean.axiom.runtime"] as const) registry.registerLeanDeclarationLowering(op, (declaration, context) => renderLeanNamed("axiom", declaration.payload as NamedIrPayload, context, "none"));
    registry.registerLeanDeclarationLowering("lean.example", (declaration, context) => {
      const payload = declaration.payload as ExampleIrPayload;
      const params = payload.params.map((param) => renderLeanBinder(param, context.emitType(param.type))).join(" ");
      const head = `example${params ? ` ${params}` : ""} : ${context.emitType(payload.expectedType)} :=`;
      if (payload.proof) return `${head} by\n  ${payload.proof}`;
      if (!payload.body) throw new ProofScriptError("PS4651", "Malformed example declaration.");
      return `${head} ${context.emitExpr(payload.body)}`;
    });

    registry.registerTargetDeclarationLowering("typescript", "lean.abbrev.type", (declaration, context) => {
      const payload = declaration.payload as TypeAbbrevIrPayload;
      return `export type ${payload.sourceName} = ${context.emitType(payload.targetType)};`;
    });
    registry.registerTargetDeclarationLowering("typescript", "lean.abbrev.value", (declaration, context) => emitTypescriptNamed(declaration.payload as NamedIrPayload, context, "abbrev"));
    registry.registerTargetDeclarationLowering("typescript", "lean.opaque.value", (declaration, context) => emitTypescriptNamed(declaration.payload as NamedIrPayload, context, "opaque"));
  },
};

export default plugin;

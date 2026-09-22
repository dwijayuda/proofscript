import { parseBinderGroups } from "../../core/binders.js";
import { ProofScriptError } from "../../core/errors.js";
import type { DeclarationElaborationContext, ParserCursor, ProofScriptPlugin } from "../../core/plugin-api.js";
import type { IRExpr, IRParam, IRTerminationJustification, IRType, SurfaceExpr, SurfaceParam, SurfaceTypeExpr } from "../../core/model.js";
import { isPropositionType, isSortType, makePiType, sameType, substituteExpr, substituteType, typeKey } from "../../core/type-utils.js";
import { compilePatternAlternatives, parsePattern, type SurfacePattern } from "./pattern-engine.js";
import { analyzeStructuralRecursion, containsRecursiveCall } from "./def.js";

type LocalSurfaceTermination =
  | { readonly kind: "structural"; readonly parameter: string }
  | { readonly kind: "wellFounded"; readonly measure?: SurfaceExpr; readonly decreasingBy?: string; readonly inferred: boolean; readonly suggest?: boolean };

interface LocalBindingSurfacePayload {
  readonly bindingKind: "let" | "have" | "letRec";
  readonly name?: string;
  readonly pattern?: SurfacePattern;
  /** A simple binding annotation, or a Pi type synthesized from local-function
   * binder sugar plus its declared result type. */
  readonly annotation?: SurfaceTypeExpr;
  readonly value: SurfaceExpr;
  readonly body: SurfaceExpr;
  readonly anaphoric?: boolean;
  readonly functionSugar?: boolean;
  readonly params?: readonly SurfaceParam[];
  readonly returnType?: SurfaceTypeExpr;
  readonly termination?: LocalSurfaceTermination;
}

interface LocalBindingIrPayload {
  readonly bindingKind: "let" | "have" | "letRec";
  readonly name: string;
  readonly binderType: IRType;
  readonly annotated: boolean;
  readonly anaphoric?: boolean;
  readonly functionSugar?: boolean;
  readonly params?: readonly IRParam[];
  readonly returnType?: IRType;
  readonly termination?: IRTerminationJustification;
}

function parseLocalRec(cursor: ParserCursor): SurfaceExpr {
  cursor.consume("rec");
  const name = cursor.parseIdentifier();
  const params = parseBinderGroups(cursor);
  if (params.length === 0) throw new ProofScriptError("PS2711", "Local 'let rec' requires at least one explicit value parameter in the v0.33 structural-recursion slice.");
  cursor.expect(":");
  const returnType = cursor.parseTypeExpression();
  if (!cursor.peek(":=")) {
    throw new ProofScriptError("PS2712", "v0.33 local 'let rec' currently requires a simple ':= { ... }' body; local equation clauses remain deferred.");
  }
  cursor.consume(":=");
  cursor.expect("{");
  const value = cursor.parseExpression();
  if (cursor.peek(";")) throw new ProofScriptError("PS2713", "The final term of a local recursive body must not have a body-level trailing ';'.");
  cursor.expect("}");
  let termination: LocalSurfaceTermination | undefined;
  if (cursor.peek("termination_by")) {
    cursor.consume("termination_by");
    if (cursor.peek("?")) {
      cursor.consume("?");
      termination = { kind: "wellFounded", inferred: true, suggest: true };
    } else if (cursor.peek("structural")) {
      cursor.consume("structural");
      termination = { kind: "structural", parameter: cursor.parseIdentifier() };
    } else {
      const measure = cursor.parseExpression();
      if (cursor.peek("=>")) throw new ProofScriptError("PS2714", "Explicit local termination binders before '=>' remain deferred; name local recursive parameters directly.");
      termination = { kind: "wellFounded", measure, inferred: false };
    }
  }
  if (cursor.peek("decreasing_by")) {
    cursor.consume("decreasing_by");
    cursor.expect("{");
    const tokens: string[] = [];
    let depth = 1;
    while (depth > 0) {
      if (cursor.peek("{")) { depth += 1; tokens.push(cursor.consume()); continue; }
      if (cursor.peek("}")) {
        depth -= 1;
        if (depth === 0) { cursor.consume("}"); break; }
        tokens.push(cursor.consume());
        continue;
      }
      tokens.push(cursor.consume());
    }
    if (tokens.length === 0) throw new ProofScriptError("PS2715", "Local decreasing_by tactic block must not be empty.");
    if (termination?.kind === "structural") throw new ProofScriptError("PS2721", "Local decreasing_by cannot accompany termination_by structural.");
    termination = termination?.kind === "wellFounded"
      ? { ...termination, decreasingBy: tokens.join(" ") }
      : { kind: "wellFounded", inferred: true, decreasingBy: tokens.join(" ") };
  }
  if (!cursor.peek(";")) throw new ProofScriptError("PS2705", "Local 'let rec' requires the literal continuation separator ';'.");
  cursor.consume(";");
  const body = cursor.parseExpression();
  return {
    kind: "extension",
    owner: "core.local.binding",
    payload: { bindingKind: "letRec", name, params, returnType, value, body, ...(termination ? { termination } : {}) } satisfies LocalBindingSurfacePayload,
  };
}

function parseLocalBinding(cursor: ParserCursor, bindingKind: "let" | "have"): SurfaceExpr {
  if (cursor.peek("rec")) {
    if (bindingKind !== "let") throw new ProofScriptError("PS2701", "Only 'let rec' is a recursive local-binding form.");
    return parseLocalRec(cursor);
  }
  if (cursor.peek("+")) {
    throw new ProofScriptError("PS2702", `Modern ${bindingKind} options (+nondep/+usedOnly/+zeta/+postponeValue/+generalize) are reference-defined but deferred beyond the v0.27 local-binding slice.`);
  }
  if (cursor.peek("(")) {
    throw new ProofScriptError("PS2703", "Tuple/parenthesized local patterns require the Product pattern family, which remains deferred in v0.33.");
  }
  if (cursor.peek(".")) {
    const pattern = parsePattern(cursor);
    cursor.expect(":=");
    const value = cursor.parseExpression();
    if (!cursor.peek(";")) {
      throw new ProofScriptError("PS2705", `Local '${bindingKind}' pattern binding requires the literal continuation separator ';'.`);
    }
    cursor.consume(";");
    const body = cursor.parseExpression();
    return {
      kind: "extension",
      owner: "core.local.binding",
      payload: { bindingKind, pattern, value, body } satisfies LocalBindingSurfacePayload,
    };
  }

  let name: string;
  let anaphoric = false;
  if (bindingKind === "let" && cursor.peek(":=")) {
    name = "this";
    anaphoric = true;
  } else {
    name = cursor.parseIdentifier();
  }

  const params: readonly SurfaceParam[] = !anaphoric && ["(", "{", "⦃", "["].some((token) => cursor.peek(token))
    ? parseBinderGroups(cursor)
    : [];

  let annotation: SurfaceTypeExpr | undefined;
  if (cursor.peek(":")) {
    cursor.consume(":");
    const declared = cursor.parseTypeExpression();
    annotation = params.length > 0 ? { kind: "pi", params, codomain: declared } : declared;
  } else if (params.length > 0 && bindingKind === "have") {
    // Lean can infer many local function result types, but have-function sugar
    // interacts with opaque/nondependent elaboration. Keep this tranche explicit.
    throw new ProofScriptError("PS2704", "v0.27 requires a result type for local function-binder sugar on 'have'.");
  }

  cursor.expect(":=");
  let value = cursor.parseExpression();
  if (params.length > 0) value = { kind: "lambda", params, body: value };

  if (!cursor.peek(";")) {
    throw new ProofScriptError("PS2705", `Local '${bindingKind}' binding requires the literal continuation separator ';'.`);
  }
  cursor.consume(";");
  const body = cursor.parseExpression();
  return {
    kind: "extension",
    owner: "core.local.binding",
    payload: {
      bindingKind,
      name,
      ...(annotation ? { annotation } : {}),
      value,
      body,
      ...(anaphoric ? { anaphoric: true } : {}),
      ...(params.length > 0 ? { functionSugar: true } : {}),
    } satisfies LocalBindingSurfacePayload,
  };
}

function payloadOf(expr: SurfaceExpr): LocalBindingSurfacePayload {
  if (expr.kind !== "extension" || expr.owner !== "core.local.binding") {
    throw new ProofScriptError("PS2706", "Malformed local-binding surface expression.");
  }
  return expr.payload as LocalBindingSurfacePayload;
}

function withParamLocals<T>(context: DeclarationElaborationContext, params: readonly IRParam[], fn: () => T, index = 0): T {
  if (index >= params.length) return fn();
  const param = params[index]!;
  return context.withLocal(param.name, param.type, () => withParamLocals(context, params, fn, index + 1));
}

function resolveLocalRecParams(payload: LocalBindingSurfacePayload, context: DeclarationElaborationContext): { readonly params: readonly IRParam[]; readonly returnType: IRType; readonly functionType: IRType } {
  const surfaceParams = payload.params ?? [];
  const params: IRParam[] = [];
  const resolveAt = (index: number): IRType => {
    if (index >= surfaceParams.length) {
      if (!payload.returnType) throw new ProofScriptError("PS2716", "Malformed local recursive binding without a result type.");
      return context.resolveTypeExpression(payload.returnType);
    }
    const surface = surfaceParams[index]!;
    const type = context.resolveTypeExpression(surface.type);
    if (surface.binderInfo !== "explicit" || isSortType(type)) {
      throw new ProofScriptError("PS2717", `v0.33 local recursion currently supports explicit value parameters only; '${surface.name}' is not in that slice.`);
    }
    const param: IRParam = { name: surface.name, type, binderInfo: surface.binderInfo };
    params.push(param);
    return context.withLocal(param.name, param.type, () => resolveAt(index + 1));
  };
  const returnType = resolveAt(0);
  let functionType = returnType;
  for (const param of [...params].reverse()) functionType = makePiType({ name: param.name, binderInfo: param.binderInfo }, param.type, functionType);
  return { params, returnType, functionType };
}

function elaborateLocalRec(payload: LocalBindingSurfacePayload, expected: IRType | undefined, context: DeclarationElaborationContext): IRExpr {
  if (!payload.name || !payload.value || !payload.body) throw new ProofScriptError("PS2718", "Malformed local recursive binding.");
  const resolved = resolveLocalRecParams(payload, context);
  const functionBody = context.withLocal(payload.name, resolved.functionType, () =>
    withParamLocals(context, resolved.params, () => context.elaborateExpression(payload.value, resolved.returnType)),
  );
  let termination: IRTerminationJustification | undefined;
  if (payload.termination?.kind === "wellFounded") {
    const requested = payload.termination;
    if (!containsRecursiveCall(functionBody, payload.name)) throw new ProofScriptError("PS2722", `Well-founded termination was supplied, but local '${payload.name}' is not recursive.`);
    const measure = requested.measure
      ? context.withLocal(payload.name, resolved.functionType, () => withParamLocals(context, resolved.params, () => context.elaborateExpression(requested.measure!)))
      : undefined;
    termination = {
      kind: "wellFounded",
      ...(measure ? { measure } : {}),
      ...(requested.decreasingBy ? { decreasingBy: requested.decreasingBy } : {}),
      inferred: requested.inferred,
      ...(requested.suggest ? { suggest: true } : {}),
    };
  } else {
    termination = analyzeStructuralRecursion(functionBody, payload.name, resolved.params, payload.termination, context);
  }
  const continuation = context.withLocal(payload.name, resolved.functionType, () => context.elaborateExpression(payload.body, expected));
  return {
    kind: "extension",
    op: "core.local.letRec",
    args: [functionBody, continuation],
    payload: {
      bindingKind: "letRec",
      name: payload.name,
      binderType: resolved.functionType,
      annotated: true,
      params: resolved.params,
      returnType: resolved.returnType,
      ...(termination ? { termination } : {}),
    } satisfies LocalBindingIrPayload,
    type: continuation.type,
  };
}

function elaborateLocalBinding(expr: SurfaceExpr, expected: IRType | undefined, context: DeclarationElaborationContext): IRExpr {
  const payload = payloadOf(expr);
  if (payload.bindingKind === "letRec") return elaborateLocalRec(payload, expected, context);
  if (payload.pattern) {
    const value = context.elaborateExpression(payload.value);
    if (payload.bindingKind === "have" && !expected) {
      throw new ProofScriptError("PS2709", "Pattern 'have' requires an expected continuation type in the current nondependent tranche.");
    }
    return compilePatternAlternatives(
      [value],
      [{ sequences: [[payload.pattern]], body: payload.body }],
      expected,
      context,
    ).expression;
  }
  if (!payload.name) throw new ProofScriptError("PS2710", "Malformed named local binding without a binder name.");
  const name = payload.name;
  const annotation = payload.annotation ? context.resolveTypeExpression(payload.annotation) : undefined;
  const value = context.elaborateExpression(payload.value, annotation);
  const binderType = annotation ?? value.type;
  if (annotation && !sameType(value.type, annotation)) {
    throw new ProofScriptError("PS2707", `Local '${name}' has value type '${value.type.displayName}', expected '${annotation.displayName}'.`);
  }

  const body = context.withLocal(name, binderType, () => context.elaborateExpression(payload.body, expected));
  let resultType = body.type;
  if (payload.bindingKind === "let") {
    resultType = substituteType(body.type, new Map(), new Map([[name, value]]));
  } else {
    const substituted = substituteType(body.type, new Map(), new Map([[name, value]]));
    if (typeKey(substituted) !== typeKey(body.type)) {
      throw new ProofScriptError("PS2708", `Local 'have ${name}' is nondependent/opaque; the continuation result type may not depend on that binder.`);
    }
  }

  return {
    kind: "extension",
    op: payload.bindingKind === "let" ? "core.local.let" : "core.local.have",
    args: [value, body],
    payload: {
      bindingKind: payload.bindingKind,
      name,
      binderType,
      annotated: payload.annotation !== undefined,
      ...(payload.anaphoric ? { anaphoric: true } : {}),
      ...(payload.functionSugar ? { functionSugar: true } : {}),
    } satisfies LocalBindingIrPayload,
    type: resultType,
  };
}

function lowerLean(expr: IRExpr, context: import("../../core/model.js").EmitContext): string {
  if (expr.kind !== "extension") throw new ProofScriptError("PS4701", "Expected local-binding IR expression.");
  const payload = expr.payload as LocalBindingIrPayload;
  const value = expr.args[0];
  const body = expr.args[1];
  if (!value || !body) throw new ProofScriptError("PS4702", "Malformed local-binding IR expression.");
  if (payload.bindingKind === "letRec") {
    const params = (payload.params ?? []).map((param) => `(${param.name} : ${context.emitType(param.type)})`).join(" ");
    const result = payload.returnType ? ` : ${context.emitType(payload.returnType)}` : "";
    let termination = "";
    if (payload.termination?.kind === "structural") termination = ` termination_by structural ${payload.termination.parameter}`;
    else if (payload.termination?.kind === "wellFounded") {
      if (payload.termination.suggest) termination += " termination_by?";
      else if (payload.termination.measure) termination += ` termination_by ${context.emitExpr(payload.termination.measure)}`;
      if (payload.termination.decreasingBy) termination += ` decreasing_by ${payload.termination.decreasingBy}`;
    }
    return `(let rec ${payload.name}${params ? ` ${params}` : ""}${result} := ${context.emitExpr(value)}${termination}; ${context.emitExpr(body)})`;
  }
  const head = payload.anaphoric && payload.bindingKind === "let"
    ? "let"
    : `${payload.bindingKind} ${payload.name}`;
  const type = payload.annotated ? ` : ${context.emitType(payload.binderType)}` : "";
  return `(${head}${type} := ${context.emitExpr(value)}; ${context.emitExpr(body)})`;
}

function containsFreeVar(expr: IRExpr, name: string): boolean {
  switch (expr.kind) {
    case "var": return expr.name === name;
    case "literal":
    case "type": return false;
    case "call":
    case "op":
    case "extension": return expr.args.some((arg) => containsFreeVar(arg, name));
    case "apply": return containsFreeVar(expr.callee, name) || expr.args.some((arg) => containsFreeVar(arg, name));
    case "lambda":
    case "quantifier": return expr.params.some((param) => param.name === name) ? false : containsFreeVar(expr.body, name);
  }
}

function lowerTypeScript(expr: IRExpr, context: import("../../core/model.js").EmitContext): string {
  if (expr.kind !== "extension") throw new ProofScriptError("PS3701", "Expected local-binding IR expression.");
  const payload = expr.payload as LocalBindingIrPayload;
  const value = expr.args[0];
  const body = expr.args[1];
  if (!value || !body) throw new ProofScriptError("PS3702", "Malformed local-binding IR expression.");
  if (payload.bindingKind !== "letRec" && isPropositionType(payload.binderType)) {
    if (containsFreeVar(body, payload.name)) {
      throw new ProofScriptError("PS3703", `Proof-valued local '${payload.name}' is runtime-erased and may not be used computationally in the current TypeScript tranche.`);
    }
    return context.emitExpr(body);
  }
  if (payload.bindingKind === "letRec") {
    const params = (payload.params ?? []).map((param) => `${param.name}: ${context.emitType(param.type)}`).join(", ");
    const result = payload.returnType ? context.emitType(payload.returnType) : "unknown";
    return `(() => { function ${payload.name}(${params}): ${result} { return ${context.emitExpr(value)}; } return ${context.emitExpr(body)}; })()`;
  }
  const runtimeName = payload.anaphoric ? "__ps_this" : payload.name;
  const runtimeBody = runtimeName === payload.name
    ? body
    : substituteExpr(body, new Map(), new Map([[payload.name, { kind: "var", name: runtimeName, type: payload.binderType }]]));
  const annotation = payload.annotated && !payload.functionSugar ? `: ${context.emitType(payload.binderType)}` : "";
  return `(() => { const ${runtimeName}${annotation} = ${context.emitExpr(value)}; return ${context.emitExpr(runtimeBody)}; })()`;
}

const plugin: ProofScriptPlugin = {
  id: "proofscript.feature.local-binding",
  version: "0.91.0",
  kind: "feature",
  setup(registry) {
    registry.registerExpressionSyntax({ keyword: "let", owner: "core.local.binding", parse: (cursor) => parseLocalBinding(cursor, "let") });
    registry.registerExpressionSyntax({ keyword: "have", owner: "core.local.binding", parse: (cursor) => parseLocalBinding(cursor, "have") });
    registry.registerExpressionElaborator({ owner: "core.local.binding", elaborate: elaborateLocalBinding });

    registry.registerOperation("core.local.let", {
      requiredCapabilities: ["core.local.binding"],
      verification: { level: "kernel-checkable", notes: "Dependent local let binding; Lean elaborates it as an ordinary let expression." },
      domain: "runtime",
    });
    registry.registerOperation("core.local.have", {
      requiredCapabilities: ["core.local.binding"],
      verification: { level: "kernel-checkable", notes: "Nondependent/opaque local have binding preserved distinctly from let." },
      domain: "runtime",
    });
    registry.registerOperation("core.local.letRec", {
      requiredCapabilities: ["core.local.binding", "core.recursion"],
      verification: { level: "kernel-checkable", notes: "Local recursive function whose structural decrease is justified by the frontend and preserved to Lean let rec." },
      domain: "runtime",
    });

    registry.registerLeanExprLowering("core.local.let", lowerLean);
    registry.registerLeanExprLowering("core.local.have", lowerLean);
    registry.registerLeanExprLowering("core.local.letRec", lowerLean);
    registry.registerTargetExprLowering("typescript", "core.local.let", lowerTypeScript);
    registry.registerTargetExprLowering("typescript", "core.local.have", lowerTypeScript);
    registry.registerTargetExprLowering("typescript", "core.local.letRec", lowerTypeScript);
  },
};

export default plugin;

import { ProofScriptError } from "../../core/errors.js";
import type { DeclarationElaborationContext, ParserCursor, PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import type { IRExpr, IRType, SurfaceExpr } from "../../core/model.js";
import { exprKey, makeSortType, makeTypeTerm, nominalType, sameType, termArgument } from "../../core/type-utils.js";
import { compilePatternAlternatives, parsePattern, type SurfacePattern } from "./pattern-engine.js";

interface IfSurfacePayload {
  readonly form: "if" | "bif";
  readonly condition: SurfaceExpr;
  readonly thenBranch: SurfaceExpr;
  readonly elseBranch: SurfaceExpr;
  readonly binderName?: string;
}

interface IfLetSurfacePayload {
  readonly form: "if-let";
  readonly pattern: SurfacePattern;
  readonly scrutinee: SurfaceExpr;
  readonly thenBranch: SurfaceExpr;
  readonly elseBranch: SurfaceExpr;
}

type ConditionalSurfacePayload = IfSurfacePayload | IfLetSurfacePayload;

interface IfIrPayload {
  readonly form: "if" | "bif";
  /** Runtime decision correspondence for the current implemented subset. */
  readonly decision: "bool" | "eq" | "instance";
  readonly binderName?: string;
}

interface MatchIrPayload {
  readonly typeName: string;
  readonly instantiatedTypeName: string;
  readonly cases: readonly { readonly variant: string; readonly binders: readonly string[] }[];
}

function parseBranch(cursor: ParserCursor): SurfaceExpr {
  cursor.expect("{");
  const body = cursor.parseExpression();
  cursor.expect("}");
  return body;
}

function parseElse(cursor: ParserCursor): SurfaceExpr {
  cursor.expect("else");
  if (cursor.peek("if")) {
    cursor.consume("if");
    return parseIfAfterKeyword(cursor);
  }
  if (cursor.peek("bif")) {
    cursor.consume("bif");
    return parseBifAfterKeyword(cursor);
  }
  return parseBranch(cursor);
}

function parseIfLet(cursor: ParserCursor): SurfaceExpr {
  cursor.expect("let");
  const pattern = parsePattern(cursor);
  cursor.expect(":=");
  const scrutinee = cursor.parseExpression();
  const thenBranch = parseBranch(cursor);
  const elseBranch = parseElse(cursor);
  return {
    kind: "extension",
    owner: "lean.conditional.syntax",
    payload: { form: "if-let", pattern, scrutinee, thenBranch, elseBranch } satisfies IfLetSurfacePayload,
  };
}

function parseIfAfterKeyword(cursor: ParserCursor): SurfaceExpr {
  if (cursor.peek("let")) return parseIfLet(cursor);
  let condition: SurfaceExpr;
  let binderName: string | undefined;
  if (cursor.peek("(")) {
    cursor.consume("(");
    condition = cursor.parseExpression();
    cursor.expect(")");
  } else {
    binderName = cursor.parseIdentifier();
    cursor.expect(":");
    condition = cursor.parseExpression();
  }
  const thenBranch = parseBranch(cursor);
  const elseBranch = parseElse(cursor);
  return {
    kind: "extension",
    owner: "lean.conditional.syntax",
    payload: { form: "if", condition, thenBranch, elseBranch, ...(binderName ? { binderName } : {}) } satisfies IfSurfacePayload,
  };
}

function parseBifAfterKeyword(cursor: ParserCursor): SurfaceExpr {
  cursor.expect("(");
  const condition = cursor.parseExpression();
  cursor.expect(")");
  const thenBranch = parseBranch(cursor);
  const elseBranch = parseElse(cursor);
  return {
    kind: "extension",
    owner: "lean.conditional.syntax",
    payload: { form: "bif", condition, thenBranch, elseBranch } satisfies IfSurfacePayload,
  };
}

function payloadOf(expr: SurfaceExpr): ConditionalSurfacePayload {
  if (expr.kind !== "extension" || expr.owner !== "lean.conditional.syntax") {
    throw new ProofScriptError("PS2802", "Malformed conditional surface expression.");
  }
  return expr.payload as ConditionalSurfacePayload;
}

function elaborateBranches(
  thenSurface: SurfaceExpr,
  elseSurface: SurfaceExpr,
  expected: IRType | undefined,
  context: DeclarationElaborationContext,
  elaborateThen?: () => IRExpr,
): { readonly thenBranch: IRExpr; readonly elseBranch: IRExpr; readonly resultType: IRType } {
  const thenBranch = elaborateThen ? elaborateThen() : context.elaborateExpression(thenSurface, expected);
  const resultType = expected ?? thenBranch.type;
  const elseBranch = context.elaborateExpression(elseSurface, resultType);
  if (!sameType(thenBranch.type, resultType) || !sameType(elseBranch.type, resultType)) {
    throw new ProofScriptError("PS2803", `Conditional branches must have the same type; then is '${thenBranch.type.displayName}', else is '${elseBranch.type.displayName}'.`);
  }
  return { thenBranch, elseBranch, resultType };
}

export function decidableOf(condition: IRExpr): IRType {
  return nominalType(
    `lean.Decidable:${exprKey(condition)}`,
    `Decidable(${condition.type.displayName === "Prop" ? "p" : condition.type.displayName})`,
    "lean.decidable",
    [termArgument(condition)],
  );
}

function notProposition(condition: IRExpr, prop: IRType): IRExpr {
  return { kind: "op", op: "lean.not", args: [condition], type: prop };
}

function notOf(condition: IRExpr, prop: IRType): IRType {
  return makeTypeTerm(notProposition(condition, prop));
}

export function decisionForProposition(condition: IRExpr, context: DeclarationElaborationContext): { readonly kind: "eq" | "instance"; readonly evidence?: IRExpr } {
  if (condition.kind === "op" && condition.op === "proof.eq") {
    const left = condition.args[0];
    const right = condition.args[1];
    if (left && right && left.type.id === right.type.id && (left.type.id === "Nat" || left.type.id === "Bool")) return { kind: "eq" };
  }
  try {
    return { kind: "instance", evidence: context.synthesizeInstance(decidableOf(condition)) };
  } catch (error) {
    if (error instanceof ProofScriptError && error.code === "PS2134") {
      throw new ProofScriptError("PS2804", `Ordinary/dependent if requires a Decidable(p) instance; none is available for '${condition.type.displayName}'.`);
    }
    throw error;
  }
}

function elaborateIfLet(payload: IfLetSurfacePayload, expected: IRType | undefined, context: DeclarationElaborationContext): IRExpr {
  const scrutinee = context.elaborateExpression(payload.scrutinee);
  return compilePatternAlternatives(
    [scrutinee],
    [
      { sequences: [[payload.pattern]], body: payload.thenBranch },
      { sequences: [[{ kind: "wildcard" }]], body: payload.elseBranch },
    ],
    expected,
    context,
  ).expression;
}

function elaborateConditional(expr: SurfaceExpr, expected: IRType | undefined, context: DeclarationElaborationContext): IRExpr {
  const payload = payloadOf(expr);
  if (payload.form === "if-let") return elaborateIfLet(payload, expected, context);

  if (payload.form === "bif") {
    const bool = context.resolveType("Bool");
    const condition = context.elaborateExpression(payload.condition, bool);
    const branches = elaborateBranches(payload.thenBranch, payload.elseBranch, expected, context);
    return {
      kind: "extension",
      op: "lean.bif",
      args: [condition, branches.thenBranch, branches.elseBranch],
      payload: { form: "bif", decision: "bool" } satisfies IfIrPayload,
      type: branches.resultType,
    };
  }

  const prop = context.resolveType("Prop");
  const condition = context.elaborateExpression(payload.condition, prop);
  const decision = decisionForProposition(condition, context);
  let thenBranch: IRExpr;
  if (payload.binderName) {
    const proofType = makeTypeTerm(condition);
    thenBranch = context.withLocal(payload.binderName, proofType, () => context.elaborateExpression(payload.thenBranch, expected));
  } else {
    thenBranch = context.elaborateExpression(payload.thenBranch, expected);
  }
  const resultType = expected ?? thenBranch.type;
  const elseBranch = payload.binderName
    ? context.withLocal(payload.binderName, notOf(condition, prop), () => context.elaborateExpression(payload.elseBranch, resultType))
    : context.elaborateExpression(payload.elseBranch, resultType);
  if (!sameType(thenBranch.type, resultType) || !sameType(elseBranch.type, resultType)) {
    throw new ProofScriptError("PS2809", `Conditional branches must have the same type; then is '${thenBranch.type.displayName}', else is '${elseBranch.type.displayName}'.`);
  }
  return {
    kind: "extension",
    op: "lean.if",
    args: [condition, thenBranch, elseBranch, ...(decision.evidence ? [decision.evidence] : [])],
    payload: { form: "if", decision: decision.kind, ...(payload.binderName ? { binderName: payload.binderName } : {}) } satisfies IfIrPayload,
    type: resultType,
  };
}

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.conditionals",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.if", "lean.bif"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.bool", "proofscript.feature.prop-eq"],
  setup(registry) {
    const prop = makeSortType("Prop");
    registry.registerTypeFamily("Decidable", {
      params: [{ kind: "term", expectedType: () => prop }],
      resolve(args) {
        if (args.length !== 1 || args[0]?.kind !== "term") throw new ProofScriptError("PS2810", "Decidable expects one proposition term argument.");
        return decidableOf(args[0].value);
      },
    });
    registry.registerLeanTypeFamilyLowering("lean.decidable", (type, context) => {
      const argument = type.args?.[0];
      if (!argument || argument.kind !== "term") throw new ProofScriptError("PS4810", "Malformed Decidable type.");
      return `(Decidable ${context.emitExpr(argument.value)})`;
    });
    // First-class canonical equality decision evidence for generic Decidable(p)
    // parameters. Ordinary `if` may still use its historical direct equality
    // classification, but generic instance search needs an explicit dictionary.
    const natCarrier = nominalType("Nat", "Nat");
    const natLeft = { kind: "var", name: "left", type: natCarrier } as IRExpr;
    const natRight = { kind: "var", name: "right", type: natCarrier } as IRExpr;
    const natEquality: IRExpr = { kind: "op", op: "proof.eq", args: [natLeft, natRight], type: prop };
    registry.registerBuiltinInstance({
      name: "__psDecidableEqNat",
      params: [
        { name: "left", type: natCarrier, binderInfo: "explicit" },
        { name: "right", type: natCarrier, binderInfo: "explicit" },
      ],
      resultType: decidableOf(natEquality),
      priority: 1000,
    });
    registry.registerLeanPrelude(`@[instance_reducible] def __psDecidableEqNat (left right : Nat) : Decidable (left = right) := inferInstance`);

    registry.registerExpressionSyntax({ keyword: "if", owner: "lean.conditional.syntax", parse: parseIfAfterKeyword });
    registry.registerExpressionSyntax({ keyword: "bif", owner: "lean.conditional.syntax", parse: parseBifAfterKeyword });
    registry.registerExpressionElaborator({ owner: "lean.conditional.syntax", elaborate: elaborateConditional });

    registry.registerOperation("lean.not", {
      requiredCapabilities: [],
      verification: { level: "kernel-checkable", notes: "Internal proposition negation used for the false proof binder of named proposition-if; exact Lean meaning is Not p." },
      domain: "proof",
    });

    registry.registerOperation("lean.if", {
      requiredCapabilities: ["core.conditional"],
      verification: { level: "kernel-checkable", notes: "Lean proposition-based if with explicit decidability classification." },
    });
    registry.registerOperation("lean.bif", {
      requiredCapabilities: ["core.conditional"],
      verification: { level: "kernel-checkable", notes: "Lean Bool bif conditional semantics." },
    });

    registry.registerLeanExprLowering("lean.not", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1 || !expr.args[0]) throw new ProofScriptError("PS4811", "Malformed internal Not proposition.");
      return `(Not ${context.emitExpr(expr.args[0])})`;
    });
    registry.registerLeanExprLowering("lean.if", (expr, context) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS4801", "Expected if extension IR node.");
      const payload = expr.payload as IfIrPayload;
      const [condition, thenBranch, elseBranch] = expr.args;
      if (!condition || !thenBranch || !elseBranch) throw new ProofScriptError("PS4802", "Malformed if IR node.");
      const binder = payload.binderName ? ` ${payload.binderName} :` : "";
      return payload.binderName
        ? `(if${binder} ${context.emitExpr(condition)} then ${context.emitExpr(thenBranch)} else ${context.emitExpr(elseBranch)})`
        : `(if ${context.emitExpr(condition)} then ${context.emitExpr(thenBranch)} else ${context.emitExpr(elseBranch)})`;
    });
    registry.registerLeanExprLowering("lean.bif", (expr, context) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS4803", "Expected bif extension IR node.");
      const [condition, thenBranch, elseBranch] = expr.args;
      if (!condition || !thenBranch || !elseBranch) throw new ProofScriptError("PS4804", "Malformed bif IR node.");
      return `(bif ${context.emitExpr(condition)} then ${context.emitExpr(thenBranch)} else ${context.emitExpr(elseBranch)})`;
    });
  },
};

export default plugin;

import { ProofScriptError } from "../../core/errors.js";
import type { IRExpr, IRParam, IRType, IRTypeArgument } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import {
  expectTermArgument,
  exprDisplay,
  exprKey,
  makePiType,
  makeSortType,
  makeTypeTerm,
  makeTypeVariable,
  nominalType,
  termArgument,
  typeArgument,
  sameType,
} from "../../core/type-utils.js";

function valueParam(name: string, type: IRType, binderInfo: IRParam["binderInfo"] = "explicit", extra: Partial<IRParam> = {}): IRParam {
  return { name, type, binderInfo, ...extra };
}
function typeExpr(type: IRType, sort: IRType): IRExpr { return { kind: "type", value: type, type: sort }; }
function relationType(carrier: IRType, prop: IRType): IRType {
  return makePiType(undefined, carrier, makePiType(undefined, carrier, prop));
}
function carrierFromRelation(relation: IRExpr, prop: IRType): IRType {
  const outer = relation.type;
  if (outer.form !== "pi" || !outer.domain || !outer.codomain) {
    throw new ProofScriptError("PS2902", `Quot relation must have type A → A → Prop, got '${outer.displayName}'.`);
  }
  const inner = outer.codomain;
  if (inner.form !== "pi" || !inner.domain || !inner.codomain || !sameType(outer.domain, inner.domain) || !sameType(inner.codomain, prop)) {
    throw new ProofScriptError("PS2902", `Quot relation must have type A → A → Prop, got '${outer.displayName}'.`);
  }
  return outer.domain;
}

function quotType(carrier: IRType, relation: IRExpr): IRType {
  return nominalType(
    `lean.quot(${carrier.id},${exprKey(relation)})`,
    `Quot(${carrier.displayName}, ${exprDisplay(relation)})`,
    "lean.quot",
    [typeArgument(carrier), termArgument(relation)],
  );
}
function relationApp(relation: IRExpr, left: IRExpr, right: IRExpr, prop: IRType): IRExpr {
  return { kind: "apply", callee: relation, args: [left, right], type: prop };
}
function eqExpr(left: IRExpr, right: IRExpr, prop: IRType): IRExpr {
  return { kind: "op", op: "proof.eq", args: [left, right], type: prop };
}
function eqType(left: IRExpr, right: IRExpr, prop: IRType): IRType { return makeTypeTerm(eqExpr(left, right, prop)); }
function quotMkExpr(carrier: IRType, carrierSort: IRType, relation: IRExpr, value: IRExpr): IRExpr {
  return { kind: "op", op: "lean.quot.mk", args: [relation, value], type: quotType(carrier, relation) };
}

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.quotient",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.quot", "lean.quot.mk", "lean.quot.lift", "lean.quot.ind", "lean.quot.sound"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.type", "proofscript.feature.prop-eq"],
  setup(registry) {
    const prop = makeSortType("Prop");
    const sortU = makeSortType("Sort", { kind: "param", name: "u" });
    const sortV = makeSortType("Sort", { kind: "param", name: "v" });
    const A = makeTypeVariable("A", sortU);
    const B = makeTypeVariable("B", sortV);
    const relAType = relationType(A, prop);

    // Lean's carrier argument is implicit in `Quot r`; ProofScript preserves
    // that semantic surface as `Quot(r)` and derives the carrier from the
    // relation's elaborated type rather than exposing an implementation-only
    // extra type argument.
    registry.registerTypeFamily("Quot", {
      params: [{ kind: "term" }],
      resolve(args) {
        if (args.length !== 1) throw new ProofScriptError("PS2901", `Quot expects one relation argument, got ${args.length}.`);
        const relation = expectTermArgument(args[0]!, "Quot");
        return quotType(carrierFromRelation(relation, prop), relation);
      },
    });

    const r = { kind: "var", name: "r", type: relAType } as IRExpr;
    const a = { kind: "var", name: "a", type: A } as IRExpr;
    const b = { kind: "var", name: "b", type: A } as IRExpr;

    registry.registerBuiltinFunction("Quot.mk", {
      universeParams: ["u"],
      params: [
        valueParam("A", sortU, "implicit", { isTypeParam: true }),
        valueParam("r", relAType),
        valueParam("a", A),
      ],
      result: quotType(A, r),
      operation: "lean.quot.mk",
    });

    const fType = makePiType(undefined, A, B);
    const f = { kind: "var", name: "f", type: fType } as IRExpr;
    const fa = { kind: "apply", callee: f, args: [a], type: B } as IRExpr;
    const fb = { kind: "apply", callee: f, args: [b], type: B } as IRExpr;
    const relAB = makeTypeTerm(relationApp(r, a, b, prop));
    const respectType = makePiType(
      { name: "a", binderInfo: "explicit" }, A,
      makePiType(
        { name: "b", binderInfo: "explicit" }, A,
        makePiType({ name: "h", binderInfo: "explicit" }, relAB, eqType(fa, fb, prop)),
      ),
    );
    registry.registerBuiltinFunction("Quot.lift", {
      universeParams: ["u", "v"],
      params: [
        valueParam("A", sortU, "implicit", { isTypeParam: true }),
        valueParam("r", relAType, "implicit", { runtimeErased: true }),
        valueParam("B", sortV, "implicit", { isTypeParam: true }),
        valueParam("f", fType),
        valueParam("respect", respectType, "explicit", { isProofParam: true }),
      ],
      result: makePiType(undefined, quotType(A, r), B),
      operation: "lean.quot.lift",
    });

    const qType = quotType(A, r);
    const betaType = makePiType(undefined, qType, prop);
    const beta = { kind: "var", name: "beta", type: betaType } as IRExpr;
    const mkA = quotMkExpr(A, sortU, r, a);
    const betaMkA = makeTypeTerm({ kind: "apply", callee: beta, args: [mkA], type: prop });
    const mkProofType = makePiType({ name: "a", binderInfo: "explicit" }, A, betaMkA);
    const q = { kind: "var", name: "q", type: qType } as IRExpr;
    const betaQ = makeTypeTerm({ kind: "apply", callee: beta, args: [q], type: prop });
    registry.registerBuiltinFunction("Quot.ind", {
      universeParams: ["u"],
      params: [
        valueParam("A", sortU, "implicit", { isTypeParam: true }),
        valueParam("r", relAType, "implicit", { runtimeErased: true }),
        valueParam("beta", betaType, "implicit", { runtimeErased: true }),
        valueParam("mk", mkProofType, "explicit", { isProofParam: true }),
        valueParam("q", qType),
      ],
      result: betaQ,
      operation: "lean.quot.ind",
    });

    const mkLeft = quotMkExpr(A, sortU, r, a);
    const mkRight = quotMkExpr(A, sortU, r, b);
    registry.registerBuiltinFunction("Quot.sound", {
      universeParams: ["u"],
      params: [
        valueParam("A", sortU, "implicit", { isTypeParam: true }),
        valueParam("r", relAType, "implicit", { runtimeErased: true }),
        valueParam("a", A, "implicit", { runtimeErased: true }),
        valueParam("b", A, "implicit", { runtimeErased: true }),
        valueParam("h", relAB, "explicit", { isProofParam: true }),
      ],
      result: eqType(mkLeft, mkRight, prop),
      operation: "lean.quot.sound",
    });

    registry.registerOperation("lean.quot.mk", {
      requiredCapabilities: ["lean.quot.runtime"],
      verification: { level: "kernel-checkable", notes: "Lean primitive Quot.mk; TypeScript has no v0.47 runtime quotient representation." },
      domain: "runtime",
    });
    registry.registerOperation("lean.quot.lift", {
      requiredCapabilities: ["lean.quot.runtime"],
      verification: { level: "kernel-checkable", notes: "Lean primitive Quot.lift with kernel quotient reduction on Quot.mk; TypeScript remains fail-closed." },
      domain: "runtime",
    });
    registry.registerOperation("lean.quot.ind", {
      verification: { level: "kernel-checkable", notes: "Lean primitive proof eliminator Quot.ind." },
      domain: "proof",
    });
    registry.registerOperation("lean.quot.sound", {
      verification: { level: "kernel-checkable", notes: "Lean built-in quotient soundness axiom; no host equality substitute is introduced." },
      domain: "proof",
    });

    registry.registerLeanTypeFamilyLowering("lean.quot", (type, context) => {
      const relation = type.args?.[1];
      if (!relation || relation.kind !== "term") throw new ProofScriptError("PS4901", "Malformed Quot type in Semantic IR.");
      return `(Quot ${context.emitExpr(relation.value)})`;
    });
    registry.registerTargetTypeFamilyLowering("typescript", "lean.quot", () => {
      throw new ProofScriptError("PS3901", "TypeScript backend has no faithful v0.47 runtime representation for Lean Quot; quotient types are checked/Lean-facing and fail closed for execution.");
    });

    registry.registerLeanExprLowering("lean.quot.mk", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4902", "Expected Quot.mk IR node.");
      const relation = expr.args[expr.args.length - 2]!;
      const value = expr.args[expr.args.length - 1]!;
      return `(Quot.mk ${context.emitExpr(relation)} ${context.emitExpr(value)})`;
    });
    registry.registerLeanExprLowering("lean.quot.lift", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4903", "Expected Quot.lift IR node.");
      const f = expr.args[expr.args.length - 2]!;
      const respect = expr.args[expr.args.length - 1]!;
      return `(Quot.lift ${context.emitExpr(f)} ${context.emitExpr(respect)})`;
    });
    registry.registerLeanExprLowering("lean.quot.ind", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4904", "Expected Quot.ind IR node.");
      const mk = expr.args[expr.args.length - 2]!;
      const q = expr.args[expr.args.length - 1]!;
      return `(Quot.ind ${context.emitExpr(mk)} ${context.emitExpr(q)})`;
    });
    registry.registerLeanExprLowering("lean.quot.sound", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4905", "Expected Quot.sound IR node.");
      const r = expr.args[expr.args.length - 4]!;
      const a = expr.args[expr.args.length - 3]!;
      const b = expr.args[expr.args.length - 2]!;
      const h = expr.args[expr.args.length - 1]!;
      return `(Quot.sound (r := ${context.emitExpr(r)}) (a := ${context.emitExpr(a)}) (b := ${context.emitExpr(b)}) ${context.emitExpr(h)})`;
    });
  },
};

export default plugin;

import { ProofScriptError } from "../../core/errors.js";
import type { IRExpr, IRType, IRParam } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { makePiType, makeSortType, makeTypeTerm, makeTypeVariable } from "../../core/type-utils.js";

function eqExpr(left: IRExpr, right: IRExpr, prop: IRType): IRExpr {
  return { kind: "op", op: "proof.eq", args: [left, right], type: prop };
}
function eqType(left: IRExpr, right: IRExpr, prop: IRType): IRType { return makeTypeTerm(eqExpr(left, right, prop)); }
function valueParam(name: string, type: IRType, binderInfo: IRParam["binderInfo"] = "explicit", extra: Partial<IRParam> = {}): IRParam {
  return { name, type, binderInfo, ...extra };
}

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.prop-eq",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["proof.eq", "proof.eq.refl", "proof.eq.symm", "proof.eq.trans", "lean.eq.subst"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  setup(registry) {
    const propSort = makeSortType("Prop");
    registry.registerTypeValue(propSort);
    registry.registerLeanTypeLowering(propSort.id, () => "Prop");

    registry.registerInfixSyntax({ operator: "=", precedence: 10 });
    registry.registerBinaryElaborator({
      operator: "=",
      elaborate(left, right, expected, resolveType) {
        const prop = resolveType("Prop");
        if (left.type.id !== right.type.id) throw new ProofScriptError("PS2511", "Propositional equality requires both sides to have the same type.");
        if (expected && expected.id !== prop.id) throw new ProofScriptError("PS2512", "Propositional equality has type Prop.");
        return eqExpr(left, right, prop);
      },
    });

    // Trusted Lean equality constants are plugin-provided global signatures.
    // They elaborate into explicit proof operations rather than host callbacks.
    const sortU = makeSortType("Sort", { kind: "param", name: "u" });
    const A = makeTypeVariable("A", sortU);
    const a = { kind: "var", name: "a", type: A } as IRExpr;
    const b = { kind: "var", name: "b", type: A } as IRExpr;
    const c = { kind: "var", name: "c", type: A } as IRExpr;

    registry.registerBuiltinFunction("Eq.refl", {
      universeParams: ["u"],
      params: [
        valueParam("A", sortU, "implicit", { isTypeParam: true }),
        valueParam("a", A),
      ],
      result: eqType(a, a, propSort),
      operation: "proof.eq.refl",
    });
    registry.registerBuiltinFunction("Eq.symm", {
      universeParams: ["u"],
      params: [
        valueParam("A", sortU, "implicit", { isTypeParam: true }),
        valueParam("a", A, "implicit", { runtimeErased: true }),
        valueParam("b", A, "implicit", { runtimeErased: true }),
        valueParam("h", eqType(a, b, propSort), "explicit", { isProofParam: true }),
      ],
      result: eqType(b, a, propSort),
      operation: "proof.eq.symm",
    });
    registry.registerBuiltinFunction("Eq.trans", {
      universeParams: ["u"],
      params: [
        valueParam("A", sortU, "implicit", { isTypeParam: true }),
        valueParam("a", A, "implicit", { runtimeErased: true }),
        valueParam("b", A, "implicit", { runtimeErased: true }),
        valueParam("c", A, "implicit", { runtimeErased: true }),
        valueParam("h1", eqType(a, b, propSort), "explicit", { isProofParam: true }),
        valueParam("h2", eqType(b, c, propSort), "explicit", { isProofParam: true }),
      ],
      result: eqType(a, c, propSort),
      operation: "proof.eq.trans",
    });

    const sortV = makeSortType("Sort", { kind: "param", name: "v" });
    const motiveType = makePiType({ name: "x", binderInfo: "explicit" }, A, sortV);
    const motive = { kind: "var", name: "motive", type: motiveType } as IRExpr;
    const motiveAt = (x: IRExpr): IRType => makeTypeTerm({ kind: "apply", callee: motive, args: [x], type: sortV });
    registry.registerBuiltinFunction("Eq.subst", {
      universeParams: ["u", "v"],
      params: [
        valueParam("A", sortU, "implicit", { isTypeParam: true }),
        valueParam("motive", motiveType, "implicit", { runtimeErased: true }),
        valueParam("a", A, "implicit", { runtimeErased: true }),
        valueParam("b", A, "implicit", { runtimeErased: true }),
        valueParam("h1", eqType(a, b, propSort), "explicit", { isProofParam: true }),
        valueParam("h2", motiveAt(a)),
      ],
      result: motiveAt(b),
      operation: "lean.eq.subst",
    });

    for (const op of ["proof.eq", "proof.eq.refl", "proof.eq.symm", "proof.eq.trans"] as const) {
      registry.registerOperation(op, {
        verification: { level: "kernel-checkable", notes: op === "proof.eq" ? "Proof-only propositional equality mapped to Lean Eq." : `Lean equality principle '${op.slice("proof.eq.".length)}'.` },
        domain: "proof",
      });
    }
    registry.registerOperation("lean.eq.subst", {
      requiredCapabilities: ["lean.eq.transport.runtime"],
      verification: { level: "kernel-checkable", notes: "Lean Eq.subst transports values through propositional equality; TypeScript remains fail-closed until a representation-preservation proof/correspondence is defined." },
      domain: "runtime",
    });
    registry.registerLeanExprLowering("proof.eq", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4511", "Expected propositional equality IR node.");
      return `(${context.emitExpr(expr.args[0]!)} = ${context.emitExpr(expr.args[1]!)})`;
    });
    registry.registerLeanExprLowering("proof.eq.refl", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4512", "Expected Eq.refl IR node.");
      return `(Eq.refl ${context.emitExpr(expr.args[expr.args.length - 1]!)})`;
    });
    registry.registerLeanExprLowering("proof.eq.symm", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4513", "Expected Eq.symm IR node.");
      return `(Eq.symm ${context.emitExpr(expr.args[expr.args.length - 1]!)})`;
    });
    registry.registerLeanExprLowering("proof.eq.trans", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4514", "Expected Eq.trans IR node.");
      return `(Eq.trans ${context.emitExpr(expr.args[expr.args.length - 2]!)} ${context.emitExpr(expr.args[expr.args.length - 1]!)})`;
    });
    registry.registerLeanExprLowering("lean.eq.subst", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4515", "Expected Eq.subst IR node.");
      const motive = expr.args[0]?.kind === "type" ? expr.args[1]! : expr.args[0]!;
      return `(Eq.subst (motive := ${context.emitExpr(motive)}) ${context.emitExpr(expr.args[expr.args.length - 2]!)} ${context.emitExpr(expr.args[expr.args.length - 1]!)})`;
    });
  },
};

export default plugin;

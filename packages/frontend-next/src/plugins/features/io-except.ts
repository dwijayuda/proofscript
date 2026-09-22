import { ProofScriptError } from "../../core/errors.js";
import type { IRParam, IRType } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { makeSortType, makeTypeVariable, nominalType, typeArgument } from "../../core/type-utils.js";
import { exceptOf } from "./except.js";
import { toStringClassOf } from "./to-string.js";

function valueParam(name: string, type: IRType, binderInfo: IRParam["binderInfo"] = "explicit", extra: Partial<IRParam> = {}): IRParam {
  return { name, type, binderInfo, ...extra };
}
function eioOf(error: IRType, inner: IRType): IRType {
  return nominalType(`lean.eio(${error.id},${inner.id})`, `EIO(${error.displayName}, ${inner.displayName})`, "lean.eio", [typeArgument(error), typeArgument(inner)]);
}
function ioOf(inner: IRType): IRType {
  return nominalType(`lean.io(${inner.id})`, `IO(${inner.displayName})`, "lean.io", [typeArgument(inner)]);
}

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.io-except",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.eio.ofExcept", "lean.io.ofExcept"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.type", "proofscript.feature.string", "proofscript.feature.except", "proofscript.feature.to-string", "proofscript.feature.io"],
  setup(registry) {
    const sortU = makeSortType("Sort", { kind: "param", name: "u" });
    const sortV = makeSortType("Sort", { kind: "param", name: "v" });
    const E = makeTypeVariable("E", sortU);
    const A = makeTypeVariable("A", sortV);
    const stringType = nominalType("String", "String");

    registry.registerBuiltinFunction("EIO.ofExcept", {
      universeParams: ["u", "v"],
      params: [
        valueParam("E", sortU, "implicit", { isTypeParam: true }),
        valueParam("A", sortV, "implicit", { isTypeParam: true }),
        valueParam("e", exceptOf(E, A)),
      ],
      result: eioOf(E, A),
      operation: "lean.eio.ofExcept",
    });

    // Lean 4.33.1: IO.ofExcept {ε : Type u} {α : Type} [ToString ε]
    // (e : Except ε α). The selected dictionary is retained explicitly in IR.
    const ioErrorSort = makeSortType("Type", { kind: "param", name: "u" });
    const ioValueSort = makeSortType("Type");
    const IOE = makeTypeVariable("IOE", ioErrorSort);
    const IOA = makeTypeVariable("IOA", ioValueSort);
    registry.registerBuiltinFunction("IO.ofExcept", {
      universeParams: ["u"],
      params: [
        valueParam("IOE", ioErrorSort, "implicit", { isTypeParam: true }),
        valueParam("IOA", ioValueSort, "implicit", { isTypeParam: true }),
        valueParam("inst", toStringClassOf(IOE), "instance"),
        valueParam("e", exceptOf(IOE, IOA)),
      ],
      result: ioOf(IOA),
      operation: "lean.io.ofExcept",
    });

    registry.registerOperation("lean.eio.ofExcept", {
      requiredCapabilities: ["core.eio.ofExcept"],
      verification: { level: "kernel-checkable", notes: "Lean EIO.ofExcept conversion from Except with the same typed error channel." },
      domain: "runtime",
    });
    registry.registerOperation("lean.io.ofExcept", {
      requiredCapabilities: ["core.io.ofExcept"],
      verification: { level: "kernel-checkable", notes: "Lean IO.ofExcept with explicit selected ToString error dictionary." },
      domain: "runtime",
    });

    registry.registerLeanExprLowering("lean.eio.ofExcept", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4B10", "Expected EIO.ofExcept IR node.");
      return `(EIO.ofExcept ${context.emitExpr(expr.args.at(-1)!)})`;
    });
    registry.registerLeanExprLowering("lean.io.ofExcept", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length < 2) throw new ProofScriptError("PS4B11", "Expected IO.ofExcept IR node.");
      const inst = expr.args.at(-2)!; const source = expr.args.at(-1)!;
      const errorArg = source.type.args?.[0]; const valueArg = source.type.args?.[1];
      if (!errorArg || errorArg.kind !== "type" || !valueArg || valueArg.kind !== "type") throw new ProofScriptError("PS4B12", "Malformed Except type in IO.ofExcept IR node.");
      return `(@IO.ofExcept ${context.emitType(errorArg.value)} ${context.emitType(valueArg.value)} ${context.emitExpr(inst)} ${context.emitExpr(source)})`;
    });
  },
};

export default plugin;

import { ProofScriptError } from "../../core/errors.js";
import type { IRExpr, IRParam, IRType } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { expectTypeArgument, makePiType, makeSortType, makeTypeVariable, nominalType, typeArgument } from "../../core/type-utils.js";
import { toStringClassOf } from "./to-string.js";

function valueParam(name: string, type: IRType, binderInfo: IRParam["binderInfo"] = "explicit", extra: Partial<IRParam> = {}): IRParam {
  return { name, type, binderInfo, ...extra };
}

function baseIOOf(inner: IRType): IRType {
  return nominalType(`lean.baseio(${inner.id})`, `BaseIO(${inner.displayName})`, "lean.baseio", [typeArgument(inner)]);
}
function eioOf(error: IRType, inner: IRType): IRType {
  return nominalType(`lean.eio(${error.id},${inner.id})`, `EIO(${error.displayName}, ${inner.displayName})`, "lean.eio", [typeArgument(error), typeArgument(inner)]);
}
function ioOf(inner: IRType): IRType {
  return nominalType(`lean.io(${inner.id})`, `IO(${inner.displayName})`, "lean.io", [typeArgument(inner)]);
}

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.io",
  version: "0.91.0",
  kind: "feature",
  semanticIds: [
    "lean.baseio", "lean.eio", "lean.io", "lean.io.error",
    "lean.eio.throw", "lean.eio.tryCatch", "lean.eio.catchExceptions", "lean.eio.adapt",
    "lean.io.error.userError", "lean.io.print", "lean.io.println", "lean.io.eprint", "lean.io.eprintln",
    "lean.io.lazyPure", "lean.baseio.toIO", "lean.baseio.toEIO",
  ],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.type", "proofscript.feature.unit", "proofscript.feature.string", "proofscript.feature.to-string", "proofscript.feature.do"],
  setup(registry) {
    const sortU = makeSortType("Sort", { kind: "param", name: "u" });
    const sortV = makeSortType("Sort", { kind: "param", name: "v" });
    const sortW = makeSortType("Sort", { kind: "param", name: "w" });
    const E = makeTypeVariable("E", sortU);
    const E2 = makeTypeVariable("E2", sortW);
    const A = makeTypeVariable("A", sortV);
    const unit = nominalType("Unit", "Unit");
    const stringType = nominalType("String", "String");
    const ioError = nominalType("lean.io.error", "IO.Error", "lean.io.error");

    registry.registerTypeValue(ioError);
    registry.registerTypeFamily("BaseIO", {
      params: [{ kind: "type" }],
      resolve(args) {
        if (args.length !== 1) throw new ProofScriptError("PS2A01", `BaseIO expects one type argument, got ${args.length}.`);
        return baseIOOf(expectTypeArgument(args[0]!, "BaseIO"));
      },
    });
    registry.registerTypeFamily("EIO", {
      params: [{ kind: "type" }, { kind: "type" }],
      resolve(args) {
        if (args.length !== 2) throw new ProofScriptError("PS2A02", `EIO expects error and result type arguments, got ${args.length}.`);
        return eioOf(expectTypeArgument(args[0]!, "EIO"), expectTypeArgument(args[1]!, "EIO"));
      },
    });
    registry.registerTypeFamily("IO", {
      params: [{ kind: "type" }],
      resolve(args) {
        if (args.length !== 1) throw new ProofScriptError("PS2A03", `IO expects one result type argument, got ${args.length}.`);
        return ioOf(expectTypeArgument(args[0]!, "IO"));
      },
    });

    // Lean 4.33.1: `abbrev IO (α : Type u) : Type u := EIO IO.Error α`.
    // Keep `lean.io` as the observable IR family for backend/capability routing,
    // but expose the reducible target to generic semantic comparison/unification.
    registry.registerReducibleTypeFamily("lean.io", (type) => {
      const inner = type.args?.[0];
      if (!inner || inner.kind !== "type") throw new ProofScriptError("PS2A04", "Malformed IO type in reducible alias expansion.");
      return eioOf(ioError, inner.value);
    });

    registry.registerSemanticInfo("proofscript.do.monad:lean.baseio", {
      family: "lean.baseio", sourceName: "BaseIO", typeArgumentIndex: 0,
    });
    registry.registerSemanticInfo("proofscript.do.monad:lean.eio", {
      family: "lean.eio", sourceName: "EIO", typeArgumentIndex: 1,
    });
    registry.registerSemanticInfo("proofscript.do.monad:lean.io", {
      family: "lean.io", sourceName: "IO", typeArgumentIndex: 0,
    });

    // Lean's typed exception primitive. The result type is inferred from the
    // surrounding expected EIO type, while the error type is inferred from e.
    registry.registerBuiltinFunction("EIO.throw", {
      universeParams: ["u", "v"],
      params: [
        valueParam("E", sortU, "implicit", { isTypeParam: true }),
        valueParam("A", sortV, "implicit", { isTypeParam: true }),
        valueParam("e", E),
      ],
      result: eioOf(E, A),
      operation: "lean.eio.throw",
    });

    const sameErrorHandler = makePiType({ name: "e", binderInfo: "explicit" }, E, eioOf(E, A));
    registry.registerBuiltinFunction("EIO.tryCatch", {
      universeParams: ["u", "v"],
      params: [
        valueParam("E", sortU, "implicit", { isTypeParam: true }),
        valueParam("A", sortV, "implicit", { isTypeParam: true }),
        valueParam("act", eioOf(E, A)),
        valueParam("handle", sameErrorHandler),
      ],
      result: eioOf(E, A),
      operation: "lean.eio.tryCatch",
    });

    const baseHandler = makePiType({ name: "e", binderInfo: "explicit" }, E, baseIOOf(A));
    registry.registerBuiltinFunction("EIO.catchExceptions", {
      universeParams: ["u", "v"],
      params: [
        valueParam("E", sortU, "implicit", { isTypeParam: true }),
        valueParam("A", sortV, "implicit", { isTypeParam: true }),
        valueParam("act", eioOf(E, A)),
        valueParam("handle", baseHandler),
      ],
      result: baseIOOf(A),
      operation: "lean.eio.catchExceptions",
    });

    const adaptFn = makePiType({ name: "e", binderInfo: "explicit" }, E, E2);
    registry.registerBuiltinFunction("EIO.adapt", {
      universeParams: ["u", "w", "v"],
      params: [
        valueParam("E", sortU, "implicit", { isTypeParam: true }),
        valueParam("E2", sortW, "implicit", { isTypeParam: true }),
        valueParam("A", sortV, "implicit", { isTypeParam: true }),
        valueParam("f", adaptFn),
        valueParam("act", eioOf(E, A)),
      ],
      result: eioOf(E2, A),
      operation: "lean.eio.adapt",
    });

    for (const name of ["IO.Error.userError", "IO.userError"] as const) {
      registry.registerBuiltinFunction(name, {
        params: [valueParam("msg", stringType)],
        result: ioError,
        operation: "lean.io.error.userError",
      });
    }

    for (const [name, operation] of [
      ["IO.print", "lean.io.print"], ["IO.println", "lean.io.println"],
      ["IO.eprint", "lean.io.eprint"], ["IO.eprintln", "lean.io.eprintln"],
    ] as const) {
      // Lean 4.33.1: IO.print/println/eprint/eprintln {α : Type u} [ToString α] (s : α).
      const printableSort = makeSortType("Type", { kind: "param", name: "p" });
      const Printable = makeTypeVariable("Printable", printableSort);
      registry.registerBuiltinFunction(name, {
        universeParams: ["p"],
        params: [
          valueParam("Printable", printableSort, "implicit", { isTypeParam: true }),
          valueParam("inst", toStringClassOf(Printable), "instance"),
          valueParam("s", Printable),
        ],
        result: ioOf(unit),
        operation,
      });
    }

    const thunkType = makePiType({ name: "_", binderInfo: "explicit" }, unit, A);
    registry.registerBuiltinFunction("IO.lazyPure", {
      universeParams: ["v"],
      params: [
        valueParam("A", sortV, "implicit", { isTypeParam: true }),
        valueParam("fn", thunkType),
      ],
      result: ioOf(A),
      operation: "lean.io.lazyPure",
    });

    registry.registerBuiltinFunction("BaseIO.toIO", {
      universeParams: ["v"],
      params: [
        valueParam("A", sortV, "implicit", { isTypeParam: true }),
        valueParam("act", baseIOOf(A)),
      ],
      result: ioOf(A),
      operation: "lean.baseio.toIO",
    });

    registry.registerBuiltinFunction("BaseIO.toEIO", {
      universeParams: ["u", "v"],
      params: [
        valueParam("E", sortU, "implicit", { isTypeParam: true }),
        valueParam("A", sortV, "implicit", { isTypeParam: true }),
        valueParam("act", baseIOOf(A)),
      ],
      result: eioOf(E, A),
      operation: "lean.baseio.toEIO",
    });

    for (const [op, capability, notes] of [
      ["lean.eio.throw", "core.eio", "Lean EIO.throw typed exception action."],
      ["lean.eio.tryCatch", "core.eio", "Lean EIO.tryCatch typed exception recovery."],
      ["lean.eio.catchExceptions", "core.eio", "Lean EIO.catchExceptions conversion to exception-free BaseIO."],
      ["lean.eio.adapt", "core.eio", "Lean EIO.adapt typed error-channel mapping."],
      ["lean.io.error.userError", "core.io.error", "Lean IO.Error.userError constructor."],
      ["lean.io.print", "core.io.console", "Lean IO.print with explicit selected ToString dictionary."],
      ["lean.io.println", "core.io.console", "Lean IO.println with explicit selected ToString dictionary."],
      ["lean.io.eprint", "core.io.console", "Lean IO.eprint with explicit selected ToString dictionary."],
      ["lean.io.eprintln", "core.io.console", "Lean IO.eprintln with explicit selected ToString dictionary."],
      ["lean.io.lazyPure", "core.io", "Lean IO.lazyPure delayed pure action."],
      ["lean.baseio.toIO", "core.io", "Lean BaseIO.toIO exception-free action lifting."],
      ["lean.baseio.toEIO", "core.eio", "Lean BaseIO.toEIO action lifting into a typed-error EIO."],
    ] as const) {
      registry.registerOperation(op, {
        requiredCapabilities: [capability],
        verification: { level: "kernel-checkable", notes },
        domain: "runtime",
      });
    }

    registry.registerLeanTypeFamilyLowering("lean.baseio", (type, context) => {
      const inner = type.args?.[0];
      if (!inner || inner.kind !== "type") throw new ProofScriptError("PS4A01", "Malformed BaseIO type in Semantic IR.");
      return `(BaseIO ${context.emitType(inner.value)})`;
    });
    registry.registerLeanTypeFamilyLowering("lean.eio", (type, context) => {
      const error = type.args?.[0]; const inner = type.args?.[1];
      if (!error || error.kind !== "type" || !inner || inner.kind !== "type") throw new ProofScriptError("PS4A02", "Malformed EIO type in Semantic IR.");
      return `(EIO ${context.emitType(error.value)} ${context.emitType(inner.value)})`;
    });
    registry.registerLeanTypeFamilyLowering("lean.io", (type, context) => {
      const inner = type.args?.[0];
      if (!inner || inner.kind !== "type") throw new ProofScriptError("PS4A03", "Malformed IO type in Semantic IR.");
      return `(IO ${context.emitType(inner.value)})`;
    });
    registry.registerLeanTypeFamilyLowering("lean.io.error", () => "IO.Error");

    registry.registerLeanExprLowering("lean.eio.throw", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4A04", "Expected EIO.throw IR node.");
      return `(EIO.throw ${context.emitExpr(expr.args.at(-1)!)})`;
    });
    registry.registerLeanExprLowering("lean.eio.tryCatch", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4A08", "Expected EIO.tryCatch IR node.");
      return `(EIO.tryCatch ${context.emitExpr(expr.args.at(-2)!)} ${context.emitExpr(expr.args.at(-1)!)})`;
    });
    registry.registerLeanExprLowering("lean.eio.catchExceptions", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4A09", "Expected EIO.catchExceptions IR node.");
      return `(EIO.catchExceptions ${context.emitExpr(expr.args.at(-2)!)} ${context.emitExpr(expr.args.at(-1)!)})`;
    });
    registry.registerLeanExprLowering("lean.eio.adapt", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4A10", "Expected EIO.adapt IR node.");
      return `(EIO.adapt ${context.emitExpr(expr.args.at(-2)!)} ${context.emitExpr(expr.args.at(-1)!)})`;
    });
    registry.registerLeanExprLowering("lean.io.error.userError", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4A11", "Expected IO.Error.userError IR node.");
      return `(IO.Error.userError ${context.emitExpr(expr.args.at(-1)!)})`;
    });
    registry.registerLeanExprLowering("lean.io.print", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4A12", "Expected IO.print IR node.");
      const inst = expr.args.at(-2)!; const value = expr.args.at(-1)!;
      return `(@IO.print ${context.emitType(value.type)} ${context.emitExpr(inst)} ${context.emitExpr(value)})`;
    });
    registry.registerLeanExprLowering("lean.io.println", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4A13", "Expected IO.println IR node.");
      const inst = expr.args.at(-2)!; const value = expr.args.at(-1)!;
      return `(@IO.println ${context.emitType(value.type)} ${context.emitExpr(inst)} ${context.emitExpr(value)})`;
    });
    registry.registerLeanExprLowering("lean.io.eprint", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4A14", "Expected IO.eprint IR node.");
      const inst = expr.args.at(-2)!; const value = expr.args.at(-1)!;
      return `(@IO.eprint ${context.emitType(value.type)} ${context.emitExpr(inst)} ${context.emitExpr(value)})`;
    });
    registry.registerLeanExprLowering("lean.io.eprintln", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4A15", "Expected IO.eprintln IR node.");
      const inst = expr.args.at(-2)!; const value = expr.args.at(-1)!;
      return `(@IO.eprintln ${context.emitType(value.type)} ${context.emitExpr(inst)} ${context.emitExpr(value)})`;
    });
    registry.registerLeanExprLowering("lean.io.lazyPure", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4A05", "Expected IO.lazyPure IR node.");
      return `(IO.lazyPure ${context.emitExpr(expr.args.at(-1)!)})`;
    });
    registry.registerLeanExprLowering("lean.baseio.toIO", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4A06", "Expected BaseIO.toIO IR node.");
      return `(BaseIO.toIO ${context.emitExpr(expr.args.at(-1)!)})`;
    });
    registry.registerLeanExprLowering("lean.baseio.toEIO", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4A07", "Expected BaseIO.toEIO IR node.");
      return `(BaseIO.toEIO ${context.emitExpr(expr.args.at(-1)!)})`;
    });
  },
};

export default plugin;

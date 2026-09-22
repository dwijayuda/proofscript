import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

function argType(type: import("../../core/model.js").IRType, index: number, label: string): import("../../core/model.js").IRType {
  const arg = type.args?.[index];
  if (!arg || arg.kind !== "type") throw new ProofScriptError("PS3A01", `Malformed ${label} type in Semantic IR.`);
  return arg.value;
}

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-io",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.backend.typescript", "proofscript.feature.io", "proofscript.feature.do", "proofscript.backend-feature.typescript-to-string"],
  setup(registry) {
    for (const capability of ["core.baseio", "core.eio", "core.io", "core.io.error", "core.io.console"]) registry.addTargetCapability("typescript", capability);

    registry.registerTargetTypeFamilyLowering("typescript", "lean.baseio", (type, context) =>
      `(() => ${context.emitType(argType(type, 0, "BaseIO"))})`);
    registry.registerTargetTypeFamilyLowering("typescript", "lean.eio", (type, context) => {
      const error = context.emitType(argType(type, 0, "EIO"));
      const value = context.emitType(argType(type, 1, "EIO"));
      return `(() => ({ tag: \"Ok\"; value: ${value} } | { tag: \"Error\"; error: ${error} }))`;
    });
    registry.registerTargetTypeFamilyLowering("typescript", "lean.io", (type, context) => {
      const value = context.emitType(argType(type, 0, "IO"));
      return `(() => ({ tag: \"Ok\"; value: ${value} } | { tag: \"Error\"; error: { readonly __proofscriptIOErrorBrand: \"IO.Error\" } }))`;
    });
    registry.registerTargetTypeFamilyLowering("typescript", "lean.io.error", () =>
      `({ readonly __proofscriptIOErrorBrand: \"IO.Error\" })`);

    registry.registerSemanticInfo("typescript.do.monad:lean.baseio", { kind: "baseio-thunk" });
    registry.registerSemanticInfo("typescript.do.monad:lean.eio", { kind: "eio-thunk" });
    registry.registerSemanticInfo("typescript.do.monad:lean.io", { kind: "eio-thunk" });

    registry.registerTargetExprLowering("typescript", "lean.eio.throw", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS3A02", "Expected EIO.throw IR node.");
      return `(() => ({ tag: \"Error\", error: ${context.emitExpr(expr.args.at(-1)!)} } as const))`;
    });
    registry.registerTargetExprLowering("typescript", "lean.eio.tryCatch", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS3A06", "Expected EIO.tryCatch IR node.");
      const act = context.emitExpr(expr.args.at(-2)!);
      const handle = context.emitExpr(expr.args.at(-1)!);
      return `(() => { const __ps_eio = (${act})(); return __ps_eio.tag === "Error" ? (${handle})(__ps_eio.error)() : __ps_eio; })`;
    });
    registry.registerTargetExprLowering("typescript", "lean.eio.catchExceptions", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS3A07", "Expected EIO.catchExceptions IR node.");
      const act = context.emitExpr(expr.args.at(-2)!);
      const handle = context.emitExpr(expr.args.at(-1)!);
      return `(() => { const __ps_eio = (${act})(); return __ps_eio.tag === "Error" ? (${handle})(__ps_eio.error)() : __ps_eio.value; })`;
    });
    registry.registerTargetExprLowering("typescript", "lean.eio.adapt", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS3A08", "Expected EIO.adapt IR node.");
      const adapt = context.emitExpr(expr.args.at(-2)!);
      const act = context.emitExpr(expr.args.at(-1)!);
      return `(() => { const __ps_eio = (${act})(); return __ps_eio.tag === "Error" ? ({ tag: "Error", error: (${adapt})(__ps_eio.error) } as const) : __ps_eio; })`;
    });
    registry.registerTargetExprLowering("typescript", "lean.io.error.userError", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS3A09", "Expected IO.Error.userError IR node.");
      const msg = context.emitExpr(expr.args.at(-1)!);
      return `({ __proofscriptIOErrorBrand: "IO.Error", tag: "userError", msg: ${msg}, __proofscriptUserErrorMessage: ${msg} } as { readonly __proofscriptIOErrorBrand: "IO.Error" })`;
    });
    registry.registerTargetExprLowering("typescript", "lean.io.print", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS3A10", "Expected IO.print IR node.");
      const inst = context.emitExpr(expr.args.at(-2)!);
      const value = context.emitExpr(expr.args.at(-1)!);
      return `(() => { try { const __ps_stdout = (globalThis as any).process?.stdout; if (!__ps_stdout || typeof __ps_stdout.write !== "function") return ({ tag: "Error", error: ({ __proofscriptIOErrorBrand: "IO.Error" } as const) } as const); __ps_stdout.write(${inst}.toString(${value})); return ({ tag: "Ok", value: undefined } as const); } catch { return ({ tag: "Error", error: ({ __proofscriptIOErrorBrand: "IO.Error" } as const) } as const); } })`;
    });
    registry.registerTargetExprLowering("typescript", "lean.io.println", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS3A11", "Expected IO.println IR node.");
      const inst = context.emitExpr(expr.args.at(-2)!);
      const value = context.emitExpr(expr.args.at(-1)!);
      return `(() => { try { const __ps_stdout = (globalThis as any).process?.stdout; if (!__ps_stdout || typeof __ps_stdout.write !== "function") return ({ tag: "Error", error: ({ __proofscriptIOErrorBrand: "IO.Error" } as const) } as const); __ps_stdout.write(${inst}.toString(${value}) + "\\n"); return ({ tag: "Ok", value: undefined } as const); } catch { return ({ tag: "Error", error: ({ __proofscriptIOErrorBrand: "IO.Error" } as const) } as const); } })`;
    });
    registry.registerTargetExprLowering("typescript", "lean.io.eprint", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS3A12", "Expected IO.eprint IR node.");
      const inst = context.emitExpr(expr.args.at(-2)!);
      const value = context.emitExpr(expr.args.at(-1)!);
      return `(() => { try { const __ps_stderr = (globalThis as any).process?.stderr; if (!__ps_stderr || typeof __ps_stderr.write !== "function") return ({ tag: "Error", error: ({ __proofscriptIOErrorBrand: "IO.Error" } as const) } as const); __ps_stderr.write(${inst}.toString(${value})); return ({ tag: "Ok", value: undefined } as const); } catch { return ({ tag: "Error", error: ({ __proofscriptIOErrorBrand: "IO.Error" } as const) } as const); } })`;
    });
    registry.registerTargetExprLowering("typescript", "lean.io.eprintln", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS3A13", "Expected IO.eprintln IR node.");
      const inst = context.emitExpr(expr.args.at(-2)!);
      const value = context.emitExpr(expr.args.at(-1)!);
      return `(() => { try { const __ps_stderr = (globalThis as any).process?.stderr; if (!__ps_stderr || typeof __ps_stderr.write !== "function") return ({ tag: "Error", error: ({ __proofscriptIOErrorBrand: "IO.Error" } as const) } as const); __ps_stderr.write(${inst}.toString(${value}) + "\\n"); return ({ tag: "Ok", value: undefined } as const); } catch { return ({ tag: "Error", error: ({ __proofscriptIOErrorBrand: "IO.Error" } as const) } as const); } })`;
    });
    registry.registerTargetExprLowering("typescript", "lean.io.lazyPure", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS3A03", "Expected IO.lazyPure IR node.");
      const fn = context.emitExpr(expr.args.at(-1)!);
      return `(() => ({ tag: \"Ok\", value: (${fn})(undefined) } as const))`;
    });
    registry.registerTargetExprLowering("typescript", "lean.baseio.toIO", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS3A04", "Expected BaseIO.toIO IR node.");
      const act = context.emitExpr(expr.args.at(-1)!);
      return `(() => ({ tag: \"Ok\", value: (${act})() } as const))`;
    });
    registry.registerTargetExprLowering("typescript", "lean.baseio.toEIO", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS3A05", "Expected BaseIO.toEIO IR node.");
      const act = context.emitExpr(expr.args.at(-1)!);
      return `(() => ({ tag: \"Ok\", value: (${act})() } as const))`;
    });
  },
};

export default plugin;

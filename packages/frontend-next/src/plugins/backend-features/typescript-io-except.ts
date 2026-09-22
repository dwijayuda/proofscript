import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-io-except",
  version: "0.91.0",
  kind: "backend-feature",
  requires: [
    "proofscript.backend.typescript",
    "proofscript.feature.except",
    "proofscript.feature.io-except",
    "proofscript.backend-feature.typescript-except",
    "proofscript.backend-feature.typescript-io",
    "proofscript.backend-feature.typescript-to-string",
  ],
  setup(registry) {
    registry.addTargetCapability("typescript", "core.eio.ofExcept");
    registry.addTargetCapability("typescript", "core.io.ofExcept");

    registry.registerTargetExprLowering("typescript", "lean.eio.ofExcept", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS3B10", "Expected EIO.ofExcept IR node.");
      const source = context.emitExpr(expr.args.at(-1)!);
      return `(() => { const __ps_except = ${source}; return __ps_except.tag === "error" ? ({ tag: "Error", error: __ps_except.error } as const) : ({ tag: "Ok", value: __ps_except.value } as const); })`;
    });

    registry.registerTargetExprLowering("typescript", "lean.io.ofExcept", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length < 2) throw new ProofScriptError("PS3B11", "Expected IO.ofExcept IR node.");
      const inst = context.emitExpr(expr.args.at(-2)!);
      const source = context.emitExpr(expr.args.at(-1)!);
      return `(() => { const __ps_except = ${source}; return __ps_except.tag === "error" ? ({ tag: "Error", error: ({ __proofscriptIOErrorBrand: "IO.Error", __proofscriptUserErrorMessage: ${inst}.toString(__ps_except.error) } as { readonly __proofscriptIOErrorBrand: "IO.Error" }) } as const) : ({ tag: "Ok", value: __ps_except.value } as const); })`;
    });
  },
};

export default plugin;

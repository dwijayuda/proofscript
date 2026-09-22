import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";
const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-int64", version: "0.91.0", kind: "backend-feature", requires: ["proofscript.backend.typescript", "proofscript.feature.int64"],
  setup(registry) {
    registry.addTargetCapability("typescript", "core.int64");
    registry.registerSemanticInfo("typescript.int64Prelude", [
      `declare const __proofscriptInt64Brand: unique symbol;`,
      `export type Int64 = bigint & { readonly [__proofscriptInt64Brand]: true };`,
      `export const __psInt64 = (value: bigint): Int64 => BigInt.asIntN(64, value) as Int64;`,
    ].join("\n"));
    registry.registerTargetTypeLowering("typescript", "Int64", () => "Int64");
    registry.registerTargetExprLowering("typescript", "core.int64.literal", (expr) => { if (expr.kind !== "literal" || !/^\d+$/.test(expr.value)) throw new ProofScriptError("PS3I6401", "Malformed Int64 literal IR node."); return `__psInt64(BigInt(${JSON.stringify(expr.value)}))`; });
    registry.registerTargetExprLowering("typescript", "lean.int64.ofNat", (expr, context) => { if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3I6402", "Malformed Int64.ofNat IR node."); return `__psInt64(${context.emitExpr(expr.args[0]!)})`; });
    registry.registerTargetExprLowering("typescript", "lean.int64.ofInt", (expr, context) => { if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3I6403", "Malformed Int64.ofInt IR node."); return `__psInt64(${context.emitExpr(expr.args[0]!)})`; });
    registry.registerTargetExprLowering("typescript", "lean.int64.toInt", (expr, context) => { if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3I6404", "Malformed Int64.toInt IR node."); return `${context.emitExpr(expr.args[0]!)}`; });
  },
};
export default plugin;

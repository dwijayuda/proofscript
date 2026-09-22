import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";
const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-int32", version: "0.91.0", kind: "backend-feature", requires: ["proofscript.backend.typescript", "proofscript.feature.int32"],
  setup(registry) {
    registry.addTargetCapability("typescript", "core.int32");
    registry.registerSemanticInfo("typescript.int32Prelude", [
      `declare const __proofscriptInt32Brand: unique symbol;`,
      `export type Int32 = number & { readonly [__proofscriptInt32Brand]: true };`,
      `export const __psInt32 = (value: bigint): Int32 => Number(BigInt.asIntN(32, value)) as Int32;`,
    ].join("\n"));
    registry.registerTargetTypeLowering("typescript", "Int32", () => "Int32");
    registry.registerTargetExprLowering("typescript", "core.int32.literal", (expr) => { if (expr.kind !== "literal" || !/^\d+$/.test(expr.value)) throw new ProofScriptError("PS3I3201", "Malformed Int32 literal IR node."); return `__psInt32(BigInt(${JSON.stringify(expr.value)}))`; });
    registry.registerTargetExprLowering("typescript", "lean.int32.ofNat", (expr, context) => { if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3I3202", "Malformed Int32.ofNat IR node."); return `__psInt32(${context.emitExpr(expr.args[0]!)})`; });
    registry.registerTargetExprLowering("typescript", "lean.int32.ofInt", (expr, context) => { if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3I3203", "Malformed Int32.ofInt IR node."); return `__psInt32(${context.emitExpr(expr.args[0]!)})`; });
    registry.registerTargetExprLowering("typescript", "lean.int32.toInt", (expr, context) => { if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3I3204", "Malformed Int32.toInt IR node."); return `BigInt(${context.emitExpr(expr.args[0]!)})`; });
  },
};
export default plugin;

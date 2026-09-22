import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";
const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-int16", version: "0.91.0", kind: "backend-feature", requires: ["proofscript.backend.typescript", "proofscript.feature.int16"],
  setup(registry) {
    registry.addTargetCapability("typescript", "core.int16");
    registry.registerSemanticInfo("typescript.int16Prelude", [
      `declare const __proofscriptInt16Brand: unique symbol;`,
      `export type Int16 = number & { readonly [__proofscriptInt16Brand]: true };`,
      `export const __psInt16 = (value: bigint): Int16 => Number(BigInt.asIntN(16, value)) as Int16;`,
    ].join("\n"));
    registry.registerTargetTypeLowering("typescript", "Int16", () => "Int16");
    registry.registerTargetExprLowering("typescript", "core.int16.literal", (expr) => { if (expr.kind !== "literal" || !/^\d+$/.test(expr.value)) throw new ProofScriptError("PS3I1601", "Malformed Int16 literal IR node."); return `__psInt16(BigInt(${JSON.stringify(expr.value)}))`; });
    registry.registerTargetExprLowering("typescript", "lean.int16.ofNat", (expr, context) => { if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3I1602", "Malformed Int16.ofNat IR node."); return `__psInt16(${context.emitExpr(expr.args[0]!)})`; });
    registry.registerTargetExprLowering("typescript", "lean.int16.ofInt", (expr, context) => { if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3I1603", "Malformed Int16.ofInt IR node."); return `__psInt16(${context.emitExpr(expr.args[0]!)})`; });
    registry.registerTargetExprLowering("typescript", "lean.int16.toInt", (expr, context) => { if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3I1604", "Malformed Int16.toInt IR node."); return `BigInt(${context.emitExpr(expr.args[0]!)})`; });
  },
};
export default plugin;

import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";
const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-int8", version: "0.91.0", kind: "backend-feature", requires: ["proofscript.backend.typescript", "proofscript.feature.int8"],
  setup(registry) {
    registry.addTargetCapability("typescript", "core.int8");
    registry.registerSemanticInfo("typescript.int8Prelude", [
      `declare const __proofscriptInt8Brand: unique symbol;`,
      `export type Int8 = number & { readonly [__proofscriptInt8Brand]: true };`,
      `export const __psInt8 = (value: bigint): Int8 => Number(BigInt.asIntN(8, value)) as Int8;`,
    ].join("\n"));
    registry.registerTargetTypeLowering("typescript", "Int8", () => "Int8");
    registry.registerTargetExprLowering("typescript", "core.int8.literal", (expr) => { if (expr.kind !== "literal" || !/^\d+$/.test(expr.value)) throw new ProofScriptError("PS3I801", "Malformed Int8 literal IR node."); return `__psInt8(BigInt(${JSON.stringify(expr.value)}))`; });
    registry.registerTargetExprLowering("typescript", "lean.int8.ofNat", (expr, context) => { if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3I802", "Malformed Int8.ofNat IR node."); return `__psInt8(${context.emitExpr(expr.args[0]!)})`; });
    registry.registerTargetExprLowering("typescript", "lean.int8.ofInt", (expr, context) => { if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3I803", "Malformed Int8.ofInt IR node."); return `__psInt8(${context.emitExpr(expr.args[0]!)})`; });
    registry.registerTargetExprLowering("typescript", "lean.int8.toInt", (expr, context) => { if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3I804", "Malformed Int8.toInt IR node."); return `BigInt(${context.emitExpr(expr.args[0]!)})`; });
  },
};
export default plugin;

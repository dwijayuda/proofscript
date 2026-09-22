import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";
const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-uint16", version: "0.91.0", kind: "backend-feature", requires: ["proofscript.backend.typescript", "proofscript.feature.uint16"],
  setup(registry) {
    registry.addTargetCapability("typescript", "core.uint16");
    registry.registerSemanticInfo("typescript.uint16Prelude", [
      `declare const __proofscriptUInt16Brand: unique symbol;`,
      `export type UInt16 = number & { readonly [__proofscriptUInt16Brand]: true };`,
      `export const __psUInt16 = (value: bigint): UInt16 => Number(value & 0xffffn) as UInt16;`,
    ].join("\n"));
    registry.registerTargetTypeLowering("typescript", "UInt16", () => "UInt16");
    registry.registerTargetExprLowering("typescript", "core.uint16.literal", (expr) => { if (expr.kind !== "literal" || !/^\d+$/.test(expr.value)) throw new ProofScriptError("PS3H1601", "Malformed UInt16 literal IR node."); return `__psUInt16(BigInt(${JSON.stringify(expr.value)}))`; });
    registry.registerTargetExprLowering("typescript", "lean.uint16.ofNat", (expr, context) => { if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3H1602", "Malformed UInt16.ofNat IR node."); return `__psUInt16(${context.emitExpr(expr.args[0]!)})`; });
    registry.registerTargetExprLowering("typescript", "lean.uint16.toNat", (expr, context) => { if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3H1603", "Malformed UInt16.toNat IR node."); return `BigInt(${context.emitExpr(expr.args[0]!)})`; });
  },
};
export default plugin;

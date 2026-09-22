import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";
const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-uint8", version: "0.91.0", kind: "backend-feature", requires: ["proofscript.backend.typescript", "proofscript.feature.uint8"],
  setup(registry) {
    registry.addTargetCapability("typescript", "core.uint8");
    registry.registerSemanticInfo("typescript.uint8Prelude", [
      `declare const __proofscriptUInt8Brand: unique symbol;`,
      `export type UInt8 = number & { readonly [__proofscriptUInt8Brand]: true };`,
      `export const __psUInt8 = (value: bigint): UInt8 => Number(value & 0xffn) as UInt8;`,
    ].join("\n"));
    registry.registerTargetTypeLowering("typescript", "UInt8", () => "UInt8");
    registry.registerTargetExprLowering("typescript", "core.uint8.literal", (expr) => { if (expr.kind !== "literal" || !/^\d+$/.test(expr.value)) throw new ProofScriptError("PS3H801", "Malformed UInt8 literal IR node."); return `__psUInt8(BigInt(${JSON.stringify(expr.value)}))`; });
    registry.registerTargetExprLowering("typescript", "lean.uint8.ofNat", (expr, context) => { if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3H802", "Malformed UInt8.ofNat IR node."); return `__psUInt8(${context.emitExpr(expr.args[0]!)})`; });
    registry.registerTargetExprLowering("typescript", "lean.uint8.toNat", (expr, context) => { if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3H803", "Malformed UInt8.toNat IR node."); return `BigInt(${context.emitExpr(expr.args[0]!)})`; });
  },
};
export default plugin;

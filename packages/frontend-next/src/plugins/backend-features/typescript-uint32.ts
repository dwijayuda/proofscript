import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-uint32",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.backend.typescript", "proofscript.feature.uint32"],
  setup(registry) {
    registry.addTargetCapability("typescript", "core.uint32");
    registry.registerSemanticInfo("typescript.uint32Prelude", [
      `declare const __proofscriptUInt32Brand: unique symbol;`,
      `export type UInt32 = number & { readonly [__proofscriptUInt32Brand]: true };`,
      `export const __psUInt32 = (value: bigint): UInt32 => Number(value & 0xffffffffn) as UInt32;`,
    ].join("\n"));
    registry.registerTargetTypeLowering("typescript", "UInt32", () => "UInt32");
    registry.registerTargetExprLowering("typescript", "core.uint32.literal", (expr) => {
      if (expr.kind !== "literal" || !/^\d+$/.test(expr.value)) throw new ProofScriptError("PS3D01", "Malformed UInt32 literal IR node.");
      return `__psUInt32(BigInt(${JSON.stringify(expr.value)}))`;
    });
    registry.registerTargetExprLowering("typescript", "lean.uint32.ofNat", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3D02", "Malformed UInt32.ofNat IR node.");
      return `__psUInt32(${context.emitExpr(expr.args[0]!)})`;
    });
    registry.registerTargetExprLowering("typescript", "lean.uint32.toNat", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3D03", "Malformed UInt32.toNat IR node.");
      return `BigInt(${context.emitExpr(expr.args[0]!)})`;
    });
  },
};
export default plugin;

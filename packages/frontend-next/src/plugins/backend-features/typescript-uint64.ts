import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-uint64",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.backend.typescript", "proofscript.feature.uint64"],
  setup(registry) {
    registry.addTargetCapability("typescript", "core.uint64");
    registry.registerSemanticInfo("typescript.uint64Prelude", [
      `declare const __proofscriptUInt64Brand: unique symbol;`,
      `export type UInt64 = bigint & { readonly [__proofscriptUInt64Brand]: true };`,
      `export const __psUInt64 = (value: bigint): UInt64 => (value & 0xffffffffffffffffn) as UInt64;`,
    ].join("\n"));
    registry.registerTargetTypeLowering("typescript", "UInt64", () => "UInt64");
    registry.registerTargetExprLowering("typescript", "core.uint64.literal", (expr) => {
      if (expr.kind !== "literal" || !/^\d+$/.test(expr.value)) throw new ProofScriptError("PS3F64", "Malformed UInt64 literal IR node.");
      return `__psUInt64(BigInt(${JSON.stringify(expr.value)}))`;
    });
    registry.registerTargetExprLowering("typescript", "lean.uint64.ofNat", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3F65", "Malformed UInt64.ofNat IR node.");
      return `__psUInt64(${context.emitExpr(expr.args[0]!)})`;
    });
    registry.registerTargetExprLowering("typescript", "lean.uint64.toNat", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3F66", "Malformed UInt64.toNat IR node.");
      return `BigInt(${context.emitExpr(expr.args[0]!)})`;
    });
  },
};
export default plugin;

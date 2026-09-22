import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-int",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.backend.typescript", "proofscript.feature.int"],
  setup(registry) {
    registry.addTargetCapability("typescript", "core.int");
    registry.registerTargetTypeLowering("typescript", "Int", () => "bigint");
    registry.registerTargetExprLowering("typescript", "core.int.literal", (expr) => {
      if (expr.kind !== "literal" || !/^\d+$/.test(expr.value)) throw new ProofScriptError("PS3E01", "Malformed Int literal IR node.");
      return `${expr.value}n`;
    });
    registry.registerTargetExprLowering("typescript", "lean.int.neg", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3E02", "Malformed Int.neg IR node.");
      return `(-(${context.emitExpr(expr.args[0]!) }))`;
    });
    registry.registerTargetExprLowering("typescript", "lean.int.ofNat", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3E03", "Malformed Int.ofNat IR node.");
      return `${context.emitExpr(expr.args[0]!)}`;
    });
    registry.registerTargetExprLowering("typescript", "lean.int.negSucc", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3E04", "Malformed Int.negSucc IR node.");
      return `(-(${context.emitExpr(expr.args[0]!)} + 1n))`;
    });
    registry.registerTargetExprLowering("typescript", "lean.int.toNat", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3E05", "Malformed Int.toNat IR node.");
      const value = context.emitExpr(expr.args[0]!);
      return `((${value}) < 0n ? 0n : (${value}))`;
    });
    registry.registerTargetExprLowering("typescript", "lean.int.natAbs", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3E06", "Malformed Int.natAbs IR node.");
      const value = context.emitExpr(expr.args[0]!);
      return `((${value}) < 0n ? -(${value}) : (${value}))`;
    });
  },
};
export default plugin;

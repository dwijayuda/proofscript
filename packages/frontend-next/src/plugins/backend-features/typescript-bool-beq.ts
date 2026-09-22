import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-bool-beq",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.feature.bool", "proofscript.feature.beq", "proofscript.backend.typescript"],
  setup(registry) {
    registry.addTargetCapability("typescript", "core.bool");
    registry.addTargetCapability("typescript", "core.beq");
    registry.registerTargetTypeLowering("typescript", "Bool", () => "boolean");
    registry.registerTargetExprLowering("typescript", "core.bool.literal", (expr) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS3231", "Expected Bool literal extension.");
      return (expr.payload as { value: "true" | "false" }).value;
    });
    registry.registerTargetExprLowering("typescript", "core.beq", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS3232", "Expected BEq operation.");
      const payload = expr.payload as { primitive?: boolean };
      if (payload.primitive !== false) return `(${context.emitExpr(expr.args[0]!)} === ${context.emitExpr(expr.args[1]!)})`;
      return `(${context.emitExpr(expr.args[2]!)}).beq(${context.emitExpr(expr.args[0]!)}, ${context.emitExpr(expr.args[1]!)})`;
    });
  },
};
export default plugin;

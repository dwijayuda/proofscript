import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.rust-bool-beq",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.feature.bool", "proofscript.feature.beq", "proofscript.backend.rust"],
  setup(registry) {
    registry.addTargetCapability("rust", "core.bool");
    registry.addTargetCapability("rust", "core.beq");
    registry.registerTargetTypeLowering("rust", "Bool", () => "bool");
    registry.registerTargetExprLowering("rust", "core.bool.literal", (expr) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS3233", "Expected Bool literal extension.");
      return (expr.payload as { value: "true" | "false" }).value;
    });
    registry.registerTargetExprLowering("rust", "core.beq", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS3234", "Expected BEq operation.");
      return `(${context.emitExpr(expr.args[0]!)} == ${context.emitExpr(expr.args[1]!)})`;
    });
  },
};
export default plugin;

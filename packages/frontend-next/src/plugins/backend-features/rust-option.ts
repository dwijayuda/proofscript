import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.rust-option",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.backend.rust", "proofscript.feature.option", "proofscript.feature.match"],
  setup(registry) {
    registry.addTargetCapability("rust", "core.option");
    registry.addTargetCapability("rust", "core.option.match");
    registry.registerTargetTypeFamilyLowering("rust", "core.option", (type, context) => {
      const inner = type.args?.[0];
      if (!inner || inner.kind !== "type") throw new ProofScriptError("PS3311", "Malformed Option IR type.");
      return `Option<${context.emitType(inner.value)}>`;
    });
    registry.registerTargetExprLowering("rust", "core.option.some", (expr, context) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS3312", "Expected Option.some extension node.");
      return `Some(${context.emitExpr(expr.args[0]!)})`;
    });
    registry.registerTargetExprLowering("rust", "core.option.none", (expr) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS3313", "Expected Option.none extension node.");
      return "None";
    });
    registry.registerTargetExprLowering("rust", "core.option.match", (expr, context) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS3314", "Expected Option.match extension node.");
      const payload = expr.payload as { cases: readonly { variant: string; binders: readonly string[] }[] };
      const [scrutinee, ...bodies] = expr.args;
      const branches = payload.cases.map((item, index) => {
        const binders = item.binders.join(", ");
        const pattern = item.variant === "some" ? `Some(${binders})` : "None";
        return `${pattern} => ${context.emitExpr(bodies[index]!)}`;
      });
      return `match ${context.emitExpr(scrutinee!)} { ${branches.join(", ")} }`;
    });
  },
};
export default plugin;

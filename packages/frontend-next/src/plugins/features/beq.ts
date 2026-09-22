import { ProofScriptError } from "../../core/errors.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { nominalType, typeArgument } from "../../core/type-utils.js";

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.beq",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["core.beq"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.bool"],
  setup(registry) {
    registry.registerInfixSyntax({ operator: "==", precedence: 10 });
    registry.registerBinaryElaborator({
      operator: "==",
      elaborate(left, right, expected, resolveType, context) {
        const bool = resolveType("Bool");
        if (left.type.id !== right.type.id) throw new ProofScriptError("PS2531", "Boolean equality requires both operands to have the same type.");
        if (expected && expected.id !== bool.id) throw new ProofScriptError("PS2533", "Boolean equality has type Bool, not Prop.");
        if (new Set(["Nat", "Bool", "String"]).has(left.type.id)) {
          return { kind: "op", op: "core.beq", args: [left, right], payload: { operandType: left.type.id, primitive: true }, type: bool };
        }
        const goal = nominalType(`BEq(type:${left.type.displayName})`, `BEq(${left.type.displayName})`, "lean.class:BEq", [typeArgument(left.type)]);
        let evidence;
        try { evidence = context.synthesizeInstance(goal); } catch {
          throw new ProofScriptError("PS2532", `No registered BEq evidence is available for '${left.type.displayName}'.`);
        }
        return { kind: "op", op: "core.beq", args: [left, right, evidence], payload: { operandType: left.type.id, primitive: false }, type: bool };
      },
    });
    registry.registerOperation("core.beq", {
      requiredCapabilities: ["core.beq"],
      verification: { level: "kernel-checkable", notes: "Boolean equality is modeled as Lean BEq for the explicitly supported operand types." },
    });
    registry.registerLeanExprLowering("core.beq", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4531", "Expected BEq operation.");
      const payload = expr.payload as { primitive?: boolean };
      if (payload.primitive !== false) return `(${context.emitExpr(expr.args[0]!)} == ${context.emitExpr(expr.args[1]!)})`;
      return `(@BEq.beq ${context.emitType(expr.args[0]!.type)} ${context.emitExpr(expr.args[2]!)} ${context.emitExpr(expr.args[0]!)} ${context.emitExpr(expr.args[1]!)})`;
    });
  },
};

export default plugin;

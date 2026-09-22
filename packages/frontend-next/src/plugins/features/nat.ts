import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

const plugin: ProofScriptPlugin = {
  id: "proofscript.feature.nat",
  version: "0.91.0",
  kind: "feature",
  setup(registry) {
    registry.registerType("Nat", "Nat");
    registry.registerOperation("core.nat.literal", {
      requiredCapabilities: ["core.nat"],
      verification: {
        level: "kernel-checkable",
        notes: "Lean Nat literal semantics.",
      },
    });

    registry.registerLiteralElaborator({
      literalKind: "number",
      supports(expected, resolveType) {
        const nat = resolveType("Nat");
        return expected === undefined || expected.id === nat.id;
      },
      elaborate(text, expected, resolveType) {
        const nat = resolveType("Nat");
        if (expected && expected.id !== nat.id) {
          throw new ProofScriptError(
            "PS2202",
            `Numeric literal '${text}' cannot inhabit '${expected.displayName}' in this MVP.`,
          );
        }
        return { kind: "literal", op: "core.nat.literal", value: text, type: nat };
      },
    });

    registry.registerLeanTypeLowering("Nat", () => "Nat");
    registry.registerLeanExprLowering("core.nat.literal", (expr) => {
      if (expr.kind !== "literal") throw new ProofScriptError("PS4201", "Expected Nat literal IR node.");
      return expr.value;
    });
  },
};

export default plugin;

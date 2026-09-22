import { ProofScriptError } from "../../core/errors.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.bool",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["core.bool.literal"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  setup(registry) {
    registry.registerType("Bool", "Bool");
    registry.registerLeanTypeLowering("Bool", () => "Bool");
    for (const value of ["true", "false"] as const) {
      registry.registerExpressionSyntax({
        keyword: value,
        owner: "core.bool.literal.syntax",
        parse() { return { kind: "extension", owner: "core.bool.literal.syntax", payload: { value } }; },
      });
    }
    registry.registerExpressionElaborator({
      owner: "core.bool.literal.syntax",
      elaborate(expr, expected, context) {
        if (expr.kind !== "extension") throw new ProofScriptError("PS2521", "Malformed Bool literal syntax node.");
        const bool = context.resolveType("Bool");
        if (expected && expected.id !== bool.id) throw new ProofScriptError("PS2522", `Bool literal cannot inhabit '${expected.displayName}'.`);
        const { value } = expr.payload as { value: "true" | "false" };
        return { kind: "extension", op: "core.bool.literal", args: [], payload: { value }, type: bool };
      },
    });
    registry.registerOperation("core.bool.literal", {
      requiredCapabilities: ["core.bool"],
      verification: { level: "kernel-checkable", notes: "Lean Bool constructor semantics." },
    });
    registry.registerLeanExprLowering("core.bool.literal", (expr) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS4521", "Expected Bool literal extension node.");
      return (expr.payload as { value: "true" | "false" }).value;
    });
  },
};

export default plugin;

import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { nominalType } from "../../core/type-utils.js";
import { toStringClassOf } from "./to-string.js";

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.to-string-basic",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.instance.ToString.Nat", "lean.instance.ToString.Bool", "lean.instance.ToString.Unit"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.to-string", "proofscript.feature.nat", "proofscript.feature.bool", "proofscript.feature.unit"],
  setup(registry) {
    for (const [name, type] of [
      ["instToStringNat", nominalType("Nat", "Nat")],
      ["instToStringBool", nominalType("Bool", "Bool")],
      ["instToStringUnit", nominalType("Unit", "Unit")],
    ] as const) {
      registry.registerBuiltinInstance({ name, params: [], resultType: toStringClassOf(type), priority: 1000 });
    }
  },
};
export default plugin;

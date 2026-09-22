import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { nominalType } from "../../core/type-utils.js";
import { toStringClassOf } from "./to-string.js";

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.to-string-int",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.instance.ToString.Int"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};
const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.to-string", "proofscript.feature.int"],
  setup(registry) {
    registry.registerBuiltinInstance({
      name: "instToStringInt",
      params: [],
      resultType: toStringClassOf(nominalType("Int", "Int")),
      priority: 1000,
    });
  },
};
export default plugin;

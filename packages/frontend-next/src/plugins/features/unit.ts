import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.unit",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["Unit"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  setup(registry) {
    registry.registerType("Unit", "Unit");
    registry.registerLeanTypeLowering("Unit", () => "Unit");
  },
};

export default plugin;

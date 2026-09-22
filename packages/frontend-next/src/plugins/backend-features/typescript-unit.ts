import type { ProofScriptPlugin } from "../../core/plugin-api.js";

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-unit",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.backend.typescript", "proofscript.feature.unit"],
  setup(registry) {
    registry.addTargetCapability("typescript", "core.unit");
    registry.registerTargetTypeLowering("typescript", "Unit", () => "void");
  },
};
export default plugin;

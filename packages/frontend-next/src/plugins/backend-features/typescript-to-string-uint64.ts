import type { ProofScriptPlugin } from "../../core/plugin-api.js";
const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-to-string-uint64",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.backend-feature.typescript-to-string", "proofscript.backend-feature.typescript-uint64", "proofscript.feature.to-string-uint64"],
  setup(registry) {
    registry.registerSemanticInfo("typescript.toStringUInt64Prelude", `export const instToStringUInt64: ToString<UInt64> = { toString: (value) => value.toString(10) };`);
  },
};
export default plugin;

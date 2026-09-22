import type { ProofScriptPlugin } from "../../core/plugin-api.js";
const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-to-string-int",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.backend-feature.typescript-to-string", "proofscript.backend-feature.typescript-int", "proofscript.feature.to-string-int"],
  setup(registry) {
    registry.registerSemanticInfo("typescript.toStringIntPrelude", `export const instToStringInt: ToString<bigint> = { toString: (value) => value.toString(10) };`);
  },
};
export default plugin;

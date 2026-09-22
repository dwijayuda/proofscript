import type { ProofScriptPlugin } from "../../core/plugin-api.js";
const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-to-string-uint32",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.backend-feature.typescript-to-string", "proofscript.backend-feature.typescript-uint32", "proofscript.feature.to-string-uint32"],
  setup(registry) {
    registry.registerSemanticInfo("typescript.toStringUInt32Prelude", `export const instToStringUInt32: ToString<UInt32> = { toString: (value) => BigInt(value).toString(10) };`);
  },
};
export default plugin;

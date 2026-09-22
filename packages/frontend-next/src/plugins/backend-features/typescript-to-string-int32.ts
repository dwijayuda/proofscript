import type { ProofScriptPlugin } from "../../core/plugin-api.js";
const plugin: ProofScriptPlugin = { id: "proofscript.backend-feature.typescript-to-string-int32", version: "0.91.0", kind: "backend-feature", requires: ["proofscript.backend-feature.typescript-to-string", "proofscript.backend-feature.typescript-int32", "proofscript.feature.to-string-int32"], setup(registry) { registry.registerSemanticInfo("typescript.toStringInt32Prelude", `export const instToStringInt32: ToString<Int32> = { toString: (value) => BigInt(value).toString(10) };`); } };
export default plugin;

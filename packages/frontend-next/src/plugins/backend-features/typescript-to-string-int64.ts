import type { ProofScriptPlugin } from "../../core/plugin-api.js";
const plugin: ProofScriptPlugin = { id: "proofscript.backend-feature.typescript-to-string-int64", version: "0.91.0", kind: "backend-feature", requires: ["proofscript.backend-feature.typescript-to-string", "proofscript.backend-feature.typescript-int64", "proofscript.feature.to-string-int64"], setup(registry) { registry.registerSemanticInfo("typescript.toStringInt64Prelude", `export const instToStringInt64: ToString<Int64> = { toString: (value) => value.toString(10) };`); } };
export default plugin;

import type { ProofScriptPlugin } from "../../core/plugin-api.js";
const plugin: ProofScriptPlugin = { id: "proofscript.backend-feature.typescript-to-string-int8", version: "0.91.0", kind: "backend-feature", requires: ["proofscript.backend-feature.typescript-to-string", "proofscript.backend-feature.typescript-int8", "proofscript.feature.to-string-int8"], setup(registry) { registry.registerSemanticInfo("typescript.toStringInt8Prelude", `export const instToStringInt8: ToString<Int8> = { toString: (value) => BigInt(value).toString(10) };`); } };
export default plugin;

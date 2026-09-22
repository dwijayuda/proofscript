import type { ProofScriptPlugin } from "../../core/plugin-api.js";
const plugin: ProofScriptPlugin = { id: "proofscript.backend-feature.typescript-to-string-int16", version: "0.91.0", kind: "backend-feature", requires: ["proofscript.backend-feature.typescript-to-string", "proofscript.backend-feature.typescript-int16", "proofscript.feature.to-string-int16"], setup(registry) { registry.registerSemanticInfo("typescript.toStringInt16Prelude", `export const instToStringInt16: ToString<Int16> = { toString: (value) => BigInt(value).toString(10) };`); } };
export default plugin;

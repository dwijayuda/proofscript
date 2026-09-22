import type { ProofScriptPlugin } from "../../core/plugin-api.js";
const plugin: ProofScriptPlugin = { id: "proofscript.backend-feature.typescript-to-string-uint8", version: "0.91.0", kind: "backend-feature", requires: ["proofscript.backend-feature.typescript-to-string", "proofscript.backend-feature.typescript-uint8", "proofscript.feature.to-string-uint8"], setup(registry) { registry.registerSemanticInfo("typescript.toStringUInt8Prelude", `export const instToStringUInt8: ToString<UInt8> = { toString: (value) => BigInt(value).toString(10) };`); } };
export default plugin;

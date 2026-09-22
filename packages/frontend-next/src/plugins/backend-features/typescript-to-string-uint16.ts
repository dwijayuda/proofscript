import type { ProofScriptPlugin } from "../../core/plugin-api.js";
const plugin: ProofScriptPlugin = { id: "proofscript.backend-feature.typescript-to-string-uint16", version: "0.91.0", kind: "backend-feature", requires: ["proofscript.backend-feature.typescript-to-string", "proofscript.backend-feature.typescript-uint16", "proofscript.feature.to-string-uint16"], setup(registry) { registry.registerSemanticInfo("typescript.toStringUInt16Prelude", `export const instToStringUInt16: ToString<UInt16> = { toString: (value) => BigInt(value).toString(10) };`); } };
export default plugin;

import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { nominalType } from "../../core/type-utils.js";
import { toStringClassOf } from "./to-string.js";
export const proofscriptManifest: PluginManifest = { schema: "proofscript.plugin/v1", id: "proofscript.feature.to-string-uint16", version: "0.91.0", kind: "feature", semanticIds: ["lean.instance.ToString.UInt16"], proofscriptBaseline: "v0.1", leanBaseline: "4.33.1", lean: { assumptionPolicy: "none" } };
const plugin: ProofScriptPlugin = { id: proofscriptManifest.id, version: proofscriptManifest.version, kind: "feature", requires: ["proofscript.feature.to-string", "proofscript.feature.uint16"], setup(registry) { registry.registerBuiltinInstance({ name: "instToStringUInt16", params: [], resultType: toStringClassOf(nominalType("UInt16", "UInt16")), priority: 1000 }); } };
export default plugin;

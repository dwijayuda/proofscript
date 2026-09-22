import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { nominalType } from "../../core/type-utils.js";
import { toStringClassOf } from "./to-string.js";

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.to-string-io-error",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.instance.ToString.IO.Error"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.to-string", "proofscript.feature.io-error-structured"],
  setup(registry) {
    const ioError = nominalType("lean.io.error", "IO.Error", "lean.io.error");
    // Use a ProofScript-safe evidence identifier, but bind it exactly to the
    // upstream Lean instance in generated Lean. The core typeclass engine stays
    // generic and does not special-case IO.Error.
    registry.registerBuiltinInstance({
      name: "instToStringIOError",
      params: [],
      resultType: toStringClassOf(ioError),
      priority: 1000,
    });
    registry.registerLeanPrelude("abbrev instToStringIOError : ToString IO.Error := IO.Error.instToString");
  },
};

export default plugin;

import { ProofScriptError } from "../../core/errors.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { expectTypeArgument, nominalType, typeArgument } from "../../core/type-utils.js";

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.id",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["core.id"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  setup(registry) {
    registry.registerTypeFamily("Id", {
      params: [{ kind: "type" }],
      resolve(args) {
        if (args.length !== 1) throw new ProofScriptError("PS2951", `Id expects one type argument, got ${args.length}.`);
        const inner = expectTypeArgument(args[0]!, "Id");
        return nominalType(`core.id(${inner.id})`, `Id(${inner.displayName})`, "core.id", [typeArgument(inner)]);
      },
    });
    registry.registerSemanticInfo("proofscript.do.monad:core.id", {
      family: "core.id",
      sourceName: "Id",
      typeArgumentIndex: 0,
    });
    registry.registerLeanTypeFamilyLowering("core.id", (type, context) => {
      const inner = type.args?.[0];
      if (!inner || inner.kind !== "type") throw new ProofScriptError("PS4951", "Malformed Id type in Semantic IR.");
      return `(Id ${context.emitType(inner.value)})`;
    });
  },
};

export default plugin;

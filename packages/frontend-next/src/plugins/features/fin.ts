import { ProofScriptError } from "../../core/errors.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { expectTermArgument, exprDisplay, exprKey, nominalType, termArgument } from "../../core/type-utils.js";

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.fin",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.type.Fin"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.nat", "proofscript.feature.type"],
  setup(registry) {
    registry.registerTypeFamily("Fin", {
      params: [{ kind: "term", expectedType: () => nominalType("Nat", "Nat") }],
      resolve(args) {
        if (args.length !== 1) throw new ProofScriptError("PS2701", `Fin expects one Nat index, got ${args.length}.`);
        const n = expectTermArgument(args[0]!, "Fin");
        return nominalType(`core.fin(${exprKey(n)})`, `Fin(${exprDisplay(n)})`, "core.fin", [termArgument(n)]);
      },
    });
    registry.registerLeanTypeFamilyLowering("core.fin", (type, context) => {
      const index = type.args?.[0];
      if (!index || index.kind !== "term") throw new ProofScriptError("PS4703", "Malformed Fin index in Semantic IR v6.");
      return `(Fin ${context.emitExpr(index.value)})`;
    });
  },
};

export default plugin;

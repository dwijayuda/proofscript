import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-id",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.backend.typescript", "proofscript.feature.id"],
  setup(registry) {
    registry.addTargetCapability("typescript", "core.id");
    registry.registerTargetTypeFamilyLowering("typescript", "core.id", (type, context) => {
      const inner = type.args?.[0];
      if (!inner || inner.kind !== "type") throw new ProofScriptError("PS3951", "Malformed Id type in Semantic IR.");
      return context.emitType(inner.value);
    });
    registry.registerSemanticInfo("typescript.do.monad:core.id", { kind: "identity" });
  },
};

export default plugin;

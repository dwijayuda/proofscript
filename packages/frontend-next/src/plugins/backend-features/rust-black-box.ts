import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.rust-black-box",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.backend.rust", "proofscript.feature.rust-black-box"],
  setup(registry) {
    registry.addTargetCapability("rust", "rust.black-box");
    registry.registerTargetExprLowering("rust", "rust.black-box.nat", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS3205", "Expected rust.black-box.nat IR node.");
      return `std::hint::black_box(${context.emitExpr(expr.args[0]!)})`;
    });
  },
};

export default plugin;

import { readFileSync } from "node:fs";
import { ProofScriptError } from "../../core/errors.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";

const rustBlackBoxLeanSource = readFileSync(new URL("./lean/rust-black-box.lean", import.meta.url), "utf8");

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.rust-black-box",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["rust.black-box.nat"],
  lean: { sources: ["lean/rust-black-box.lean"], assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.nat"],
  setup(registry) {
    registry.registerOperation("rust.black-box.nat", {
      requiredCapabilities: ["rust.black-box"],
      verification: {
        level: "kernel-checkable",
        notes: "ProofScript models Rust black_box as value-preserving identity; the optimizer-barrier property is intentionally outside the logical model.",
      },
    });

    registry.registerIntrinsic({
      name: "rust::blackBox",
      params: ["Nat"],
      result: "Nat",
      operation: "rust.black-box.nat",
    });

    registry.registerLeanModule("ProofScript.Feature.RustBlackBox", rustBlackBoxLeanSource);

    registry.registerLeanExprLowering("rust.black-box.nat", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS4203", "Expected rust.black-box.nat IR node.");
      return `(psRustBlackBoxNat ${context.emitExpr(expr.args[0]!)})`;
    });
  },
};

export default plugin;

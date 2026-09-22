import { ProofScriptError } from "../../core/errors.js";
import type { IRParam, IRType } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { nominalType } from "../../core/type-utils.js";

function valueParam(name: string, type: IRType): IRParam { return { name, type, binderInfo: "explicit" }; }

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.uint64",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["core.uint64.literal", "lean.uint64.ofNat", "lean.uint64.toNat"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.nat"],
  setup(registry) {
    registry.registerType("UInt64", "UInt64");
    const uint64 = nominalType("UInt64", "UInt64");
    const nat = nominalType("Nat", "Nat");

    registry.registerOperation("core.uint64.literal", {
      requiredCapabilities: ["core.uint64"],
      verification: { level: "kernel-checkable", notes: "Lean UInt64 numeric literal semantics modulo 2^64." },
    });
    registry.registerOperation("lean.uint64.ofNat", {
      requiredCapabilities: ["core.uint64"],
      verification: { level: "kernel-checkable", notes: "Lean UInt64.ofNat semantics modulo 2^64." },
    });
    registry.registerOperation("lean.uint64.toNat", {
      requiredCapabilities: ["core.uint64"],
      verification: { level: "kernel-checkable", notes: "Lean UInt64.toNat returns the canonical value in [0, 2^64)." },
    });

    registry.registerLiteralElaborator({
      literalKind: "number",
      supports(expected) { return expected?.id === uint64.id; },
      elaborate(text, expected) {
        if (!expected || expected.id !== uint64.id) throw new ProofScriptError("PS2F01", `UInt64 literal '${text}' requires expected type UInt64.`);
        return { kind: "literal", op: "core.uint64.literal", value: text, type: uint64 };
      },
    });

    registry.registerBuiltinFunction("UInt64.ofNat", { params: [valueParam("n", nat)], result: uint64, operation: "lean.uint64.ofNat" });
    registry.registerBuiltinFunction("UInt64.toNat", { params: [valueParam("n", uint64)], result: nat, operation: "lean.uint64.toNat" });

    registry.registerLeanTypeLowering("UInt64", () => "UInt64");
    registry.registerLeanExprLowering("core.uint64.literal", (expr) => {
      if (expr.kind !== "literal" || !/^\d+$/.test(expr.value)) throw new ProofScriptError("PS4F64", "Malformed UInt64 literal IR node.");
      return `(${expr.value} : UInt64)`;
    });
    registry.registerLeanExprLowering("lean.uint64.ofNat", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4F65", "Malformed UInt64.ofNat IR node.");
      return `(UInt64.ofNat ${context.emitExpr(expr.args[0]!)})`;
    });
    registry.registerLeanExprLowering("lean.uint64.toNat", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4F66", "Malformed UInt64.toNat IR node.");
      return `(UInt64.toNat ${context.emitExpr(expr.args[0]!)})`;
    });
  },
};
export default plugin;

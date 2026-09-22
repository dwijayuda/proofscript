import { ProofScriptError } from "../../core/errors.js";
import type { IRParam, IRType } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { nominalType } from "../../core/type-utils.js";

function valueParam(name: string, type: IRType, binderInfo: IRParam["binderInfo"] = "explicit"): IRParam {
  return { name, type, binderInfo };
}

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.uint32",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["core.uint32.literal", "lean.uint32.ofNat", "lean.uint32.toNat"],
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
    registry.registerType("UInt32", "UInt32");
    const uint32 = nominalType("UInt32", "UInt32");
    const nat = nominalType("Nat", "Nat");

    registry.registerOperation("core.uint32.literal", {
      requiredCapabilities: ["core.uint32"],
      verification: { level: "kernel-checkable", notes: "Lean UInt32 numeric literal semantics modulo 2^32." },
    });
    registry.registerOperation("lean.uint32.ofNat", {
      requiredCapabilities: ["core.uint32"],
      verification: { level: "kernel-checkable", notes: "Lean UInt32.ofNat semantics modulo 2^32." },
    });
    registry.registerOperation("lean.uint32.toNat", {
      requiredCapabilities: ["core.uint32"],
      verification: { level: "kernel-checkable", notes: "Lean UInt32.toNat returns the canonical value in [0, 2^32)." },
    });

    registry.registerLiteralElaborator({
      literalKind: "number",
      supports(expected) { return expected?.id === uint32.id; },
      elaborate(text, expected) {
        if (!expected || expected.id !== uint32.id) throw new ProofScriptError("PS2D01", `UInt32 literal '${text}' requires expected type UInt32.`);
        return { kind: "literal", op: "core.uint32.literal", value: text, type: uint32 };
      },
    });

    registry.registerBuiltinFunction("UInt32.ofNat", {
      universeParams: [],
      params: [valueParam("n", nat)],
      result: uint32,
      operation: "lean.uint32.ofNat",
    });
    registry.registerBuiltinFunction("UInt32.toNat", {
      universeParams: [],
      params: [valueParam("n", uint32)],
      result: nat,
      operation: "lean.uint32.toNat",
    });

    registry.registerLeanTypeLowering("UInt32", () => "UInt32");
    registry.registerLeanExprLowering("core.uint32.literal", (expr) => {
      if (expr.kind !== "literal") throw new ProofScriptError("PS4D01", "Expected UInt32 literal IR node.");
      return `(${expr.value} : UInt32)`;
    });
    registry.registerLeanExprLowering("lean.uint32.ofNat", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4D02", "Malformed UInt32.ofNat IR node.");
      return `(UInt32.ofNat ${context.emitExpr(expr.args[0]!)})`;
    });
    registry.registerLeanExprLowering("lean.uint32.toNat", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4D03", "Malformed UInt32.toNat IR node.");
      return `(UInt32.toNat ${context.emitExpr(expr.args[0]!)})`;
    });
  },
};

export default plugin;

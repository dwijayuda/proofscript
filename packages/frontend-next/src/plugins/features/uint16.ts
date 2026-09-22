import { ProofScriptError } from "../../core/errors.js";
import type { IRParam, IRType } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { nominalType } from "../../core/type-utils.js";

function valueParam(name: string, type: IRType): IRParam { return { name, type, binderInfo: "explicit" }; }

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.uint16",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["core.uint16.literal", "lean.uint16.ofNat", "lean.uint16.toNat"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id, version: proofscriptManifest.version, kind: "feature", requires: ["proofscript.feature.nat"],
  setup(registry) {
    registry.registerType("UInt16", "UInt16");
    const t = nominalType("UInt16", "UInt16"); const nat = nominalType("Nat", "Nat");
    registry.registerOperation("core.uint16.literal", { requiredCapabilities: ["core.uint16"], verification: { level: "kernel-checkable", notes: "Lean UInt16 numeric literal semantics modulo 2^16." } });
    registry.registerOperation("lean.uint16.ofNat", { requiredCapabilities: ["core.uint16"], verification: { level: "kernel-checkable", notes: "Lean UInt16.ofNat semantics modulo 2^16." } });
    registry.registerOperation("lean.uint16.toNat", { requiredCapabilities: ["core.uint16"], verification: { level: "kernel-checkable", notes: "Lean UInt16.toNat canonical value." } });
    registry.registerLiteralElaborator({ literalKind: "number", supports(expected) { return expected?.id === t.id; }, elaborate(text, expected) { if (!expected || expected.id !== t.id) throw new ProofScriptError("PS2H1601", `UInt16 literal '${text}' requires expected type UInt16.`); return { kind: "literal", op: "core.uint16.literal", value: text, type: t }; } });
    registry.registerBuiltinFunction("UInt16.ofNat", { params: [valueParam("n", nat)], result: t, operation: "lean.uint16.ofNat" });
    registry.registerBuiltinFunction("UInt16.toNat", { params: [valueParam("n", t)], result: nat, operation: "lean.uint16.toNat" });
    registry.registerLeanTypeLowering("UInt16", () => "UInt16");
    registry.registerLeanExprLowering("core.uint16.literal", (expr) => { if (expr.kind !== "literal" || !/^\d+$/.test(expr.value)) throw new ProofScriptError("PS4H1601", "Malformed UInt16 literal IR node."); return `(${expr.value} : UInt16)`; });
    registry.registerLeanExprLowering("lean.uint16.ofNat", (expr, context) => { if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4H1602", "Malformed UInt16.ofNat IR node."); return `(UInt16.ofNat ${context.emitExpr(expr.args[0]!)})`; });
    registry.registerLeanExprLowering("lean.uint16.toNat", (expr, context) => { if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4H1603", "Malformed UInt16.toNat IR node."); return `(UInt16.toNat ${context.emitExpr(expr.args[0]!)})`; });
  },
};
export default plugin;

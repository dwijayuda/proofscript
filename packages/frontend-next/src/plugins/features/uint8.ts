import { ProofScriptError } from "../../core/errors.js";
import type { IRParam, IRType } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { nominalType } from "../../core/type-utils.js";

function valueParam(name: string, type: IRType): IRParam { return { name, type, binderInfo: "explicit" }; }

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.uint8",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["core.uint8.literal", "lean.uint8.ofNat", "lean.uint8.toNat"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id, version: proofscriptManifest.version, kind: "feature", requires: ["proofscript.feature.nat"],
  setup(registry) {
    registry.registerType("UInt8", "UInt8");
    const t = nominalType("UInt8", "UInt8"); const nat = nominalType("Nat", "Nat");
    registry.registerOperation("core.uint8.literal", { requiredCapabilities: ["core.uint8"], verification: { level: "kernel-checkable", notes: "Lean UInt8 numeric literal semantics modulo 2^8." } });
    registry.registerOperation("lean.uint8.ofNat", { requiredCapabilities: ["core.uint8"], verification: { level: "kernel-checkable", notes: "Lean UInt8.ofNat semantics modulo 2^8." } });
    registry.registerOperation("lean.uint8.toNat", { requiredCapabilities: ["core.uint8"], verification: { level: "kernel-checkable", notes: "Lean UInt8.toNat canonical value." } });
    registry.registerLiteralElaborator({ literalKind: "number", supports(expected) { return expected?.id === t.id; }, elaborate(text, expected) { if (!expected || expected.id !== t.id) throw new ProofScriptError("PS2H801", `UInt8 literal '${text}' requires expected type UInt8.`); return { kind: "literal", op: "core.uint8.literal", value: text, type: t }; } });
    registry.registerBuiltinFunction("UInt8.ofNat", { params: [valueParam("n", nat)], result: t, operation: "lean.uint8.ofNat" });
    registry.registerBuiltinFunction("UInt8.toNat", { params: [valueParam("n", t)], result: nat, operation: "lean.uint8.toNat" });
    registry.registerLeanTypeLowering("UInt8", () => "UInt8");
    registry.registerLeanExprLowering("core.uint8.literal", (expr) => { if (expr.kind !== "literal" || !/^\d+$/.test(expr.value)) throw new ProofScriptError("PS4H801", "Malformed UInt8 literal IR node."); return `(${expr.value} : UInt8)`; });
    registry.registerLeanExprLowering("lean.uint8.ofNat", (expr, context) => { if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4H802", "Malformed UInt8.ofNat IR node."); return `(UInt8.ofNat ${context.emitExpr(expr.args[0]!)})`; });
    registry.registerLeanExprLowering("lean.uint8.toNat", (expr, context) => { if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4H803", "Malformed UInt8.toNat IR node."); return `(UInt8.toNat ${context.emitExpr(expr.args[0]!)})`; });
  },
};
export default plugin;

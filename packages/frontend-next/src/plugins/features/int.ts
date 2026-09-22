import { ProofScriptError } from "../../core/errors.js";
import type { ExprLowering, IRParam, IRType } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { nominalType } from "../../core/type-utils.js";

function valueParam(name: string, type: IRType): IRParam { return { name, type, binderInfo: "explicit" }; }

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.int",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["core.int.literal", "lean.int.neg", "lean.int.ofNat", "lean.int.negSucc", "lean.int.toNat", "lean.int.natAbs"],
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
    registry.registerType("Int", "Int");
    const int = nominalType("Int", "Int");
    const nat = nominalType("Nat", "Nat");

    for (const [op, notes] of [
      ["core.int.literal", "Lean Int nonnegative numeral semantics."],
      ["lean.int.neg", "Lean Int.neg semantics."],
      ["lean.int.ofNat", "Lean Int.ofNat semantics."],
      ["lean.int.negSucc", "Lean Int.negSucc constructor semantics: n ↦ -(n+1)."],
      ["lean.int.toNat", "Lean Int.toNat semantics, saturating negative integers to 0."],
      ["lean.int.natAbs", "Lean Int.natAbs semantics."],
    ] as const) {
      registry.registerOperation(op, {
        requiredCapabilities: ["core.int"],
        verification: { level: "kernel-checkable", notes },
      });
    }

    registry.registerLiteralElaborator({
      literalKind: "number",
      supports(expected) { return expected?.id === int.id; },
      elaborate(text, expected) {
        if (!expected || expected.id !== int.id) throw new ProofScriptError("PS2E01", `Int literal '${text}' requires expected type Int.`);
        return { kind: "literal", op: "core.int.literal", value: text, type: int };
      },
    });

    registry.registerBuiltinFunction("Int.ofNat", { params: [valueParam("n", nat)], result: int, operation: "lean.int.ofNat" });
    registry.registerBuiltinFunction("Int.negSucc", { params: [valueParam("n", nat)], result: int, operation: "lean.int.negSucc" });
    registry.registerBuiltinFunction("Int.neg", { params: [valueParam("n", int)], result: int, operation: "lean.int.neg" });
    registry.registerBuiltinFunction("Int.toNat", { params: [valueParam("n", int)], result: nat, operation: "lean.int.toNat" });
    registry.registerBuiltinFunction("Int.natAbs", { params: [valueParam("n", int)], result: nat, operation: "lean.int.natAbs" });

    registry.registerLeanTypeLowering("Int", () => "Int");
    registry.registerLeanExprLowering("core.int.literal", (expr) => {
      if (expr.kind !== "literal" || !/^\d+$/.test(expr.value)) throw new ProofScriptError("PS4E01", "Malformed Int literal IR node.");
      return `(${expr.value} : Int)`;
    });
    const unary = (name: string): ExprLowering => (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4E02", `Malformed ${name} IR node.`);
      return `(${name} ${context.emitExpr(expr.args[0]!)})`;
    };
    registry.registerLeanExprLowering("lean.int.neg", unary("Int.neg"));
    registry.registerLeanExprLowering("lean.int.ofNat", unary("Int.ofNat"));
    registry.registerLeanExprLowering("lean.int.negSucc", unary("Int.negSucc"));
    registry.registerLeanExprLowering("lean.int.toNat", unary("Int.toNat"));
    registry.registerLeanExprLowering("lean.int.natAbs", unary("Int.natAbs"));
  },
};
export default plugin;

import { ProofScriptError } from "../../core/errors.js";
import type { ExprLowering, IRParam, IRType } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { nominalType } from "../../core/type-utils.js";

function valueParam(name: string, type: IRType): IRParam { return { name, type, binderInfo: "explicit" }; }

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.int64",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["core.int64.literal", "lean.int64.ofNat", "lean.int64.ofInt", "lean.int64.toInt"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.nat", "proofscript.feature.int"],
  setup(registry) {
    registry.registerType("Int64", "Int64");
    const t = nominalType("Int64", "Int64");
    const nat = nominalType("Nat", "Nat");
    const int = nominalType("Int", "Int");

    for (const [op, notes] of [
      ["core.int64.literal", "Lean Int64 nonnegative numeral semantics interpreted modulo 2^64 as signed two's-complement."],
      ["lean.int64.ofNat", "Lean Int64.ofNat semantics modulo 2^64."],
      ["lean.int64.ofInt", "Lean Int64.ofInt two's-complement truncation semantics modulo 2^64."],
      ["lean.int64.toInt", "Lean Int64.toInt canonical signed value in [-9223372036854775808,9223372036854775807]."],
    ] as const) registry.registerOperation(op, { requiredCapabilities: ["core.int64"], verification: { level: "kernel-checkable", notes } });

    registry.registerLiteralElaborator({
      literalKind: "number",
      supports(expected) { return expected?.id === t.id; },
      elaborate(text, expected) {
        if (!expected || expected.id !== t.id) throw new ProofScriptError("PS2I6401", `Int64 literal '${text}' requires expected type Int64.`);
        return { kind: "literal", op: "core.int64.literal", value: text, type: t };
      },
    });

    registry.registerBuiltinFunction("Int64.ofNat", { params: [valueParam("n", nat)], result: t, operation: "lean.int64.ofNat" });
    registry.registerBuiltinFunction("Int64.ofInt", { params: [valueParam("i", int)], result: t, operation: "lean.int64.ofInt" });
    registry.registerBuiltinFunction("Int64.toInt", { params: [valueParam("i", t)], result: int, operation: "lean.int64.toInt" });

    registry.registerLeanTypeLowering("Int64", () => "Int64");
    registry.registerLeanExprLowering("core.int64.literal", (expr) => {
      if (expr.kind !== "literal" || !/^\d+$/.test(expr.value)) throw new ProofScriptError("PS4I6401", "Malformed Int64 literal IR node.");
      return `(${expr.value} : Int64)`;
    });
    const unary = (name: string): ExprLowering => (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4I6402", `Malformed ${name} IR node.`);
      return `(${name} ${context.emitExpr(expr.args[0]!)})`;
    };
    registry.registerLeanExprLowering("lean.int64.ofNat", unary("Int64.ofNat"));
    registry.registerLeanExprLowering("lean.int64.ofInt", unary("Int64.ofInt"));
    registry.registerLeanExprLowering("lean.int64.toInt", unary("Int64.toInt"));
  },
};
export default plugin;

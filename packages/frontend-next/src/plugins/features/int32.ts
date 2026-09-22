import { ProofScriptError } from "../../core/errors.js";
import type { ExprLowering, IRParam, IRType } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { nominalType } from "../../core/type-utils.js";

function valueParam(name: string, type: IRType): IRParam { return { name, type, binderInfo: "explicit" }; }

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.int32",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["core.int32.literal", "lean.int32.ofNat", "lean.int32.ofInt", "lean.int32.toInt"],
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
    registry.registerType("Int32", "Int32");
    const t = nominalType("Int32", "Int32");
    const nat = nominalType("Nat", "Nat");
    const int = nominalType("Int", "Int");

    for (const [op, notes] of [
      ["core.int32.literal", "Lean Int32 nonnegative numeral semantics interpreted modulo 2^32 as signed two's-complement."],
      ["lean.int32.ofNat", "Lean Int32.ofNat semantics modulo 2^32."],
      ["lean.int32.ofInt", "Lean Int32.ofInt two's-complement truncation semantics modulo 2^32."],
      ["lean.int32.toInt", "Lean Int32.toInt canonical signed value in [-2147483648,2147483647]."],
    ] as const) registry.registerOperation(op, { requiredCapabilities: ["core.int32"], verification: { level: "kernel-checkable", notes } });

    registry.registerLiteralElaborator({
      literalKind: "number",
      supports(expected) { return expected?.id === t.id; },
      elaborate(text, expected) {
        if (!expected || expected.id !== t.id) throw new ProofScriptError("PS2I3201", `Int32 literal '${text}' requires expected type Int32.`);
        return { kind: "literal", op: "core.int32.literal", value: text, type: t };
      },
    });

    registry.registerBuiltinFunction("Int32.ofNat", { params: [valueParam("n", nat)], result: t, operation: "lean.int32.ofNat" });
    registry.registerBuiltinFunction("Int32.ofInt", { params: [valueParam("i", int)], result: t, operation: "lean.int32.ofInt" });
    registry.registerBuiltinFunction("Int32.toInt", { params: [valueParam("i", t)], result: int, operation: "lean.int32.toInt" });

    registry.registerLeanTypeLowering("Int32", () => "Int32");
    registry.registerLeanExprLowering("core.int32.literal", (expr) => {
      if (expr.kind !== "literal" || !/^\d+$/.test(expr.value)) throw new ProofScriptError("PS4I3201", "Malformed Int32 literal IR node.");
      return `(${expr.value} : Int32)`;
    });
    const unary = (name: string): ExprLowering => (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4I3202", `Malformed ${name} IR node.`);
      return `(${name} ${context.emitExpr(expr.args[0]!)})`;
    };
    registry.registerLeanExprLowering("lean.int32.ofNat", unary("Int32.ofNat"));
    registry.registerLeanExprLowering("lean.int32.ofInt", unary("Int32.ofInt"));
    registry.registerLeanExprLowering("lean.int32.toInt", unary("Int32.toInt"));
  },
};
export default plugin;

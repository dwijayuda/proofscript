import { ProofScriptError } from "../../core/errors.js";
import type { ExprLowering, IRParam, IRType } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { nominalType } from "../../core/type-utils.js";

function valueParam(name: string, type: IRType): IRParam { return { name, type, binderInfo: "explicit" }; }

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.int16",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["core.int16.literal", "lean.int16.ofNat", "lean.int16.ofInt", "lean.int16.toInt"],
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
    registry.registerType("Int16", "Int16");
    const t = nominalType("Int16", "Int16");
    const nat = nominalType("Nat", "Nat");
    const int = nominalType("Int", "Int");

    for (const [op, notes] of [
      ["core.int16.literal", "Lean Int16 nonnegative numeral semantics interpreted modulo 2^16 as signed two's-complement."],
      ["lean.int16.ofNat", "Lean Int16.ofNat semantics modulo 2^16."],
      ["lean.int16.ofInt", "Lean Int16.ofInt two's-complement truncation semantics modulo 2^16."],
      ["lean.int16.toInt", "Lean Int16.toInt canonical signed value in [-32768,32767]."],
    ] as const) registry.registerOperation(op, { requiredCapabilities: ["core.int16"], verification: { level: "kernel-checkable", notes } });

    registry.registerLiteralElaborator({
      literalKind: "number",
      supports(expected) { return expected?.id === t.id; },
      elaborate(text, expected) {
        if (!expected || expected.id !== t.id) throw new ProofScriptError("PS2I1601", `Int16 literal '${text}' requires expected type Int16.`);
        return { kind: "literal", op: "core.int16.literal", value: text, type: t };
      },
    });

    registry.registerBuiltinFunction("Int16.ofNat", { params: [valueParam("n", nat)], result: t, operation: "lean.int16.ofNat" });
    registry.registerBuiltinFunction("Int16.ofInt", { params: [valueParam("i", int)], result: t, operation: "lean.int16.ofInt" });
    registry.registerBuiltinFunction("Int16.toInt", { params: [valueParam("i", t)], result: int, operation: "lean.int16.toInt" });

    registry.registerLeanTypeLowering("Int16", () => "Int16");
    registry.registerLeanExprLowering("core.int16.literal", (expr) => {
      if (expr.kind !== "literal" || !/^\d+$/.test(expr.value)) throw new ProofScriptError("PS4I1601", "Malformed Int16 literal IR node.");
      return `(${expr.value} : Int16)`;
    });
    const unary = (name: string): ExprLowering => (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4I1602", `Malformed ${name} IR node.`);
      return `(${name} ${context.emitExpr(expr.args[0]!)})`;
    };
    registry.registerLeanExprLowering("lean.int16.ofNat", unary("Int16.ofNat"));
    registry.registerLeanExprLowering("lean.int16.ofInt", unary("Int16.ofInt"));
    registry.registerLeanExprLowering("lean.int16.toInt", unary("Int16.toInt"));
  },
};
export default plugin;

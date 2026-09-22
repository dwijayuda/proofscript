import { ProofScriptError } from "../../core/errors.js";
import type { ExprLowering, IRParam, IRType } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { nominalType } from "../../core/type-utils.js";

function valueParam(name: string, type: IRType): IRParam { return { name, type, binderInfo: "explicit" }; }

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.int8",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["core.int8.literal", "lean.int8.ofNat", "lean.int8.ofInt", "lean.int8.toInt"],
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
    registry.registerType("Int8", "Int8");
    const t = nominalType("Int8", "Int8");
    const nat = nominalType("Nat", "Nat");
    const int = nominalType("Int", "Int");

    for (const [op, notes] of [
      ["core.int8.literal", "Lean Int8 nonnegative numeral semantics interpreted modulo 2^8 as signed two's-complement."],
      ["lean.int8.ofNat", "Lean Int8.ofNat semantics modulo 2^8."],
      ["lean.int8.ofInt", "Lean Int8.ofInt two's-complement truncation semantics modulo 2^8."],
      ["lean.int8.toInt", "Lean Int8.toInt canonical signed value in [-128,127]."],
    ] as const) registry.registerOperation(op, { requiredCapabilities: ["core.int8"], verification: { level: "kernel-checkable", notes } });

    registry.registerLiteralElaborator({
      literalKind: "number",
      supports(expected) { return expected?.id === t.id; },
      elaborate(text, expected) {
        if (!expected || expected.id !== t.id) throw new ProofScriptError("PS2I801", `Int8 literal '${text}' requires expected type Int8.`);
        return { kind: "literal", op: "core.int8.literal", value: text, type: t };
      },
    });

    registry.registerBuiltinFunction("Int8.ofNat", { params: [valueParam("n", nat)], result: t, operation: "lean.int8.ofNat" });
    registry.registerBuiltinFunction("Int8.ofInt", { params: [valueParam("i", int)], result: t, operation: "lean.int8.ofInt" });
    registry.registerBuiltinFunction("Int8.toInt", { params: [valueParam("i", t)], result: int, operation: "lean.int8.toInt" });

    registry.registerLeanTypeLowering("Int8", () => "Int8");
    registry.registerLeanExprLowering("core.int8.literal", (expr) => {
      if (expr.kind !== "literal" || !/^\d+$/.test(expr.value)) throw new ProofScriptError("PS4I801", "Malformed Int8 literal IR node.");
      return `(${expr.value} : Int8)`;
    });
    const unary = (name: string): ExprLowering => (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4I802", `Malformed ${name} IR node.`);
      return `(${name} ${context.emitExpr(expr.args[0]!)})`;
    };
    registry.registerLeanExprLowering("lean.int8.ofNat", unary("Int8.ofNat"));
    registry.registerLeanExprLowering("lean.int8.ofInt", unary("Int8.ofInt"));
    registry.registerLeanExprLowering("lean.int8.toInt", unary("Int8.toInt"));
  },
};
export default plugin;

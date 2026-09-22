import { ProofScriptError } from "../../core/errors.js";
import type { IRParam, IRType, IRTypeArgument } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { makeSortType, makeTypeVariable, nominalType, typeArgument, typeArgumentDisplay } from "../../core/type-utils.js";
import { ordClassOf } from "./ord.js";

function classType(name: string, args: readonly IRTypeArgument[]): IRType {
  const display = args.length === 0 ? name : `${name}(${args.map(typeArgumentDisplay).join(",")})`;
  return nominalType(
    args.length === 0 ? name : `${name}(${args.map((arg) => `${arg.kind}:${typeArgumentDisplay(arg)}`).join(",")})`,
    display,
    `lean.class:${name}`,
    args,
  );
}
function valueParam(name: string, type: IRType, binderInfo: IRParam["binderInfo"] = "explicit", extra: Partial<IRParam> = {}): IRParam {
  return { name, type, binderInfo, ...extra };
}
function leClassOf(type: IRType): IRType { return classType("LE", [typeArgument(type)]); }
function ltClassOf(type: IRType): IRType { return classType("LT", [typeArgument(type)]); }
function beqClassOf(type: IRType): IRType { return classType("BEq", [typeArgument(type)]); }

const factories = [
  { name: "LE.ofOrd", operation: "lean.order.leOfOrd", result: leClassOf },
  { name: "LT.ofOrd", operation: "lean.order.ltOfOrd", result: ltClassOf },
  { name: "BEq.ofOrd", operation: "lean.order.beqOfOrd", result: beqClassOf },
] as const;

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.ord-factories",
  version: "0.91.0",
  kind: "feature",
  semanticIds: factories.map((factory) => factory.operation),
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.ord", "proofscript.feature.order", "proofscript.feature.typeclass"],
  setup(registry) {
    const sortU = makeSortType("Type", { kind: "param", name: "u" });
    const A = makeTypeVariable("A", sortU);
    for (const factory of factories) {
      registry.registerBuiltinFunction(factory.name, {
        universeParams: ["u"],
        params: [
          valueParam("A", sortU, "explicit", { isTypeParam: true }),
          valueParam("ord", ordClassOf(A), "instance"),
        ],
        result: factory.result(A),
        operation: factory.operation,
      });
      registry.registerOperation(factory.operation, {
        verification: { level: "kernel-checkable", notes: `Exact Lean 4.33.1 ${factory.name} dictionary factory retaining the selected Ord evidence.` },
        domain: "runtime",
      });
      registry.registerLeanExprLowering(factory.operation, (expr, context) => {
        if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS4ORF01", `Malformed ${factory.name} factory operation.`);
        const typeArg = expr.args[0]!;
        const ord = expr.args[1]!;
        const arg = typeArg.kind === "type" ? typeArg.value : undefined;
        if (!arg) throw new ProofScriptError("PS4ORF02", `Malformed ${factory.name} result type.`);
        return `(@${factory.name} ${context.emitType(arg)} ${context.emitExpr(ord)})`;
      });
    }
  },
};

export default plugin;

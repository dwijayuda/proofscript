import { ProofScriptError } from "../../core/errors.js";
import type { ClassDescriptor, IRParam, IRType, IRTypeArgument } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { makePiType, makeSortType, makeTypeVariable, nominalType, typeArgument, typeArgumentDisplay } from "../../core/type-utils.js";

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
export function ordClassOf(type: IRType): IRType { return classType("Ord", [typeArgument(type)]); }

const builtinNumericTypes = ["Nat", "Int", "Int8", "Int16", "Int32", "Int64", "UInt8", "UInt16", "UInt32", "UInt64"] as const;
const orderingConstructors = ["lt", "eq", "gt"] as const;

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.ord",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.type:Ordering", "lean.class:Ord", "lean.ord.compare"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.type", "proofscript.feature.typeclass"],
  setup(registry) {
    const ordering = nominalType("Ordering", "Ordering");
    registry.registerType("Ordering", "Ordering");
    registry.registerLeanTypeLowering("Ordering", () => "Ordering");

    for (const ctor of orderingConstructors) {
      const operation = `lean.ordering.${ctor}`;
      registry.registerBuiltinFunction(`Ordering.${ctor}`, { params: [], result: ordering, operation });
      registry.registerOperation(operation, {
        verification: { level: "kernel-checkable", notes: `Lean Ordering.${ctor} constructor.` },
        domain: "runtime",
      });
      registry.registerLeanExprLowering(operation, (expr) => {
        if (expr.kind !== "op" || expr.args.length !== 0) throw new ProofScriptError("PS4ORD10", `Malformed Ordering.${ctor} constructor.`);
        return `Ordering.${ctor}`;
      });
    }

    const sortU = makeSortType("Type", { kind: "param", name: "u" });
    const A = makeTypeVariable("A", sortU);
    const compareType = makePiType({ name: "left", binderInfo: "explicit" }, A,
      makePiType({ name: "right", binderInfo: "explicit" }, A, ordering));
    const descriptor: ClassDescriptor = {
      name: "Ord",
      params: [valueParam("A", sortU, "explicit", { isTypeParam: true })],
      fields: [{ name: "compare", type: compareType }],
      ownFields: [{ name: "compare", type: compareType }],
      family: "lean.class:Ord",
    };
    registry.registerBuiltinClass(descriptor);
    registry.registerTypeFamily("Ord", {
      params: [{ kind: "type" }],
      resolve(args) {
        if (args.length !== 1 || args[0]?.kind !== "type") throw new ProofScriptError("PS2ORD10", "Ord expects one type argument.");
        return ordClassOf(args[0].value);
      },
    });
    registry.registerLeanTypeFamilyLowering("lean.class:Ord", (type, context) => {
      const arg = type.args?.[0];
      if (!arg || arg.kind !== "type") throw new ProofScriptError("PS4ORD11", "Malformed Ord type in Semantic IR.");
      return `Ord ${context.emitType(arg.value)}`;
    });

    for (const typeName of builtinNumericTypes) {
      const type = nominalType(typeName, typeName);
      registry.registerBuiltinInstance({ name: `__psInstOrd${typeName}`, params: [], resultType: ordClassOf(type), priority: 1000 });
    }

    registry.registerBuiltinFunction("compare", {
      universeParams: ["u"],
      params: [
        valueParam("A", sortU, "implicit", { isTypeParam: true }),
        valueParam("self", ordClassOf(A), "instance"),
        valueParam("left", A),
        valueParam("right", A),
      ],
      result: ordering,
      operation: "lean.ord.compare",
    });
    registry.registerOperation("lean.ord.compare", {
      verification: { level: "kernel-checkable", notes: "Lean Ord.compare with the exact dictionary selected by ProofScript instance synthesis." },
      domain: "runtime",
    });
    registry.registerLeanExprLowering("lean.ord.compare", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 3) throw new ProofScriptError("PS4ORD12", "Malformed Ord.compare operation.");
      const [self, left, right] = expr.args;
      return `(@Ord.compare ${context.emitType(left!.type)} ${context.emitExpr(self!)} ${context.emitExpr(left!)} ${context.emitExpr(right!)})`;
    });

    const leanPrelude = builtinNumericTypes
      .map((typeName) => `@[instance_reducible] def __psInstOrd${typeName} : Ord ${typeName} := inferInstance`)
      .join("\n");
    registry.registerLeanPrelude(leanPrelude);
  },
};

export default plugin;

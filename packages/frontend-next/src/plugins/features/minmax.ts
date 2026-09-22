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
export function minClassOf(type: IRType): IRType { return classType("Min", [typeArgument(type)]); }
export function maxClassOf(type: IRType): IRType { return classType("Max", [typeArgument(type)]); }

const builtinNumericTypes = ["Nat", "Int", "Int8", "Int16", "Int32", "Int64", "UInt8", "UInt16", "UInt32", "UInt64"] as const;

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.minmax",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.class:Min", "lean.class:Max", "lean.min", "lean.max"],
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
    const sortU = makeSortType("Type", { kind: "param", name: "u" });
    const A = makeTypeVariable("A", sortU);
    const binaryType = makePiType({ name: "left", binderInfo: "explicit" }, A,
      makePiType({ name: "right", binderInfo: "explicit" }, A, A));

    for (const [name, family, field] of [
      ["Min", "lean.class:Min", "min"],
      ["Max", "lean.class:Max", "max"],
    ] as const) {
      const descriptor: ClassDescriptor = {
        name,
        params: [valueParam("A", sortU, "explicit", { isTypeParam: true })],
        fields: [{ name: field, type: binaryType }],
        ownFields: [{ name: field, type: binaryType }],
        family,
      };
      registry.registerBuiltinClass(descriptor);
      registry.registerTypeFamily(name, {
        params: [{ kind: "type" }],
        resolve(args) {
          if (args.length !== 1 || args[0]?.kind !== "type") throw new ProofScriptError("PS2MM01", `${name} expects one type argument.`);
          return name === "Min" ? minClassOf(args[0].value) : maxClassOf(args[0].value);
        },
      });
      registry.registerLeanTypeFamilyLowering(family, (type, context) => {
        const arg = type.args?.[0];
        if (!arg || arg.kind !== "type") throw new ProofScriptError("PS4MM01", `Malformed ${name} type in Semantic IR.`);
        return `${name} ${context.emitType(arg.value)}`;
      });
    }

    for (const typeName of builtinNumericTypes) {
      const type = nominalType(typeName, typeName);
      registry.registerBuiltinInstance({ name: `__psInstMin${typeName}`, params: [], resultType: minClassOf(type), priority: 1000 });
      registry.registerBuiltinInstance({ name: `__psInstMax${typeName}`, params: [], resultType: maxClassOf(type), priority: 1000 });
    }

    for (const [name, classOf, operation] of [
      ["min", minClassOf, "lean.min"],
      ["max", maxClassOf, "lean.max"],
    ] as const) {
      registry.registerBuiltinFunction(name, {
        universeParams: ["u"],
        params: [
          valueParam("A", sortU, "implicit", { isTypeParam: true }),
          valueParam("self", classOf(A), "instance"),
          valueParam("left", A),
          valueParam("right", A),
        ],
        result: A,
        operation,
      });
      registry.registerOperation(operation, {
        verification: { level: "kernel-checkable", notes: `Lean ${name} through the exact ${name === "min" ? "Min" : "Max"} dictionary selected by ProofScript instance synthesis.` },
        domain: "runtime",
      });
      registry.registerLeanExprLowering(operation, (expr, context) => {
        if (expr.kind !== "op" || expr.args.length !== 3) throw new ProofScriptError("PS4MM02", `Malformed ${name} operation.`);
        const [self, left, right] = expr.args;
        const klass = name === "min" ? "Min.min" : "Max.max";
        return `(@${klass} ${context.emitType(left!.type)} ${context.emitExpr(self!)} ${context.emitExpr(left!)} ${context.emitExpr(right!)})`;
      });
    }

    registry.registerLeanPrelude(builtinNumericTypes.flatMap((typeName) => [
      `@[instance_reducible] def __psInstMin${typeName} : Min ${typeName} := inferInstance`,
      `@[instance_reducible] def __psInstMax${typeName} : Max ${typeName} := inferInstance`,
    ]).join("\n"));
  },
};

export default plugin;

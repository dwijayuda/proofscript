import { ProofScriptError } from "../../core/errors.js";
import type { ClassDescriptor, IRParam, IRType, IRTypeArgument, SurfaceExpr } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { makePiType, makeSortType, makeTypeVariable, nominalType, typeArgument, typeArgumentDisplay } from "../../core/type-utils.js";

interface NegPayload { readonly value: SurfaceExpr; }

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
export function negClassOf(type: IRType): IRType { return classType("Neg", [typeArgument(type)]); }

const builtinNegInstances = [
  ["__psInstNegInt", "Int"],
  ["__psInstNegInt8", "Int8"],
  ["__psInstNegInt16", "Int16"],
  ["__psInstNegInt32", "Int32"],
  ["__psInstNegInt64", "Int64"],
  ["__psInstNegUInt8", "UInt8"],
  ["__psInstNegUInt16", "UInt16"],
  ["__psInstNegUInt32", "UInt32"],
  ["__psInstNegUInt64", "UInt64"],
] as const;

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.neg",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.class:Neg", "lean.neg"],
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
    const descriptor: ClassDescriptor = {
      name: "Neg",
      params: [valueParam("A", sortU, "explicit", { isTypeParam: true })],
      fields: [{ name: "neg", type: makePiType({ name: "value", binderInfo: "explicit" }, A, A) }],
      ownFields: [{ name: "neg", type: makePiType({ name: "value", binderInfo: "explicit" }, A, A) }],
      family: "lean.class:Neg",
    };
    registry.registerBuiltinClass(descriptor);
    registry.registerTypeFamily("Neg", {
      params: [{ kind: "type" }],
      resolve(args) {
        if (args.length !== 1 || args[0]?.kind !== "type") throw new ProofScriptError("PS2NEG01", "Neg expects one type argument.");
        return negClassOf(args[0].value);
      },
    });

    for (const [name, typeName] of builtinNegInstances) {
      registry.registerBuiltinInstance({ name, params: [], resultType: negClassOf(nominalType(typeName, typeName)), priority: 1000 });
    }

    registry.registerBuiltinFunction("Neg.neg", {
      universeParams: ["u"],
      params: [
        valueParam("A", sortU, "implicit", { isTypeParam: true }),
        valueParam("self", negClassOf(A), "instance"),
        valueParam("value", A),
      ],
      result: A,
      operation: "lean.neg",
    });
    registry.registerOperation("lean.neg", {
      requiredCapabilities: ["lean.neg"],
      verification: { level: "kernel-checkable", notes: "Lean Neg.neg using the exact instance dictionary selected during ProofScript elaboration." },
      domain: "runtime",
    });

    registry.registerExpressionSyntax({
      keyword: "-",
      owner: "lean.neg.syntax",
      parse(cursor) { return { kind: "extension", owner: "lean.neg.syntax", payload: { value: cursor.parseExpression(100) } satisfies NegPayload }; },
    });
    registry.registerExpressionElaborator({
      owner: "lean.neg.syntax",
      elaborate(expr, expected, context) {
        if (expr.kind !== "extension" || expr.owner !== "lean.neg.syntax") throw new ProofScriptError("PS2NEG02", "Malformed Neg expression.");
        const payload = expr.payload as NegPayload;
        const value = expected ? context.elaborateExpression(payload.value, expected) : context.elaborateExpression(payload.value);
        const self = context.synthesizeInstance(negClassOf(value.type));
        return { kind: "op", op: "lean.neg", args: [self, value], type: value.type };
      },
    });

    registry.registerLeanPrelude([
      `@[instance_reducible] def __psInstNegInt : Neg Int := Int.instNegInt`,
      `@[instance_reducible] def __psInstNegInt8 : Neg Int8 := Int8.instNeg`,
      `@[instance_reducible] def __psInstNegInt16 : Neg Int16 := Int16.instNeg`,
      `@[instance_reducible] def __psInstNegInt32 : Neg Int32 := Int32.instNeg`,
      `@[instance_reducible] def __psInstNegInt64 : Neg Int64 := Int64.instNeg`,
      `@[instance_reducible] def __psInstNegUInt8 : Neg UInt8 := instNegUInt8`,
      `@[instance_reducible] def __psInstNegUInt16 : Neg UInt16 := instNegUInt16`,
      `@[instance_reducible] def __psInstNegUInt32 : Neg UInt32 := instNegUInt32`,
      `@[instance_reducible] def __psInstNegUInt64 : Neg UInt64 := instNegUInt64`,
    ].join("\n"));
    registry.registerLeanTypeFamilyLowering("lean.class:Neg", (type, context) => {
      const arg = type.args?.[0];
      if (!arg || arg.kind !== "type") throw new ProofScriptError("PS4NEG01", "Malformed Neg type in Semantic IR.");
      return `Neg ${context.emitType(arg.value)}`;
    });
    registry.registerLeanExprLowering("lean.neg", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS4NEG02", "Malformed Neg.neg IR node.");
      const [self, value] = expr.args;
      return `(@Neg.neg ${context.emitType(value!.type)} ${context.emitExpr(self!)} ${context.emitExpr(value!)})`;
    });
  },
};
export default plugin;

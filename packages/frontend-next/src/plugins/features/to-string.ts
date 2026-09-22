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

export function toStringClassOf(type: IRType): IRType { return classType("ToString", [typeArgument(type)]); }

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.to-string",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.class:ToString", "lean.toString"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.type", "proofscript.feature.typeclass", "proofscript.feature.string"],
  setup(registry) {
    const sortU = makeSortType("Type", { kind: "param", name: "u" });
    const A = makeTypeVariable("A", sortU);
    const stringType = nominalType("String", "String");
    const descriptor: ClassDescriptor = {
      name: "ToString",
      params: [valueParam("A", sortU, "explicit", { isTypeParam: true })],
      fields: [{ name: "toString", type: makePiType({ name: "value", binderInfo: "explicit" }, A, stringType) }],
      ownFields: [{ name: "toString", type: makePiType({ name: "value", binderInfo: "explicit" }, A, stringType) }],
      family: "lean.class:ToString",
    };
    registry.registerBuiltinClass(descriptor);
    registry.registerTypeFamily("ToString", {
      params: [{ kind: "type" }],
      resolve(args) {
        if (args.length !== 1 || args[0]?.kind !== "type") throw new ProofScriptError("PS2C01", "ToString expects one type argument.");
        return toStringClassOf(args[0].value);
      },
    });

    // Lean prelude environment data. This is not emitted as a user instance.
    registry.registerBuiltinInstance({
      name: "instToStringString",
      params: [],
      resultType: toStringClassOf(stringType),
      priority: 1000,
    });

    registry.registerBuiltinFunction("toString", {
      universeParams: ["u"],
      params: [
        valueParam("A", sortU, "implicit", { isTypeParam: true }),
        valueParam("self", toStringClassOf(A), "instance"),
        valueParam("value", A),
      ],
      result: stringType,
      operation: "lean.toString",
    });
    registry.registerOperation("lean.toString", {
      requiredCapabilities: ["lean.toString"],
      verification: { level: "kernel-checkable", notes: "Lean ToString.toString using the exact instance dictionary selected during ProofScript elaboration." },
      domain: "runtime",
    });
    registry.registerLeanExprLowering("lean.toString", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length < 2) throw new ProofScriptError("PS4C01", "Malformed toString IR node.");
      const self = expr.args.at(-2)!;
      const value = expr.args.at(-1)!;
      return `(@toString ${context.emitType(value.type)} ${context.emitExpr(self)} ${context.emitExpr(value)})`;
    });
  },
};

export default plugin;

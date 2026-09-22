import { ProofScriptError } from "../../core/errors.js";
import type { IRExpr, IRParam, IRType, IRTypeArgument } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { exprKey, makePiType, makeSortType, makeTypeVariable, nominalType, termArgument, typeArgument, typeArgumentDisplay } from "../../core/type-utils.js";
import { minClassOf, maxClassOf } from "./minmax.js";

function classType(name: string, args: readonly IRTypeArgument[]): IRType {
  const display = args.length === 0 ? name : `${name}(${args.map(typeArgumentDisplay).join(",")})`;
  return nominalType(
    args.length === 0 ? name : `${name}(${args.map((arg) => `${arg.kind}:${typeArgumentDisplay(arg)}`).join(",")})`,
    display,
    `lean.class:${name}`,
    args,
  );
}
function leClassOf(type: IRType): IRType { return classType("LE", [typeArgument(type)]); }
function valueParam(name: string, type: IRType, binderInfo: IRParam["binderInfo"] = "explicit", extra: Partial<IRParam> = {}): IRParam {
  return { name, type, binderInfo, ...extra };
}
function canonicalRelationExpr(expr: IRExpr): IRExpr {
  if (expr.kind === "lambda") return { ...expr, body: canonicalRelationExpr(expr.body) };
  if (expr.kind === "op" && expr.op === "lean.le" && expr.args[0]?.kind === "type") {
    return { ...expr, args: expr.args.slice(1) };
  }
  return expr;
}

export function decidableRelOf(relation: IRExpr): IRType {
  const canonical = canonicalRelationExpr(relation);
  return nominalType(
    `DecidableRel(E:${exprKey(canonical)})`,
    "DecidableRel(r)",
    "lean.decidable-rel",
    [termArgument(canonical)],
  );
}
function relationTypeParts(relation: IRExpr): { left: IRType; right: IRType; prop: IRType } {
  const first = relation.type;
  const second = first.form === "pi" ? first.codomain : undefined;
  const prop = second?.form === "pi" ? second.codomain : undefined;
  if (first.form !== "pi" || !first.domain || second?.form !== "pi" || !second.domain || !prop || prop.sortAlias !== "Prop") {
    throw new ProofScriptError("PS2DR01", `DecidableRel expects a relation of type α → β → Prop; got '${relation.type.displayName}'.`);
  }
  return { left: first.domain, right: second.domain, prop };
}
function leRelation(type: IRType, self: IRExpr, prop: IRType): IRExpr {
  const left = { kind: "var", name: "left", type } as IRExpr;
  const right = { kind: "var", name: "right", type } as IRExpr;
  const body = { kind: "op", op: "lean.le", args: [self, left, right], type: prop } as IRExpr;
  const relationType = makePiType({ name: "left", binderInfo: "explicit" }, type,
    makePiType({ name: "right", binderInfo: "explicit" }, type, prop));
  const innerType = makePiType({ name: "right", binderInfo: "explicit" }, type, prop);
  const inner = {
    kind: "lambda",
    params: [valueParam("right", type)],
    body,
    type: innerType,
  } as IRExpr;
  return {
    kind: "lambda",
    params: [valueParam("left", type)],
    body: inner,
    type: relationType,
  };
}

const builtinNumericTypes = ["Nat", "Int", "Int8", "Int16", "Int32", "Int64", "UInt8", "UInt16", "UInt32", "UInt64"] as const;

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.decidable-rel",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.DecidableRel", "lean.minOfLe", "lean.maxOfLe"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.conditionals", "proofscript.feature.order", "proofscript.feature.minmax"],
  setup(registry) {
    const prop = makeSortType("Prop");
    const sortU = makeSortType("Type", { kind: "param", name: "u" });
    const A = makeTypeVariable("A", sortU);
    const leVar = { kind: "var", name: "le", type: leClassOf(A) } as IRExpr;
    const relation = leRelation(A, leVar, prop);

    registry.registerTypeFamily("DecidableRel", {
      params: [{ kind: "term" }],
      resolve(args) {
        if (args.length !== 1 || args[0]?.kind !== "term") throw new ProofScriptError("PS2DR02", "DecidableRel expects one relation term.");
        relationTypeParts(args[0].value);
        return decidableRelOf(args[0].value);
      },
    });
    registry.registerLeanTypeFamilyLowering("lean.decidable-rel", (type, context) => {
      const relationArg = type.args?.[0];
      if (!relationArg || relationArg.kind !== "term") throw new ProofScriptError("PS4DR01", "Malformed DecidableRel type in Semantic IR.");
      return `(DecidableRel ${context.emitExpr(relationArg.value)})`;
    });

    for (const typeName of builtinNumericTypes) {
      const type = nominalType(typeName, typeName);
      const self = { kind: "var", name: `__psInstLE${typeName}`, type: leClassOf(type) } as IRExpr;
      registry.registerBuiltinInstance({
        name: `__psDecidableRelLE${typeName}`,
        params: [],
        resultType: decidableRelOf(leRelation(type, self, prop)),
        priority: 1000,
      });
    }

    for (const [name, operation, result] of [
      ["minOfLe", "lean.minOfLe", minClassOf(A)],
      ["maxOfLe", "lean.maxOfLe", maxClassOf(A)],
    ] as const) {
      registry.registerBuiltinFunction(name, {
        universeParams: ["u"],
        params: [
          valueParam("A", sortU, "implicit", { isTypeParam: true }),
          valueParam("le", leClassOf(A), "instance"),
          valueParam("decide", decidableRelOf(relation), "instance"),
        ],
        result,
        operation,
      });
      registry.registerOperation(operation, {
        verification: { level: "kernel-checkable", notes: `Exact Lean 4.33.1 ${name}: selected LE dictionary plus matching DecidableRel evidence.` },
        domain: "runtime",
      });
      registry.registerLeanExprLowering(operation, (expr, context) => {
        if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS4DR02", `Malformed ${name} operation.`);
        const [le, decide] = expr.args;
        const type = le?.type.args?.[0];
        if (!le || !decide || !type || type.kind !== "type") throw new ProofScriptError("PS4DR03", `Malformed ${name} dictionary arguments.`);
        return `(@${name} ${context.emitType(type.value)} ${context.emitExpr(le)} ${context.emitExpr(decide)})`;
      });
    }

    registry.registerLeanPrelude(builtinNumericTypes.map((typeName) =>
      `@[instance_reducible] def __psDecidableRelLE${typeName} : DecidableRel (@LE.le ${typeName} __psInstLE${typeName}) := inferInstance`,
    ).join("\n"));
  },
};

export default plugin;

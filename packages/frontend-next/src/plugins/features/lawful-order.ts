import { ProofScriptError } from "../../core/errors.js";
import type { ClassDescriptor, IRExpr, IRParam, IRType, IRTypeArgument } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { exprKey, makePiType, makeSortType, makeTypeVariable, nominalType, termArgument, typeArgument, typeArgumentDisplay } from "../../core/type-utils.js";
import { decidableOf } from "./conditionals.js";
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
function relationClass(name: "LT" | "LE", type: IRType): IRType { return classType(name, [typeArgument(type)]); }
function valueParam(name: string, type: IRType, binderInfo: IRParam["binderInfo"] = "explicit", extra: Partial<IRParam> = {}): IRParam {
  return { name, type, binderInfo, ...extra };
}
function instanceExpr(name: string, type: IRType): IRExpr { return { kind: "var", name, type }; }
function relationExpr(operation: "lean.lt" | "lean.le", self: IRExpr, left: IRExpr, right: IRExpr, prop: IRType): IRExpr {
  return { kind: "op", op: operation, args: [self, left, right], type: prop };
}

/**
 * Lean's law classes are Prop-valued classes whose hidden instance parameters
 * are semantically part of the proposition.  Keep those dictionaries as
 * hidden term indices in IR so a proof for one selected Ord/LE/LT combination
 * cannot be reused after instance selection changes.
 */
function indexedLawProp(
  name: "Std.LawfulOrderOrd" | "Std.LawfulOrderLT",
  A: IRType,
  dictionaries: readonly IRExpr[],
  prop: IRType,
): IRType {
  const args: IRTypeArgument[] = [typeArgument(A), ...dictionaries.map(termArgument)];
  const witness: IRExpr = { kind: "op", op: `lean.law.type:${name}`, args: [...dictionaries], type: prop };
  return {
    form: "term",
    id: `lean.law:${name}:${A.id}:${exprKey(witness)}`,
    displayName: `${name}(${A.displayName})`,
    family: `lean.class:${name}`,
    args,
    term: witness,
  };
}

export function lawfulOrderOrdOf(A: IRType, ord: IRExpr, le: IRExpr, prop = makeSortType("Prop")): IRType {
  return indexedLawProp("Std.LawfulOrderOrd", A, [ord, le], prop);
}
export function lawfulOrderLTOf(A: IRType, lt: IRExpr, le: IRExpr, prop = makeSortType("Prop")): IRType {
  return indexedLawProp("Std.LawfulOrderLT", A, [lt, le], prop);
}

const builtinNumericTypes = ["Nat", "Int", "Int8", "Int16", "Int32", "Int64", "UInt8", "UInt16", "UInt32", "UInt64"] as const;

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.lawful-order",
  version: "0.91.0",
  kind: "feature",
  semanticIds: [
    "lean.class:Std.LawfulOrderOrd",
    "lean.class:Std.LawfulOrderLT",
    "lean.order.decidableLEOfOrd",
    "lean.order.decidableLTOfOrd",
  ],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: [
    "proofscript.feature.typeclass",
    "proofscript.feature.conditionals",
    "proofscript.feature.order",
    "proofscript.feature.ord",
  ],
  setup(registry) {
    const prop = makeSortType("Prop");
    const sortU = makeSortType("Type", { kind: "param", name: "u" });
    const A = makeTypeVariable("A", sortU);
    const ordVar = instanceExpr("ord", ordClassOf(A));
    const leVar = instanceExpr("le", relationClass("LE", A));
    const ltVar = instanceExpr("lt", relationClass("LT", A));

    const lawOrdDescriptor: ClassDescriptor = {
      name: "Std.LawfulOrderOrd",
      params: [
        valueParam("A", sortU, "explicit", { isTypeParam: true }),
        valueParam("ord", ordClassOf(A), "instance"),
        valueParam("le", relationClass("LE", A), "instance"),
      ],
      fields: [],
      ownFields: [],
      family: "lean.class:Std.LawfulOrderOrd",
    };
    const lawLTDescriptor: ClassDescriptor = {
      name: "Std.LawfulOrderLT",
      params: [
        valueParam("A", sortU, "explicit", { isTypeParam: true }),
        valueParam("lt", relationClass("LT", A), "instance"),
        valueParam("le", relationClass("LE", A), "instance"),
      ],
      fields: [],
      ownFields: [],
      family: "lean.class:Std.LawfulOrderLT",
    };
    registry.registerBuiltinClass(lawOrdDescriptor);
    registry.registerBuiltinClass(lawLTDescriptor);

    registry.registerLeanTypeFamilyLowering("lean.class:Std.LawfulOrderOrd", (type, context) => {
      const [a, ord, le] = type.args ?? [];
      if (a?.kind !== "type" || ord?.kind !== "term" || le?.kind !== "term") throw new ProofScriptError("PS4LAW01", "Malformed Std.LawfulOrderOrd type.");
      return `(@Std.LawfulOrderOrd ${context.emitType(a.value)} ${context.emitExpr(ord.value)} ${context.emitExpr(le.value)})`;
    });
    registry.registerLeanTypeFamilyLowering("lean.class:Std.LawfulOrderLT", (type, context) => {
      const [a, lt, le] = type.args ?? [];
      if (a?.kind !== "type" || lt?.kind !== "term" || le?.kind !== "term") throw new ProofScriptError("PS4LAW02", "Malformed Std.LawfulOrderLT type.");
      return `(@Std.LawfulOrderLT ${context.emitType(a.value)} ${context.emitExpr(lt.value)} ${context.emitExpr(le.value)})`;
    });

    const leanPrelude: string[] = [];
    for (const typeName of builtinNumericTypes) {
      const type = nominalType(typeName, typeName);
      const ord = instanceExpr(`__psInstOrd${typeName}`, ordClassOf(type));
      const le = instanceExpr(`__psInstLE${typeName}`, relationClass("LE", type));
      const lt = instanceExpr(`__psInstLT${typeName}`, relationClass("LT", type));
      registry.registerBuiltinInstance({
        name: `__psLawfulOrderOrd${typeName}`,
        params: [],
        resultType: lawfulOrderOrdOf(type, ord, le, prop),
        priority: 1000,
      });
      registry.registerBuiltinInstance({
        name: `__psLawfulOrderLT${typeName}`,
        params: [],
        resultType: lawfulOrderLTOf(type, lt, le, prop),
        priority: 1000,
      });
      leanPrelude.push(
        `theorem __psLawfulOrderOrd${typeName} : @Std.LawfulOrderOrd ${typeName} __psInstOrd${typeName} __psInstLE${typeName} := by infer_instance`,
        `theorem __psLawfulOrderLT${typeName} : @Std.LawfulOrderLT ${typeName} __psInstLT${typeName} __psInstLE${typeName} := by infer_instance`,
      );
    }

    const left = { kind: "var", name: "left", type: A } as IRExpr;
    const right = { kind: "var", name: "right", type: A } as IRExpr;
    const leCondition = relationExpr("lean.le", leVar, left, right, prop);
    const ltCondition = relationExpr("lean.lt", ltVar, left, right, prop);
    const lawOrdVar = instanceExpr("lawOrd", lawfulOrderOrdOf(A, ordVar, leVar, prop));
    const lawLTVar = instanceExpr("lawLT", lawfulOrderLTOf(A, ltVar, leVar, prop));

    // A higher priority than the historical direct numeric Decidable candidates
    // makes the new lawful bridge observable without deleting the old fallback.
    // If law synthesis fails (for example after a custom Ord/LE override),
    // search may still use a genuinely independent direct Decidable instance.
    registry.registerBuiltinInstance({
      name: "__psDecidableLEOfOrd",
      params: [
        valueParam("A", sortU, "implicit", { isTypeParam: true }),
        valueParam("le", relationClass("LE", A), "instance"),
        valueParam("ord", ordClassOf(A), "instance"),
        valueParam("lawOrd", lawfulOrderOrdOf(A, ordVar, leVar, prop), "instance", { isProofParam: true, runtimeErased: true }),
        valueParam("left", A), valueParam("right", A),
      ],
      resultType: decidableOf(leCondition),
      priority: 1100,
    });
    registry.registerBuiltinInstance({
      name: "__psDecidableLTOfOrd",
      params: [
        valueParam("A", sortU, "implicit", { isTypeParam: true }),
        valueParam("le", relationClass("LE", A), "instance"),
        valueParam("lt", relationClass("LT", A), "instance"),
        valueParam("ord", ordClassOf(A), "instance"),
        valueParam("lawOrd", lawfulOrderOrdOf(A, ordVar, leVar, prop), "instance", { isProofParam: true, runtimeErased: true }),
        valueParam("lawLT", lawfulOrderLTOf(A, ltVar, leVar, prop), "instance", { isProofParam: true, runtimeErased: true }),
        valueParam("left", A), valueParam("right", A),
      ],
      resultType: decidableOf(ltCondition),
      priority: 1100,
    });

    // Expose the exact Lean factories as proof-domain builtins. Their results
    // are functions producing Decidable evidence; executable backends do not
    // identify this proof object with a host boolean.
    registry.registerBuiltinFunction("DecidableLE.ofOrd", {
      universeParams: ["u"],
      params: [
        valueParam("A", sortU, "explicit", { isTypeParam: true }),
        valueParam("le", relationClass("LE", A), "instance"),
        valueParam("ord", ordClassOf(A), "instance"),
        valueParam("lawOrd", lawfulOrderOrdOf(A, ordVar, leVar, prop), "instance", { isProofParam: true, runtimeErased: true }),
      ],
      result: makePiType({ name: "left", binderInfo: "explicit" }, A,
        makePiType({ name: "right", binderInfo: "explicit" }, A, decidableOf(leCondition))),
      operation: "lean.order.decidableLEOfOrd",
    });
    registry.registerBuiltinFunction("DecidableLT.ofOrd", {
      universeParams: ["u"],
      params: [
        valueParam("A", sortU, "explicit", { isTypeParam: true }),
        valueParam("le", relationClass("LE", A), "instance"),
        valueParam("lt", relationClass("LT", A), "instance"),
        valueParam("ord", ordClassOf(A), "instance"),
        valueParam("lawOrd", lawfulOrderOrdOf(A, ordVar, leVar, prop), "instance", { isProofParam: true, runtimeErased: true }),
        valueParam("lawLT", lawfulOrderLTOf(A, ltVar, leVar, prop), "instance", { isProofParam: true, runtimeErased: true }),
      ],
      result: makePiType({ name: "left", binderInfo: "explicit" }, A,
        makePiType({ name: "right", binderInfo: "explicit" }, A, decidableOf(ltCondition))),
      operation: "lean.order.decidableLTOfOrd",
    });
    for (const operation of ["lean.order.decidableLEOfOrd", "lean.order.decidableLTOfOrd"] as const) {
      registry.registerOperation(operation, {
        verification: { level: "kernel-checkable", notes: "Lean 4.33.1 lawful Ord decidability factory with dictionary-indexed proof prerequisites." },
        domain: "proof",
      });
    }
    registry.registerLeanExprLowering("lean.order.decidableLEOfOrd", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 4) throw new ProofScriptError("PS4LAW03", "Malformed DecidableLE.ofOrd operation.");
      const [a, le, ord, law] = expr.args;
      if (a?.kind !== "type") throw new ProofScriptError("PS4LAW04", "Malformed DecidableLE.ofOrd type argument.");
      return `(@DecidableLE.ofOrd ${context.emitType(a.value)} ${context.emitExpr(le!)} ${context.emitExpr(ord!)} ${context.emitExpr(law!)})`;
    });
    registry.registerLeanExprLowering("lean.order.decidableLTOfOrd", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 6) throw new ProofScriptError("PS4LAW05", "Malformed DecidableLT.ofOrd operation.");
      const [a, le, lt, ord, lawOrd, lawLT] = expr.args;
      if (a?.kind !== "type") throw new ProofScriptError("PS4LAW06", "Malformed DecidableLT.ofOrd type argument.");
      return `(@DecidableLT.ofOrd ${context.emitType(a.value)} ${context.emitExpr(le!)} ${context.emitExpr(lt!)} ${context.emitExpr(ord!)} ${context.emitExpr(lawOrd!)} ${context.emitExpr(lawLT!)})`;
    });

    leanPrelude.push(
      `@[instance_reducible] def __psDecidableLEOfOrd {A : Type u} [le : LE A] [ord : Ord A] [lawOrd : @Std.LawfulOrderOrd A ord le] (left right : A) : Decidable (@LE.le A le left right) := @DecidableLE.ofOrd A le ord lawOrd left right`,
      `@[instance_reducible] def __psDecidableLTOfOrd {A : Type u} [le : LE A] [lt : LT A] [ord : Ord A] [lawOrd : @Std.LawfulOrderOrd A ord le] [lawLT : @Std.LawfulOrderLT A lt le] (left right : A) : Decidable (@LT.lt A lt left right) := @DecidableLT.ofOrd A le lt ord lawOrd lawLT left right`,
    );
    registry.registerLeanPrelude(leanPrelude.join("\n"));
  },
};

export default plugin;

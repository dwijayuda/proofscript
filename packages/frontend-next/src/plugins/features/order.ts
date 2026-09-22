import { ProofScriptError } from "../../core/errors.js";
import type { ClassDescriptor, IRExpr, IRParam, IRType, IRTypeArgument, SurfaceExpr } from "../../core/model.js";
import type { DeclarationElaborationContext, PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { makePiType, makeSortType, makeTypeVariable, nominalType, termArgument, typeArgument, typeArgumentDisplay } from "../../core/type-utils.js";
import { decidableOf } from "./conditionals.js";

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
function relationFunction(A: IRType, prop: IRType): IRType {
  return makePiType({ name: "left", binderInfo: "explicit" }, A,
    makePiType({ name: "right", binderInfo: "explicit" }, A, prop));
}
function relationExpr(operation: "lean.lt" | "lean.le", self: IRExpr, left: IRExpr, right: IRExpr, prop: IRType): IRExpr {
  return { kind: "op", op: operation, args: [self, left, right], type: prop };
}
function instanceExpr(name: string, className: "LT" | "LE", type: IRType): IRExpr {
  return { kind: "var", name, type: relationClass(className, type) };
}

const builtinNumericTypes = ["Nat", "Int", "Int8", "Int16", "Int32", "Int64", "UInt8", "UInt16", "UInt32", "UInt64"] as const;
const relations = [
  { className: "LT", field: "lt", operation: "lean.lt", operators: ["<"] as const },
  { className: "LE", field: "le", operation: "lean.le", operators: ["≤", "<="] as const },
] as const;

function registerClassFamily(registry: Parameters<ProofScriptPlugin["setup"]>[0], name: "LT" | "LE"): void {
  registry.registerTypeFamily(name, {
    params: [{ kind: "type" }],
    resolve(args) {
      if (args.length !== 1 || args[0]?.kind !== "type") throw new ProofScriptError("PS2ORD01", `${name} expects one type argument.`);
      return relationClass(name, args[0].value);
    },
  });
  registry.registerLeanTypeFamilyLowering(`lean.class:${name}`, (type, context) => {
    const arg = type.args?.[0];
    if (!arg || arg.kind !== "type") throw new ProofScriptError("PS4ORD01", `Malformed ${name} type in Semantic IR.`);
    return `${name} ${context.emitType(arg.value)}`;
  });
}

function elaborateRelation(
  leftSurface: SurfaceExpr,
  rightSurface: SurfaceExpr,
  expected: IRType | undefined,
  context: DeclarationElaborationContext,
  className: "LT" | "LE",
  operation: "lean.lt" | "lean.le",
  reverse = false,
): IRExpr {
  const prop = context.resolveType("Prop");
  if (expected && expected.id !== prop.id) throw new ProofScriptError("PS2ORD02", `${className} relation has type Prop.`);
  let left: IRExpr;
  let right: IRExpr;
  if (leftSurface.kind === "number" && rightSurface.kind !== "number") {
    right = context.elaborateExpression(rightSurface);
    left = context.elaborateExpression(leftSurface, right.type);
  } else {
    left = context.elaborateExpression(leftSurface);
    right = context.elaborateExpression(rightSurface, left.type);
  }
  if (left.type.id !== right.type.id) throw new ProofScriptError("PS2ORD03", `${className} relation requires both operands to have the same type in the v0.85 slice.`);
  const actualLeft = reverse ? right : left;
  const actualRight = reverse ? left : right;
  const self = context.synthesizeInstance(relationClass(className, actualLeft.type));
  return relationExpr(operation, self, actualLeft, actualRight, prop);
}

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.order",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.class:LT", "lean.class:LE", "lean.lt", "lean.le", "lean.gt", "lean.ge"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.typeclass", "proofscript.feature.conditionals"],
  setup(registry) {
    const prop = makeSortType("Prop");
    const sortU = makeSortType("Type", { kind: "param", name: "u" });
    const A = makeTypeVariable("A", sortU);

    for (const relation of relations) {
      const descriptor: ClassDescriptor = {
        name: relation.className,
        params: [valueParam("A", sortU, "explicit", { isTypeParam: true })],
        fields: [{ name: relation.field, type: relationFunction(A, prop) }],
        ownFields: [{ name: relation.field, type: relationFunction(A, prop) }],
        family: `lean.class:${relation.className}`,
      };
      registry.registerBuiltinClass(descriptor);
      registerClassFamily(registry, relation.className);
      for (const typeName of builtinNumericTypes) {
        const type = nominalType(typeName, typeName);
        const instanceName = `__psInst${relation.className}${typeName}`;
        registry.registerBuiltinInstance({ name: instanceName, params: [], resultType: relationClass(relation.className, type), priority: 1000 });

        const left = { kind: "var", name: "left", type } as IRExpr;
        const right = { kind: "var", name: "right", type } as IRExpr;
        const self = instanceExpr(instanceName, relation.className, type);
        const condition = relationExpr(relation.operation, self, left, right, prop);
        registry.registerBuiltinInstance({
          name: `__psDecidable${relation.className}${typeName}`,
          params: [valueParam("left", type), valueParam("right", type)],
          resultType: decidableOf(condition),
          priority: 1000,
        });
      }
      registry.registerBuiltinFunction(`${relation.className}.${relation.field}`, {
        universeParams: ["u"],
        params: [
          valueParam("A", sortU, "implicit", { isTypeParam: true }),
          valueParam("self", relationClass(relation.className, A), "instance"),
          valueParam("left", A), valueParam("right", A),
        ],
        result: prop,
        operation: relation.operation,
      });
      registry.registerOperation(relation.operation, {
        verification: { level: "kernel-checkable", notes: `Lean ${relation.className}.${relation.field} proposition with explicit selected dictionary.` },
        domain: "proof",
      });
      for (const operator of relation.operators) {
        registry.registerInfixSyntax({ operator, precedence: 50 });
        registry.registerBinaryElaborator({
          operator,
          elaborateSurface(left, right, expected, context) { return elaborateRelation(left, right, expected, context, relation.className, relation.operation); },
          elaborate() { throw new ProofScriptError("PS2ORD04", `${relation.className} requires surface-controlled relation elaboration.`); },
        });
      }
      registry.registerLeanExprLowering(relation.operation, (expr, context) => {
        if (expr.kind !== "op" || expr.args.length !== 3) throw new ProofScriptError("PS4ORD02", `Malformed ${relation.className} relation.`);
        const [self, left, right] = expr.args;
        return `(@${relation.className}.${relation.field} ${context.emitType(left!.type)} ${context.emitExpr(self!)} ${context.emitExpr(left!)} ${context.emitExpr(right!)})`;
      });
    }

    for (const [operator, className, operation] of [
      [">", "LT", "lean.lt"], ["≥", "LE", "lean.le"], [">=", "LE", "lean.le"],
    ] as const) {
      registry.registerInfixSyntax({ operator, precedence: 50 });
      registry.registerBinaryElaborator({
        operator,
        elaborateSurface(left, right, expected, context) { return elaborateRelation(left, right, expected, context, className, operation, true); },
        elaborate() { throw new ProofScriptError("PS2ORD05", `${operator} requires surface-controlled relation elaboration.`); },
      });
    }

    const leanPrelude: string[] = [];
    for (const relation of relations) {
      for (const typeName of builtinNumericTypes) {
        const inst = `__psInst${relation.className}${typeName}`;
        leanPrelude.push(`@[instance_reducible] def ${inst} : ${relation.className} ${typeName} := inferInstance`);
        leanPrelude.push(`@[instance_reducible] def __psDecidable${relation.className}${typeName} (left right : ${typeName}) : Decidable (@${relation.className}.${relation.field} ${typeName} ${inst} left right) := inferInstance`);
      }
    }
    registry.registerLeanPrelude(leanPrelude.join("\n"));
  },
};

export default plugin;

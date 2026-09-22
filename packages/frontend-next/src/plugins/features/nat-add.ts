import { ProofScriptError } from "../../core/errors.js";
import type { ClassDescriptor, IRExpr, IRParam, IRType, IRTypeArgument, SurfaceExpr } from "../../core/model.js";
import type { DeclarationElaborationContext, PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { makePiType, makeSortType, makeTypeVariable, nominalType, typeArgument, typeArgumentDisplay } from "../../core/type-utils.js";

/**
 * Historical filename/plugin id retained for source-config compatibility.
 * Since v0.84 this plugin owns Lean's Add/Sub/Mul + HAdd/HSub/HMul arithmetic
 * foundation rather than a Nat-only `+` special case.
 */

function classType(name: string, args: readonly IRTypeArgument[]): IRType {
  const display = args.length === 0 ? name : `${name}(${args.map(typeArgumentDisplay).join(",")})`;
  return nominalType(
    args.length === 0 ? name : `${name}(${args.map((arg) => `${arg.kind}:${typeArgumentDisplay(arg)}`).join(",")})`,
    display,
    `lean.class:${name}`,
    args,
  );
}
function typeClass(name: string, type: IRType): IRType { return classType(name, [typeArgument(type)]); }
function heteroClass(name: string, left: IRType, right: IRType, result: IRType): IRType {
  return classType(name, [typeArgument(left), typeArgument(right), typeArgument(result)]);
}
function valueParam(name: string, type: IRType, binderInfo: IRParam["binderInfo"] = "explicit", extra: Partial<IRParam> = {}): IRParam {
  return { name, type, binderInfo, ...extra };
}
function binaryFunction(left: IRType, right: IRType, result: IRType): IRType {
  return makePiType({ name: "left", binderInfo: "explicit" }, left,
    makePiType({ name: "right", binderInfo: "explicit" }, right, result));
}

const homogeneousKinds = [
  { className: "Add", field: "add", hClass: "HAdd", hField: "hAdd", operation: "lean.hAdd", operator: "+", precedence: 65 },
  { className: "Sub", field: "sub", hClass: "HSub", hField: "hSub", operation: "lean.hSub", operator: "-", precedence: 65 },
  { className: "Mul", field: "mul", hClass: "HMul", hField: "hMul", operation: "lean.hMul", operator: "*", precedence: 70 },
] as const;
const builtinNumericTypes = ["Nat", "Int", "Int8", "Int16", "Int32", "Int64", "UInt8", "UInt16", "UInt32", "UInt64"] as const;
let outputCounter = 0;

function registerClassFamily(registry: Parameters<ProofScriptPlugin["setup"]>[0], name: string, arity: number): void {
  registry.registerTypeFamily(name, {
    params: Array.from({ length: arity }, () => ({ kind: "type" as const })),
    resolve(args) {
      if (args.length !== arity || args.some((arg) => arg.kind !== "type")) {
        throw new ProofScriptError("PS2AR01", `${name} expects ${arity} type argument(s).`);
      }
      return classType(name, args);
    },
  });
  registry.registerLeanTypeFamilyLowering(`lean.class:${name}`, (type, context) => {
    const args = type.args ?? [];
    if (args.length !== arity || args.some((arg) => arg.kind !== "type")) throw new ProofScriptError("PS4AR01", `Malformed ${name} type in Semantic IR.`);
    return `${name} ${args.map((arg) => context.emitType(arg.kind === "type" ? arg.value : nominalType("Unit", "Unit"))).join(" ")}`;
  });
  registry.registerTargetTypeFamilyLowering("typescript", `lean.class:${name}`, (type, context) => {
    const args = type.args ?? [];
    if (args.length !== arity || args.some((arg) => arg.kind !== "type")) throw new ProofScriptError("PS3AR01", `Malformed ${name} type in Semantic IR.`);
    return `${name}<${args.map((arg) => context.emitType(arg.kind === "type" ? arg.value : nominalType("Unit", "Unit"))).join(", ")}>`;
  });
}

function isCanonicalNatHAdd(expr: IRExpr): boolean {
  if (expr.kind !== "call" || expr.callee !== "__psInstHAdd") return false;
  return expr.args.some((arg) => arg.kind === "var" && arg.name === "__psInstAddNat");
}

function elaborateHeterogeneous(
  leftSurface: SurfaceExpr,
  rightSurface: SurfaceExpr,
  expected: IRType | undefined,
  context: DeclarationElaborationContext,
  hClassName: "HAdd" | "HSub" | "HMul",
  operation: "lean.hAdd" | "lean.hSub" | "lean.hMul",
): IRExpr {
  // Lean's binop% elaborator has richer coercion/defaulting behavior than this
  // bounded slice. We preserve the exact class/outParam semantics and support
  // already-typed heterogeneous operands plus expected-type-directed numeric
  // literals. Unsupported coercion/defaulting combinations fail closed.
  let left: IRExpr;
  let right: IRExpr;
  if (leftSurface.kind === "number" && rightSurface.kind !== "number") {
    right = context.elaborateExpression(rightSurface);
    left = context.elaborateExpression(leftSurface, right.type);
  } else if (rightSurface.kind === "number" && leftSurface.kind !== "number") {
    left = context.elaborateExpression(leftSurface);
    right = context.elaborateExpression(rightSurface, left.type);
  } else if (leftSurface.kind === "number" && rightSurface.kind === "number" && expected) {
    left = context.elaborateExpression(leftSurface, expected);
    right = context.elaborateExpression(rightSurface, expected);
  } else {
    left = context.elaborateExpression(leftSurface);
    right = context.elaborateExpression(rightSurface);
  }

  if (expected) {
    const self = context.synthesizeInstance(heteroClass(hClassName, left.type, right.type, expected));
    if (operation === "lean.hAdd" && left.type.id === "Nat" && right.type.id === "Nat" && expected.id === "Nat" && isCanonicalNatHAdd(self)) {
      return { kind: "op", op: "core.nat.add", args: [left, right], type: expected };
    }
    return { kind: "op", op: operation, args: [self, left, right], type: expected };
  }
  const outputName = `__ps_${hClassName.toLowerCase()}_out_${outputCounter++}`;
  const output = makeTypeVariable(outputName, makeSortType("Type"));
  const search = context.synthesizeInstanceWithTypeOutputs(
    heteroClass(hClassName, left.type, right.type, output),
    new Set([outputName]),
  );
  const resultType = search.inferredTypes.get(outputName);
  if (!resultType) throw new ProofScriptError("PS2AR02", `${hClassName} instance search did not determine its outParam result type.`);
  if (operation === "lean.hAdd" && left.type.id === "Nat" && right.type.id === "Nat" && resultType.id === "Nat" && isCanonicalNatHAdd(search.expr)) {
    return { kind: "op", op: "core.nat.add", args: [left, right], type: resultType };
  }
  return { kind: "op", op: operation, args: [search.expr, left, right], type: resultType };
}

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.nat-add",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.class:Add", "lean.class:Sub", "lean.class:Mul", "lean.class:HAdd", "lean.class:HSub", "lean.class:HMul", "lean.hAdd", "lean.hSub", "lean.hMul"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.nat"],
  setup(registry) {
    registry.registerOperation("core.nat.add", {
      requiredCapabilities: ["core.nat.add"],
      verification: { level: "kernel-checkable", notes: "Canonical HAdd Nat Nat Nat via instHAdd/instAddNat, retained as the historical compact Nat-add IR node." },
    });
    registry.registerLeanExprLowering("core.nat.add", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS4202", "Expected Nat add IR node.");
      return `(${context.emitExpr(expr.args[0]!)} + ${context.emitExpr(expr.args[1]!)})`;
    });
    const sortU = makeSortType("Type", { kind: "param", name: "u" });
    const sortV = makeSortType("Type", { kind: "param", name: "v" });
    const sortW = makeSortType("Type", { kind: "param", name: "w" });
    const A = makeTypeVariable("A", sortU), B = makeTypeVariable("B", sortV), C = makeTypeVariable("C", sortW);

    for (const kind of homogeneousKinds) {
      const homogeneous: ClassDescriptor = {
        name: kind.className,
        params: [valueParam("A", sortU, "explicit", { isTypeParam: true })],
        fields: [{ name: kind.field, type: binaryFunction(A, A, A) }],
        ownFields: [{ name: kind.field, type: binaryFunction(A, A, A) }],
        family: `lean.class:${kind.className}`,
      };
      const heterogeneous: ClassDescriptor = {
        name: kind.hClass,
        params: [
          valueParam("A", sortU, "explicit", { isTypeParam: true }),
          valueParam("B", sortV, "explicit", { isTypeParam: true }),
          valueParam("C", sortW, "explicit", { isTypeParam: true, instanceSearchMode: "out" }),
        ],
        fields: [{ name: kind.hField, type: binaryFunction(A, B, C) }],
        ownFields: [{ name: kind.hField, type: binaryFunction(A, B, C) }],
        family: `lean.class:${kind.hClass}`,
      };
      registry.registerBuiltinClass(homogeneous);
      registry.registerBuiltinClass(heterogeneous);
      registerClassFamily(registry, kind.className, 1);
      registerClassFamily(registry, kind.hClass, 3);

      for (const typeName of builtinNumericTypes) {
        registry.registerBuiltinInstance({
          name: `__psInst${kind.className}${typeName}`,
          params: [],
          resultType: typeClass(kind.className, nominalType(typeName, typeName)),
          priority: 1000,
        });
      }
      registry.registerBuiltinInstance({
        name: `__psInst${kind.hClass}`,
        params: [
          valueParam("A", sortU, "implicit", { isTypeParam: true }),
          valueParam("self", typeClass(kind.className, A), "instance"),
        ],
        resultType: heteroClass(kind.hClass, A, A, A),
        priority: 1000,
        defaultInstancePriority: 1000,
      });

      registry.registerBuiltinFunction(`${kind.hClass}.${kind.hField}`, {
        universeParams: ["u", "v", "w"],
        params: [
          valueParam("A", sortU, "implicit", { isTypeParam: true }),
          valueParam("B", sortV, "implicit", { isTypeParam: true }),
          valueParam("C", sortW, "implicit", { isTypeParam: true, instanceSearchMode: "out" }),
          valueParam("self", heteroClass(kind.hClass, A, B, C), "instance"),
          valueParam("left", A), valueParam("right", B),
        ],
        result: C,
        operation: kind.operation,
      });
      registry.registerOperation(kind.operation, {
        requiredCapabilities: [kind.operation],
        verification: { level: "kernel-checkable", notes: `Lean ${kind.hClass}.${kind.hField} with explicit synthesized dictionary and outParam result.` },
        domain: "runtime",
      });
      registry.registerInfixSyntax({ operator: kind.operator, precedence: kind.precedence });
      registry.registerBinaryElaborator({
        operator: kind.operator,
        elaborateSurface(left, right, expected, context) {
          return elaborateHeterogeneous(left, right, expected, context, kind.hClass, kind.operation);
        },
        // Legacy API fallback is intentionally unreachable for this owner.
        elaborate() { throw new ProofScriptError("PS2AR03", `${kind.hClass} requires surface-controlled heterogeneous elaboration.`); },
      });
      registry.registerLeanExprLowering(kind.operation, (expr, context) => {
        if (expr.kind !== "op" || expr.args.length !== 3) throw new ProofScriptError("PS4AR02", `Malformed ${kind.hClass} operation.`);
        const [self, left, right] = expr.args;
        // Preserve the historical Nat + reconstructed spelling while the IR is
        // now class-driven. This is only an emitter spelling optimization; the
        // elaborator already selected HAdd Nat Nat Nat through instance search.
        if (kind.operation === "lean.hAdd" && left!.type.id === "Nat" && right!.type.id === "Nat" && expr.type.id === "Nat" && isCanonicalNatHAdd(self!)) {
          return `(${context.emitExpr(left!)} + ${context.emitExpr(right!)})`;
        }
        return `(@${kind.hClass}.${kind.hField} ${context.emitType(left!.type)} ${context.emitType(right!.type)} ${context.emitType(expr.type)} ${context.emitExpr(self!)} ${context.emitExpr(left!)} ${context.emitExpr(right!)})`;
      });
    }

    const leanAliases: string[] = [];
    for (const kind of homogeneousKinds) {
      for (const typeName of builtinNumericTypes) leanAliases.push(`@[instance_reducible] def __psInst${kind.className}${typeName} : ${kind.className} ${typeName} := inferInstance`);
      leanAliases.push(`@[instance_reducible] def __psInst${kind.hClass} {A : Type u} (self : ${kind.className} A) : ${kind.hClass} A A A := @inst${kind.hClass} A self`);
    }
    registry.registerLeanPrelude(leanAliases.join("\n"));

    registry.registerSemanticInfo("typescript.hArithmeticPrelude", [
      `export interface Add<A> { add: (left: A, right: A) => A; }`,
      `export interface Sub<A> { sub: (left: A, right: A) => A; }`,
      `export interface Mul<A> { mul: (left: A, right: A) => A; }`,
      `export interface HAdd<A, B, C> { hAdd: (left: A, right: B) => C; }`,
      `export interface HSub<A, B, C> { hSub: (left: A, right: B) => C; }`,
      `export interface HMul<A, B, C> { hMul: (left: A, right: B) => C; }`,
      `export const __psInstAddNat: Add<bigint> = { add: (a, b) => BigInt(a) + BigInt(b) };`,
      `export const __psInstSubNat: Sub<bigint> = { sub: (a, b) => BigInt(a) >= BigInt(b) ? BigInt(a) - BigInt(b) : 0n };`,
      `export const __psInstMulNat: Mul<bigint> = { mul: (a, b) => BigInt(a) * BigInt(b) };`,
      `export const __psInstAddInt: Add<bigint> = { add: (a, b) => BigInt(a) + BigInt(b) };`,
      `export const __psInstSubInt: Sub<bigint> = { sub: (a, b) => BigInt(a) - BigInt(b) };`,
      `export const __psInstMulInt: Mul<bigint> = { mul: (a, b) => BigInt(a) * BigInt(b) };`,
      ...([8,16,32] as const).flatMap((width) => [
        `export const __psInstAddInt${width}: Add<any> = { add: (a, b) => Number(BigInt.asIntN(${width}, BigInt(a) + BigInt(b))) };`,
        `export const __psInstSubInt${width}: Sub<any> = { sub: (a, b) => Number(BigInt.asIntN(${width}, BigInt(a) - BigInt(b))) };`,
        `export const __psInstMulInt${width}: Mul<any> = { mul: (a, b) => Number(BigInt.asIntN(${width}, BigInt(a) * BigInt(b))) };`,
        `export const __psInstAddUInt${width}: Add<any> = { add: (a, b) => Number(BigInt.asUintN(${width}, BigInt(a) + BigInt(b))) };`,
        `export const __psInstSubUInt${width}: Sub<any> = { sub: (a, b) => Number(BigInt.asUintN(${width}, BigInt(a) - BigInt(b))) };`,
        `export const __psInstMulUInt${width}: Mul<any> = { mul: (a, b) => Number(BigInt.asUintN(${width}, BigInt(a) * BigInt(b))) };`,
      ]),
      `export const __psInstAddInt64: Add<any> = { add: (a, b) => BigInt.asIntN(64, BigInt(a) + BigInt(b)) };`,
      `export const __psInstSubInt64: Sub<any> = { sub: (a, b) => BigInt.asIntN(64, BigInt(a) - BigInt(b)) };`,
      `export const __psInstMulInt64: Mul<any> = { mul: (a, b) => BigInt.asIntN(64, BigInt(a) * BigInt(b)) };`,
      `export const __psInstAddUInt64: Add<any> = { add: (a, b) => BigInt.asUintN(64, BigInt(a) + BigInt(b)) };`,
      `export const __psInstSubUInt64: Sub<any> = { sub: (a, b) => BigInt.asUintN(64, BigInt(a) - BigInt(b)) };`,
      `export const __psInstMulUInt64: Mul<any> = { mul: (a, b) => BigInt.asUintN(64, BigInt(a) * BigInt(b)) };`,
      `export function __psInstHAdd<A>(self: Add<A>): HAdd<A, A, A> { return { hAdd: self.add }; }`,
      `export function __psInstHSub<A>(self: Sub<A>): HSub<A, A, A> { return { hSub: self.sub }; }`,
      `export function __psInstHMul<A>(self: Mul<A>): HMul<A, A, A> { return { hMul: self.mul }; }`,
    ].join("\n"));
  },
};

export default plugin;

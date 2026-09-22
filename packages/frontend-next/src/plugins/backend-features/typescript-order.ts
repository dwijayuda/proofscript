import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";
import { nominalType } from "../../core/type-utils.js";

const builtinNumericTypes = ["Nat", "Int", "Int8", "Int16", "Int32", "Int64", "UInt8", "UInt16", "UInt32", "UInt64"] as const;

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-order",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.backend.typescript", "proofscript.feature.order"],
  setup(registry) {
    registry.registerTargetTypeFamilyLowering("typescript", "lean.class:LT", (type, context) => {
      const arg = type.args?.[0];
      if (!arg || arg.kind !== "type") throw new ProofScriptError("PS3ORD01", "Malformed LT type in Semantic IR.");
      return `LT<${context.emitType(arg.value)}>`;
    });
    registry.registerTargetTypeFamilyLowering("typescript", "lean.class:LE", (type, context) => {
      const arg = type.args?.[0];
      if (!arg || arg.kind !== "type") throw new ProofScriptError("PS3ORD02", "Malformed LE type in Semantic IR.");
      return `LE<${context.emitType(arg.value)}>`;
    });
    registry.registerTargetExprLowering("typescript", "lean.lt", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 3) throw new ProofScriptError("PS3ORD03", "Malformed LT relation.");
      return `${context.emitExpr(expr.args[0]!)}.lt(${context.emitExpr(expr.args[1]!)}, ${context.emitExpr(expr.args[2]!)})`;
    });
    registry.registerTargetExprLowering("typescript", "lean.le", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 3) throw new ProofScriptError("PS3ORD04", "Malformed LE relation.");
      return `${context.emitExpr(expr.args[0]!)}.le(${context.emitExpr(expr.args[1]!)}, ${context.emitExpr(expr.args[2]!)})`;
    });
    const prelude = [
      `export interface LT<A> { lt: (left: A, right: A) => boolean; }`,
      `export interface LE<A> { le: (left: A, right: A) => boolean; }`,
      ...builtinNumericTypes.flatMap((typeName) => [
        `export const __psInstLT${typeName}: LT<any> = { lt: (left, right) => left < right };`,
        `export const __psInstLE${typeName}: LE<any> = { le: (left, right) => left <= right };`,
      ]),
    ];
    registry.registerSemanticInfo("typescript.orderPrelude", prelude.join("\n"));
  },
};
export default plugin;

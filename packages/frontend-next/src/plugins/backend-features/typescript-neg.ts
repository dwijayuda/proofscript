import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-neg",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.backend.typescript", "proofscript.feature.neg"],
  setup(registry) {
    registry.addTargetCapability("typescript", "lean.neg");
    registry.registerSemanticInfo("typescript.negPrelude", [
      `export interface Neg<A> { neg: (value: A) => A; }`,
      `export const __psInstNegInt: Neg<any> = { neg: (value) => -BigInt(value) };`,
      `export const __psInstNegInt8: Neg<any> = { neg: (value) => Number(BigInt.asIntN(8, -BigInt(value))) };`,
      `export const __psInstNegInt16: Neg<any> = { neg: (value) => Number(BigInt.asIntN(16, -BigInt(value))) };`,
      `export const __psInstNegInt32: Neg<any> = { neg: (value) => Number(BigInt.asIntN(32, -BigInt(value))) };`,
      `export const __psInstNegInt64: Neg<any> = { neg: (value) => BigInt.asIntN(64, -BigInt(value)) };`,
      `export const __psInstNegUInt8: Neg<any> = { neg: (value) => Number(BigInt.asUintN(8, -BigInt(value))) };`,
      `export const __psInstNegUInt16: Neg<any> = { neg: (value) => Number(BigInt.asUintN(16, -BigInt(value))) };`,
      `export const __psInstNegUInt32: Neg<any> = { neg: (value) => Number(BigInt.asUintN(32, -BigInt(value))) };`,
      `export const __psInstNegUInt64: Neg<any> = { neg: (value) => BigInt.asUintN(64, -BigInt(value)) };`,
    ].join("\n"));
    registry.registerTargetTypeFamilyLowering("typescript", "lean.class:Neg", (type, context) => {
      const arg = type.args?.[0];
      if (!arg || arg.kind !== "type") throw new ProofScriptError("PS3NEG01", "Malformed Neg type in Semantic IR.");
      return `Neg<${context.emitType(arg.value)}>`;
    });
    registry.registerTargetExprLowering("typescript", "lean.neg", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS3NEG02", "Malformed Neg.neg IR node.");
      return `${context.emitExpr(expr.args[0]!)}.neg(${context.emitExpr(expr.args[1]!)})`;
    });
  },
};
export default plugin;

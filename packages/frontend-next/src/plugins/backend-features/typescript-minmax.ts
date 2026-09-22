import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

const builtinNumericTypes = ["Nat", "Int", "Int8", "Int16", "Int32", "Int64", "UInt8", "UInt16", "UInt32", "UInt64"] as const;

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-minmax",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.backend.typescript", "proofscript.feature.minmax"],
  setup(registry) {
    registry.registerTargetTypeFamilyLowering("typescript", "lean.class:Min", (type, context) => {
      const arg = type.args?.[0];
      if (!arg || arg.kind !== "type") throw new ProofScriptError("PS3MM01", "Malformed Min type in Semantic IR.");
      return `Min<${context.emitType(arg.value)}>`;
    });
    registry.registerTargetTypeFamilyLowering("typescript", "lean.class:Max", (type, context) => {
      const arg = type.args?.[0];
      if (!arg || arg.kind !== "type") throw new ProofScriptError("PS3MM02", "Malformed Max type in Semantic IR.");
      return `Max<${context.emitType(arg.value)}>`;
    });
    registry.registerTargetExprLowering("typescript", "lean.min", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 3) throw new ProofScriptError("PS3MM03", "Malformed min operation.");
      return `${context.emitExpr(expr.args[0]!)}.min(${context.emitExpr(expr.args[1]!)}, ${context.emitExpr(expr.args[2]!)})`;
    });
    registry.registerTargetExprLowering("typescript", "lean.max", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 3) throw new ProofScriptError("PS3MM04", "Malformed max operation.");
      return `${context.emitExpr(expr.args[0]!)}.max(${context.emitExpr(expr.args[1]!)}, ${context.emitExpr(expr.args[2]!)})`;
    });
    const prelude = [
      `export interface Min<A> { min: (left: A, right: A) => A; }`,
      `export interface Max<A> { max: (left: A, right: A) => A; }`,
      ...builtinNumericTypes.flatMap((typeName) => [
        `export const __psInstMin${typeName}: Min<any> = { min: (left, right) => left <= right ? left : right };`,
        `export const __psInstMax${typeName}: Max<any> = { max: (left, right) => left <= right ? right : left };`,
      ]),
    ];
    registry.registerSemanticInfo("typescript.minmaxPrelude", prelude.join("\n"));
  },
};
export default plugin;

import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-to-string",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.backend.typescript", "proofscript.feature.to-string", "proofscript.backend-feature.typescript-string"],
  setup(registry) {
    registry.addTargetCapability("typescript", "lean.toString");
    registry.registerSemanticInfo("typescript.toStringPrelude", [
      `export interface ToString<A> { toString: (value: A) => string; }`,
      `export const instToStringString: ToString<string> = { toString: (value) => value };`,
      `export const instToStringNat: ToString<bigint> = { toString: (value) => value.toString(10) };`,
      `export const instToStringBool: ToString<boolean> = { toString: (value) => value ? "true" : "false" };`,
      `export const instToStringUnit: ToString<undefined> = { toString: () => "()" };`,
    ].join("\n"));
    registry.registerTargetTypeFamilyLowering("typescript", "lean.class:ToString", (type, context) => {
      const arg = type.args?.[0];
      if (!arg || arg.kind !== "type") throw new ProofScriptError("PS3C01", "Malformed ToString type in Semantic IR.");
      return `ToString<${context.emitType(arg.value)}>`;
    });
    registry.registerTargetExprLowering("typescript", "lean.toString", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length < 2) throw new ProofScriptError("PS3C02", "Malformed toString IR node.");
      const self = expr.args.at(-2)!;
      const value = expr.args.at(-1)!;
      return `${context.emitExpr(self)}.toString(${context.emitExpr(value)})`;
    });
  },
};
export default plugin;

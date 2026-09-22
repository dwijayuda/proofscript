import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

function typeArg(type: import("../../core/model.js").IRType, index: number): import("../../core/model.js").IRType {
  const arg = type.args?.[index];
  if (!arg || arg.kind !== "type") throw new ProofScriptError("PS3B01", "Malformed Except type in Semantic IR.");
  return arg.value;
}

function containsVar(expr: import("../../core/model.js").IRExpr, name: string): boolean {
  switch (expr.kind) {
    case "var": return expr.name === name;
    case "literal": case "type": return false;
    case "call": case "op": case "extension": return expr.args.some((arg) => containsVar(arg, name));
    case "apply": return containsVar(expr.callee, name) || expr.args.some((arg) => containsVar(arg, name));
    case "lambda": case "quantifier": return expr.params.some((param) => param.name === name) ? false : containsVar(expr.body, name);
  }
}

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-except",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.backend.typescript", "proofscript.feature.except", "proofscript.feature.match"],
  setup(registry) {
    registry.addTargetCapability("typescript", "core.except");
    registry.addTargetCapability("typescript", "core.except.match");
    registry.registerTargetTypeFamilyLowering("typescript", "core.except", (type, context) => {
      const error = context.emitType(typeArg(type, 0));
      const value = context.emitType(typeArg(type, 1));
      return `({ tag: "error"; error: ${error} } | { tag: "ok"; value: ${value} })`;
    });
    registry.registerTargetExprLowering("typescript", "core.except.ok", (expr, context) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS3B02", "Expected Except.ok extension node.");
      return `({ tag: "ok", value: ${context.emitExpr(expr.args[0]!)} } as const)`;
    });
    registry.registerTargetExprLowering("typescript", "core.except.error", (expr, context) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS3B03", "Expected Except.error extension node.");
      return `({ tag: "error", error: ${context.emitExpr(expr.args[0]!)} } as const)`;
    });
    registry.registerTargetExprLowering("typescript", "core.except.match", (expr, context) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS3B04", "Expected Except.match extension node.");
      const payload = expr.payload as { cases: readonly { variant: string; binders: readonly string[] }[]; matchSyntax?: { readonly discriminantEqualityName?: string } };
      const [scrutinee, ...bodies] = expr.args;
      const equalityName = payload.matchSyntax?.discriminantEqualityName;
      if (equalityName && bodies.some((body) => containsVar(body, equalityName))) {
        throw new ProofScriptError("PS3B05", `Pattern equality proof '${equalityName}' is compile-time evidence and cannot be used computationally by the TypeScript target.`);
      }
      const errorIndex = payload.cases.findIndex((item) => item.variant === "error");
      const okIndex = payload.cases.findIndex((item) => item.variant === "ok");
      if (errorIndex < 0 || okIndex < 0) throw new ProofScriptError("PS3B06", "Except match requires error and ok cases.");
      const errorBinder = payload.cases[errorIndex]!.binders[0];
      const okBinder = payload.cases[okIndex]!.binders[0];
      if (!errorBinder || !okBinder) throw new ProofScriptError("PS3B07", "Except error/ok cases each require one binder.");
      return `((_psm) => _psm.tag === "error" ? ((${errorBinder}) => ${context.emitExpr(bodies[errorIndex]!) })(_psm.error) : ((${okBinder}) => ${context.emitExpr(bodies[okIndex]!) })(_psm.value))(${context.emitExpr(scrutinee!)})`;
    });
  },
};

export default plugin;

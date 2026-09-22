import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

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
  id: "proofscript.backend-feature.typescript-option",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.backend.typescript", "proofscript.feature.option", "proofscript.feature.match"],
  setup(registry) {
    registry.addTargetCapability("typescript", "core.option");
    registry.addTargetCapability("typescript", "core.option.match");
    registry.registerSemanticInfo("typescript.do.monad:core.option", { kind: "option-tagged" });
    registry.registerTargetTypeFamilyLowering("typescript", "core.option", (type, context) => {
      const inner = type.args?.[0];
      if (!inner || inner.kind !== "type") throw new ProofScriptError("PS3301", "Malformed Option IR type.");
      return `({ tag: \"Some\"; value: ${context.emitType(inner.value)} } | { tag: \"None\" })`;
    });
    registry.registerTargetExprLowering("typescript", "core.option.some", (expr, context) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS3302", "Expected Option.some extension node.");
      return `({ tag: \"Some\", value: ${context.emitExpr(expr.args[0]!)} } as const)`;
    });
    registry.registerTargetExprLowering("typescript", "core.option.none", (expr) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS3303", "Expected Option.none extension node.");
      return `({ tag: \"None\" } as const)`;
    });
    registry.registerTargetExprLowering("typescript", "core.option.match", (expr, context) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS3304", "Expected Option.match extension node.");
      const payload = expr.payload as { cases: readonly { variant: string; binders: readonly string[] }[]; matchSyntax?: { readonly discriminantEqualityName?: string } };
      const [scrutinee, ...bodies] = expr.args;
      const equalityName = payload.matchSyntax?.discriminantEqualityName;
      if (equalityName && bodies.some((body) => containsVar(body, equalityName))) {
        throw new ProofScriptError("PS3307", `Pattern equality proof '${equalityName}' is compile-time evidence and cannot be used computationally by the TypeScript target.`);
      }
      const someIndex = payload.cases.findIndex((item) => item.variant === "some");
      const noneIndex = payload.cases.findIndex((item) => item.variant === "none");
      if (someIndex < 0 || noneIndex < 0) throw new ProofScriptError("PS3305", "Option match requires Some and None cases.");
      const binder = payload.cases[someIndex]!.binders[0];
      if (!binder) throw new ProofScriptError("PS3306", "Some case requires one binder.");
      return `((_psm) => _psm.tag === \"Some\" ? ((${binder}) => ${context.emitExpr(bodies[someIndex]!) })(_psm.value) : ${context.emitExpr(bodies[noneIndex]!)})(${context.emitExpr(scrutinee!)})`;
    });
  },
};
export default plugin;

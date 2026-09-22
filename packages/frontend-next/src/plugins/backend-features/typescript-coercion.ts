import { ProofScriptError } from "../../core/errors.js";
import type { IRType } from "../../core/model.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

interface CoercionStepPayload {
  readonly className: string;
  readonly source: IRType;
  readonly target: IRType;
  readonly dependent?: boolean;
}

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-coercion",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.backend.typescript", "proofscript.backend-feature.typescript-structure-class", "proofscript.feature.typeclass"],
  setup(registry) {
    registry.addTargetCapability("typescript", "lean.coercion");
    registry.registerSemanticInfo("typescript.coercionPrelude", `export interface Coe<A, B> { coe: (value: A) => B; }\nexport interface CoeOut<A, B> { coe: (value: A) => B; }\nexport interface CoeHead<A, B> { coe: (value: A) => B; }\nexport interface CoeTail<A, B> { coe: (value: A) => B; }\nexport interface CoeDep<A, B> { coe: B; }
export interface CoeFun<A, F> { coe: (value: A) => F; }`);
    registry.registerTargetExprLowering("typescript", "lean.coercion.fun", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS3831", "Expected CoeFun coercion operation.");
      return `(${context.emitExpr(expr.args[1]!)}).coe(${context.emitExpr(expr.args[0]!)})`;
    });
    registry.registerTargetExprLowering("typescript", "lean.coercion.sort", () => {
      throw new ProofScriptError("PS3832", "TypeScript cannot preserve a runtime CoeSort value-to-type coercion; this construct is Lean/proof-side only until a static target disposition can be proven.");
    });
    registry.registerTargetExprLowering("typescript", "lean.coercion.apply", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS3830", "Expected coercion application operation.");
      const payload = expr.payload as { readonly steps: readonly CoercionStepPayload[] };
      let value = context.emitExpr(expr.args[0]!);
      for (let index = 0; index < payload.steps.length; index += 1) {
        const step = payload.steps[index]!;
        const evidence = context.emitExpr(expr.args[index + 1]!);
        value = step.dependent ? `(${evidence}).coe` : `(${evidence}).coe(${value})`;
      }
      return value;
    });
  },
};
export default plugin;

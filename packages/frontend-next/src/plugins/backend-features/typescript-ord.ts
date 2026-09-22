import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

const builtinNumericTypes = ["Nat", "Int", "Int8", "Int16", "Int32", "Int64", "UInt8", "UInt16", "UInt32", "UInt64"] as const;

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-ord",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.backend.typescript", "proofscript.feature.ord"],
  setup(registry) {
    registry.registerTargetTypeLowering("typescript", "Ordering", () => "Ordering");
    registry.registerTargetTypeFamilyLowering("typescript", "lean.class:Ord", (type, context) => {
      const arg = type.args?.[0];
      if (!arg || arg.kind !== "type") throw new ProofScriptError("PS3ORD10", "Malformed Ord type in Semantic IR.");
      return `Ord<${context.emitType(arg.value)}>`;
    });
    for (const ctor of ["lt", "eq", "gt"] as const) {
      registry.registerTargetExprLowering("typescript", `lean.ordering.${ctor}`, (expr) => {
        if (expr.kind !== "op" || expr.args.length !== 0) throw new ProofScriptError("PS3ORD11", `Malformed Ordering.${ctor} constructor.`);
        return JSON.stringify(ctor);
      });
    }
    registry.registerTargetExprLowering("typescript", "lean.ord.compare", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 3) throw new ProofScriptError("PS3ORD12", "Malformed Ord.compare operation.");
      return `${context.emitExpr(expr.args[0]!)}.compare(${context.emitExpr(expr.args[1]!)}, ${context.emitExpr(expr.args[2]!)})`;
    });
    const prelude = [
      `export type Ordering = "lt" | "eq" | "gt";`,
      `export interface Ord<A> { compare: (left: A, right: A) => Ordering; }`,
      ...builtinNumericTypes.map((typeName) =>
        `export const __psInstOrd${typeName}: Ord<any> = { compare: (left, right) => left < right ? "lt" : left > right ? "gt" : "eq" };`),
    ];
    registry.registerSemanticInfo("typescript.ordPrelude", prelude.join("\n"));
  },
};
export default plugin;

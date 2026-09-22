import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

const builtinNumericTypes = ["Nat", "Int", "Int8", "Int16", "Int32", "Int64", "UInt8", "UInt16", "UInt32", "UInt64"] as const;

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-decidable-rel",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.backend.typescript", "proofscript.feature.decidable-rel", "proofscript.backend-feature.typescript-order", "proofscript.backend-feature.typescript-minmax"],
  setup(registry) {
    registry.registerTargetTypeFamilyLowering("typescript", "lean.decidable-rel", (type, context) => {
      const relation = type.args?.[0];
      if (!relation || relation.kind !== "term" || relation.value.type.form !== "pi" || !relation.value.type.domain || relation.value.type.codomain?.form !== "pi" || !relation.value.type.codomain.domain) {
        throw new ProofScriptError("PS3DR01", "Malformed DecidableRel type in Semantic IR.");
      }
      return `DecidableRel<${context.emitType(relation.value.type.domain)}, ${context.emitType(relation.value.type.codomain.domain)}>`;
    });
    registry.registerTargetExprLowering("typescript", "lean.minOfLe", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS3DR02", "Malformed minOfLe operation.");
      return `({ min: (left, right) => ${context.emitExpr(expr.args[1]!)}(left, right) ? left : right })`;
    });
    registry.registerTargetExprLowering("typescript", "lean.maxOfLe", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS3DR03", "Malformed maxOfLe operation.");
      return `({ max: (left, right) => ${context.emitExpr(expr.args[1]!)}(left, right) ? right : left })`;
    });
    const prelude = [
      `export type DecidableRel<A, B = A> = (left: A, right: B) => boolean;`,
      ...builtinNumericTypes.map((typeName) =>
        `export const __psDecidableRelLE${typeName}: DecidableRel<any> = (left, right) => __psInstLE${typeName}.le(left, right);`,
      ),
    ];
    registry.registerSemanticInfo("typescript.decidableRelPrelude", prelude.join("\n"));
  },
};
export default plugin;

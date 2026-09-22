import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-ord-factories",
  version: "0.91.0",
  kind: "backend-feature",
  requires: [
    "proofscript.backend.typescript",
    "proofscript.feature.ord-factories",
    "proofscript.backend-feature.typescript-ord",
    "proofscript.backend-feature.typescript-order",
    "proofscript.backend-feature.typescript-ordering-ops",
    "proofscript.backend-feature.typescript-structure-class",
  ],
  setup(registry) {
    registry.registerTargetExprLowering("typescript", "lean.order.leOfOrd", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS3ORF01", "Malformed LE.ofOrd operation.");
      const ord = context.emitExpr(expr.args[1]!);
      return `({ le: (left, right) => __psOrderingIsLE(${ord}.compare(left, right)) })`;
    });
    registry.registerTargetExprLowering("typescript", "lean.order.ltOfOrd", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS3ORF02", "Malformed LT.ofOrd operation.");
      const ord = context.emitExpr(expr.args[1]!);
      return `({ lt: (left, right) => __psOrderingIsLT(${ord}.compare(left, right)) })`;
    });
    registry.registerTargetExprLowering("typescript", "lean.order.beqOfOrd", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS3ORF03", "Malformed BEq.ofOrd operation.");
      const ord = context.emitExpr(expr.args[1]!);
      return `({ beq: (left, right) => __psOrderingIsEq(${ord}.compare(left, right)) })`;
    });
  },
};
export default plugin;

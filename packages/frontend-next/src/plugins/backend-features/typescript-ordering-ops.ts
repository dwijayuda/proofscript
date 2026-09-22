import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

const observers = ["isEq", "isNe", "isLE", "isLT", "isGT", "isGE"] as const;

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-ordering-ops",
  version: "0.91.0",
  kind: "backend-feature",
  requires: [
    "proofscript.backend.typescript",
    "proofscript.feature.ordering-ops",
    "proofscript.backend-feature.typescript-ord",
    "proofscript.backend-feature.typescript-bool-beq",
  ],
  setup(registry) {
    registry.registerSemanticInfo("typescript.orderingOpsPrelude", [
      `export function __psOrderingSwap(value: Ordering): Ordering { return value === "lt" ? "gt" : value === "gt" ? "lt" : "eq"; }`,
      `export function __psOrderingThen(first: Ordering, second: () => Ordering): Ordering { return first === "eq" ? second() : first; }`,
      `export function __psOrderingIsEq(value: Ordering): boolean { return value === "eq"; }`,
      `export function __psOrderingIsNe(value: Ordering): boolean { return value !== "eq"; }`,
      `export function __psOrderingIsLE(value: Ordering): boolean { return value !== "gt"; }`,
      `export function __psOrderingIsLT(value: Ordering): boolean { return value === "lt"; }`,
      `export function __psOrderingIsGT(value: Ordering): boolean { return value === "gt"; }`,
      `export function __psOrderingIsGE(value: Ordering): boolean { return value !== "lt"; }`,
    ].join("\n"));

    registry.registerTargetExprLowering("typescript", "lean.ordering.swap", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3ORD20", "Malformed Ordering.swap operation.");
      return `__psOrderingSwap(${context.emitExpr(expr.args[0]!)})`;
    });
    registry.registerTargetExprLowering("typescript", "lean.ordering.then", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS3ORD21", "Malformed Ordering.then operation.");
      return `__psOrderingThen(${context.emitExpr(expr.args[0]!)}, () => ${context.emitExpr(expr.args[1]!)})`;
    });
    for (const name of observers) {
      const helper = `__psOrdering${name[0]!.toUpperCase()}${name.slice(1)}`;
      registry.registerTargetExprLowering("typescript", `lean.ordering.${name}`, (expr, context) => {
        if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3ORD22", `Malformed Ordering.${name} operation.`);
        return `${helper}(${context.emitExpr(expr.args[0]!)})`;
      });
    }
  },
};

export default plugin;

import { ProofScriptError } from "../../core/errors.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { nominalType } from "../../core/type-utils.js";

const observers = ["isEq", "isNe", "isLE", "isLT", "isGT", "isGE"] as const;

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.ordering-ops",
  version: "0.91.0",
  kind: "feature",
  semanticIds: [
    "lean.ordering.swap", "lean.ordering.then",
    ...observers.map((name) => `lean.ordering.${name}`),
  ],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.ord", "proofscript.feature.bool"],
  setup(registry) {
    const ordering = nominalType("Ordering", "Ordering");
    const bool = nominalType("Bool", "Bool");

    registry.registerBuiltinFunction("Ordering.swap", {
      params: [{ name: "value", type: ordering, binderInfo: "explicit" }],
      result: ordering,
      operation: "lean.ordering.swap",
    });
    registry.registerOperation("lean.ordering.swap", {
      verification: { level: "kernel-checkable", notes: "Exact Lean Ordering.swap on the three Ordering constructors." },
      domain: "runtime",
    });
    registry.registerLeanExprLowering("lean.ordering.swap", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4ORD20", "Malformed Ordering.swap operation.");
      return `(Ordering.swap ${context.emitExpr(expr.args[0]!)})`;
    });

    registry.registerBuiltinFunction("Ordering.then", {
      params: [
        { name: "first", type: ordering, binderInfo: "explicit" },
        { name: "second", type: ordering, binderInfo: "explicit" },
      ],
      result: ordering,
      operation: "lean.ordering.then",
    });
    registry.registerOperation("lean.ordering.then", {
      verification: { level: "kernel-checkable", notes: "Exact Lean Ordering.then lexicographic composition." },
      domain: "runtime",
    });
    registry.registerLeanExprLowering("lean.ordering.then", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS4ORD21", "Malformed Ordering.then operation.");
      return `(Ordering.then ${context.emitExpr(expr.args[0]!)} ${context.emitExpr(expr.args[1]!)})`;
    });

    for (const name of observers) {
      const operation = `lean.ordering.${name}`;
      registry.registerBuiltinFunction(`Ordering.${name}`, {
        params: [{ name: "value", type: ordering, binderInfo: "explicit" }],
        result: bool,
        operation,
      });
      registry.registerOperation(operation, {
        verification: { level: "kernel-checkable", notes: `Exact Lean Ordering.${name} Boolean observer.` },
        domain: "runtime",
      });
      registry.registerLeanExprLowering(operation, (expr, context) => {
        if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4ORD22", `Malformed Ordering.${name} operation.`);
        return `(Ordering.${name} ${context.emitExpr(expr.args[0]!)})`;
      });
    }
  },
};

export default plugin;

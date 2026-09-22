import { ProofScriptError } from "../../core/errors.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import type { IRType } from "../../core/model.js";
import { expectTypeArgument, nominalType, typeArgument } from "../../core/type-utils.js";

function arrayOf(inner: IRType): IRType {
  return nominalType(
    `core.array(${inner.id})`,
    `Array(${inner.displayName})`,
    "core.array",
    [typeArgument(inner)],
  );
}

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.array",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["core.array", "lean.membership"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  setup(registry) {
    registry.registerTypeFamily("Array", {
      params: [{ kind: "type" }],
      resolve(args) {
        if (args.length !== 1) throw new ProofScriptError("PS29B0", `Array expects one type argument, got ${args.length}.`);
        return arrayOf(expectTypeArgument(args[0]!, "Array"));
      },
    });

    // Array has a Lean ForIn' instance, from which ordinary ForIn is derived.
    // The descriptor lets the do elaborator recover the element type without
    // pretending every host iterable is a Lean ForIn collection.
    registry.registerSemanticInfo("proofscript.do.forin:core.array", {
      family: "core.array",
      sourceName: "Array",
      typeArgumentIndex: 0,
      membershipProof: true,
      typescriptRuntime: "readonly-array",
    });

    registry.registerOperation("lean.membership", {
      verification: { level: "kernel-checkable", notes: "Membership proposition used by Lean ForIn' proof-bearing iteration." },
      domain: "proof",
    });

    registry.registerLeanTypeFamilyLowering("core.array", (type, context) => {
      const arg = type.args?.[0];
      if (!arg || arg.kind !== "type") throw new ProofScriptError("PS49B0", "Malformed Array type in Semantic IR.");
      return `(Array ${context.emitType(arg.value)})`;
    });
    registry.registerTargetTypeFamilyLowering("typescript", "core.array", (type, context) => {
      const arg = type.args?.[0];
      if (!arg || arg.kind !== "type") throw new ProofScriptError("PS39B0", "Malformed Array type for TypeScript lowering.");
      return `ReadonlyArray<${context.emitType(arg.value)}>`;
    });
    registry.registerLeanExprLowering("lean.membership", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS49B1", "Malformed membership proposition IR node.");
      return `(${context.emitExpr(expr.args[0]!)} ∈ ${context.emitExpr(expr.args[1]!)})`;
    });
  },
};

export default plugin;

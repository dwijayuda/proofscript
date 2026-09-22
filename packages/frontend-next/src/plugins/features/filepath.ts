import { ProofScriptError } from "../../core/errors.js";
import type { IRParam, IRType } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { nominalType } from "../../core/type-utils.js";

function valueParam(name: string, type: IRType): IRParam { return { name, type, binderInfo: "explicit" }; }

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.filepath",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.filepath.mk", "lean.filepath.toString"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.string"],
  setup(registry) {
    registry.registerType("System.FilePath", "System.FilePath");
    const filePath = nominalType("System.FilePath", "System.FilePath");
    const stringType = nominalType("String", "String");

    registry.registerOperation("lean.filepath.mk", {
      requiredCapabilities: ["core.filepath"],
      verification: { level: "kernel-checkable", notes: "Lean System.FilePath.mk structure constructor." },
    });
    registry.registerOperation("lean.filepath.toString", {
      requiredCapabilities: ["core.filepath"],
      verification: { level: "kernel-checkable", notes: "Lean System.FilePath.toString structure projection." },
    });

    registry.registerBuiltinFunction("System.FilePath.mk", {
      params: [valueParam("toString", stringType)],
      result: filePath,
      operation: "lean.filepath.mk",
    });
    registry.registerBuiltinFunction("System.FilePath.toString", {
      params: [valueParam("self", filePath)],
      result: stringType,
      operation: "lean.filepath.toString",
    });

    registry.registerLeanTypeLowering("System.FilePath", () => "System.FilePath");
    registry.registerLeanExprLowering("lean.filepath.mk", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4F01", "Malformed System.FilePath.mk IR node.");
      return `(System.FilePath.mk ${context.emitExpr(expr.args[0]!)})`;
    });
    registry.registerLeanExprLowering("lean.filepath.toString", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4F02", "Malformed System.FilePath.toString IR node.");
      return `(System.FilePath.toString ${context.emitExpr(expr.args[0]!)})`;
    });
  },
};
export default plugin;

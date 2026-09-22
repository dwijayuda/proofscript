import { ProofScriptError } from "../../core/errors.js";
import type { IRParam, IRType } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { nominalType, typeArgument } from "../../core/type-utils.js";

function valueParam(name: string, type: IRType): IRParam { return { name, type, binderInfo: "explicit" }; }
function baseIOOf(inner: IRType): IRType { return nominalType(`lean.baseio(${inner.id})`, `BaseIO(${inner.displayName})`, "lean.baseio", [typeArgument(inner)]); }

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.filepath-predicates",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.filepath.isDir", "lean.filepath.pathExists"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.io", "proofscript.feature.filepath", "proofscript.feature.bool"],
  setup(registry) {
    const filePath = nominalType("System.FilePath", "System.FilePath");
    const bool = nominalType("Bool", "Bool");
    registry.registerBuiltinFunction("System.FilePath.isDir", {
      params: [valueParam("path", filePath)],
      result: baseIOOf(bool),
      operation: "lean.filepath.isDir",
    });
    registry.registerBuiltinFunction("System.FilePath.pathExists", {
      params: [valueParam("path", filePath)],
      result: baseIOOf(bool),
      operation: "lean.filepath.pathExists",
    });
    registry.registerOperation("lean.filepath.isDir", {
      requiredCapabilities: ["core.filepath.isDir"],
      verification: { level: "kernel-checkable", notes: "Lean System.FilePath.isDir; follows symlinks and collapses metadata failures to false." },
      domain: "runtime",
    });
    registry.registerOperation("lean.filepath.pathExists", {
      requiredCapabilities: ["core.filepath.pathExists"],
      verification: { level: "kernel-checkable", notes: "Lean System.FilePath.pathExists; follows symlinks and collapses metadata failures to false." },
      domain: "runtime",
    });
    registry.registerLeanExprLowering("lean.filepath.isDir", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4F74", "Malformed System.FilePath.isDir IR node.");
      return `(System.FilePath.isDir ${context.emitExpr(expr.args[0]!)})`;
    });
    registry.registerLeanExprLowering("lean.filepath.pathExists", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4F75", "Malformed System.FilePath.pathExists IR node.");
      return `(System.FilePath.pathExists ${context.emitExpr(expr.args[0]!)})`;
    });
  },
};
export default plugin;

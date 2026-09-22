import { ProofScriptError } from "../../core/errors.js";
import type { IRParam, IRType } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { nominalType, typeArgument } from "../../core/type-utils.js";

function valueParam(name: string, type: IRType): IRParam { return { name, type, binderInfo: "explicit" }; }
function ioOf(inner: IRType): IRType {
  return nominalType(`lean.io(${inner.id})`, `IO(${inner.displayName})`, "lean.io", [typeArgument(inner)]);
}

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.io-fs-create-dir",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.io.fs.createDir"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.io", "proofscript.feature.filepath", "proofscript.feature.unit"],
  setup(registry) {
    const filePath = nominalType("System.FilePath", "System.FilePath");
    const unit = nominalType("Unit", "Unit");
    registry.registerBuiltinFunction("IO.FS.createDir", {
      params: [valueParam("dirname", filePath)],
      result: ioOf(unit),
      operation: "lean.io.fs.createDir",
    });
    registry.registerOperation("lean.io.fs.createDir", {
      requiredCapabilities: ["core.io.fs.createDir"],
      verification: { level: "kernel-checkable", notes: "Lean IO.FS.createDir action; host correspondence is backend/platform/primitive specific." },
      domain: "runtime",
    });
    registry.registerLeanExprLowering("lean.io.fs.createDir", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4F30", "Malformed IO.FS.createDir IR node.");
      return `(IO.FS.createDir ${context.emitExpr(expr.args[0]!)})`;
    });
  },
};
export default plugin;

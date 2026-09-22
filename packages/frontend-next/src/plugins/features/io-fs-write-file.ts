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
  id: "proofscript.feature.io-fs-write-file",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.io.fs.writeFile"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.io", "proofscript.feature.filepath", "proofscript.feature.string", "proofscript.feature.unit"],
  setup(registry) {
    const filePath = nominalType("System.FilePath", "System.FilePath");
    const stringType = nominalType("String", "String");
    const unit = nominalType("Unit", "Unit");
    registry.registerBuiltinFunction("IO.FS.writeFile", {
      params: [valueParam("fname", filePath), valueParam("content", stringType)],
      result: ioOf(unit),
      operation: "lean.io.fs.writeFile",
    });
    registry.registerOperation("lean.io.fs.writeFile", {
      requiredCapabilities: ["core.io.fs.writeFile"],
      verification: { level: "kernel-checkable", notes: "Lean IO.FS.writeFile action; host correspondence is backend/platform specific." },
      domain: "runtime",
    });
    registry.registerLeanExprLowering("lean.io.fs.writeFile", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS4F10", "Malformed IO.FS.writeFile IR node.");
      return `(IO.FS.writeFile ${context.emitExpr(expr.args[0]!)} ${context.emitExpr(expr.args[1]!)})`;
    });
  },
};
export default plugin;

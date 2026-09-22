import { ProofScriptError } from "../../core/errors.js";
import type { IRParam, IRType } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { nominalType, typeArgument } from "../../core/type-utils.js";

function valueParam(name: string, type: IRType): IRParam { return { name, type, binderInfo: "explicit" }; }
function ioOf(inner: IRType): IRType { return nominalType(`lean.io(${inner.id})`, `IO(${inner.displayName})`, "lean.io", [typeArgument(inner)]); }
function arrayOf(inner: IRType): IRType { return nominalType(`core.array(${inner.id})`, `Array(${inner.displayName})`, "core.array", [typeArgument(inner)]); }

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.io-fs-read-dir",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.io.fs.dirEntry.mk", "lean.io.fs.dirEntry.root", "lean.io.fs.dirEntry.fileName", "lean.io.fs.readDir"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.io", "proofscript.feature.filepath", "proofscript.feature.string", "proofscript.feature.array"],
  setup(registry) {
    registry.registerType("IO.FS.DirEntry", "IO.FS.DirEntry");
    const dirEntry = nominalType("IO.FS.DirEntry", "IO.FS.DirEntry");
    const filePath = nominalType("System.FilePath", "System.FilePath");
    const stringType = nominalType("String", "String");

    for (const [op, notes] of [
      ["lean.io.fs.dirEntry.mk", "Lean IO.FS.DirEntry.mk structure constructor."],
      ["lean.io.fs.dirEntry.root", "Lean IO.FS.DirEntry.root projection."],
      ["lean.io.fs.dirEntry.fileName", "Lean IO.FS.DirEntry.fileName projection."],
    ] as const) registry.registerOperation(op, {
      requiredCapabilities: ["core.io.fs.dirEntry.structural"],
      verification: { level: "kernel-checkable", notes },
    });

    registry.registerBuiltinFunction("IO.FS.DirEntry.mk", {
      params: [valueParam("root", filePath), valueParam("fileName", stringType)], result: dirEntry, operation: "lean.io.fs.dirEntry.mk",
    });
    registry.registerBuiltinFunction("IO.FS.DirEntry.root", {
      params: [valueParam("self", dirEntry)], result: filePath, operation: "lean.io.fs.dirEntry.root",
    });
    registry.registerBuiltinFunction("IO.FS.DirEntry.fileName", {
      params: [valueParam("self", dirEntry)], result: stringType, operation: "lean.io.fs.dirEntry.fileName",
    });
    registry.registerBuiltinFunction("System.FilePath.readDir", {
      params: [valueParam("self", filePath)], result: ioOf(arrayOf(dirEntry)), operation: "lean.io.fs.readDir",
    });
    registry.registerOperation("lean.io.fs.readDir", {
      requiredCapabilities: ["core.io.fs.readDir"],
      verification: { level: "kernel-checkable", notes: "Lean System.FilePath.readDir; host correspondence is primitive/platform specific." },
      domain: "runtime",
    });

    registry.registerLeanTypeLowering("IO.FS.DirEntry", () => "IO.FS.DirEntry");
    registry.registerLeanExprLowering("lean.io.fs.dirEntry.mk", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS4R01", "Malformed IO.FS.DirEntry.mk IR node.");
      return `(IO.FS.DirEntry.mk ${context.emitExpr(expr.args[0]!)} ${context.emitExpr(expr.args[1]!)})`;
    });
    registry.registerLeanExprLowering("lean.io.fs.dirEntry.root", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4R02", "Malformed IO.FS.DirEntry.root IR node.");
      return `(IO.FS.DirEntry.root ${context.emitExpr(expr.args[0]!)})`;
    });
    registry.registerLeanExprLowering("lean.io.fs.dirEntry.fileName", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4R03", "Malformed IO.FS.DirEntry.fileName IR node.");
      return `(IO.FS.DirEntry.fileName ${context.emitExpr(expr.args[0]!)})`;
    });
    registry.registerLeanExprLowering("lean.io.fs.readDir", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4R04", "Malformed System.FilePath.readDir IR node.");
      return `(System.FilePath.readDir ${context.emitExpr(expr.args[0]!)})`;
    });
  },
};
export default plugin;

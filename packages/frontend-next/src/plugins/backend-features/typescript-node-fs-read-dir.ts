import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-node-fs-read-dir",
  version: "0.91.0",
  kind: "backend-feature",
  requires: [
    "proofscript.backend.typescript", "proofscript.feature.io-fs-read-dir",
    "proofscript.backend-feature.typescript-io-fs-dir-entry", "proofscript.backend-feature.typescript-filepath",
    "proofscript.backend-feature.typescript-io", "proofscript.backend-feature.typescript-io-error-structured",
    "proofscript.backend-feature.typescript-option", "proofscript.backend-feature.typescript-uint32",
  ],
  setup(registry) {
    registry.addTargetCapability("typescript", "core.io.fs.readDir");
    registry.registerSemanticInfo("typescript.nodeFsReadDirPrelude", `
const __psOpaqueHostIOErrorReadDir = (error: unknown) => ({ __proofscriptIOErrorBrand: "IO.Error", __proofscriptHostError: error } as { readonly __proofscriptIOErrorBrand: "IO.Error" });
const __psNodeReadDirError = (error: any, root: SystemFilePath) => {
  const path = root.toString;
  const platform = (globalThis as any).process?.platform;
  const arch = (globalThis as any).process?.arch;
  if (platform !== "linux" || arch !== "x64") return __psOpaqueHostIOErrorReadDir(error);
  switch (error?.code) {
    case "ENOENT": return ({ __proofscriptIOErrorBrand: "IO.Error", tag: "noFileOrDirectory", filename: path, osCode: __psUInt32(2n), details: "No such file or directory" } as { readonly __proofscriptIOErrorBrand: "IO.Error" });
    case "ENOTDIR": return ({ __proofscriptIOErrorBrand: "IO.Error", tag: "inappropriateType", filename: ({ tag: "Some", value: path } as const), osCode: __psUInt32(20n), details: "Not a directory" } as { readonly __proofscriptIOErrorBrand: "IO.Error" });
    default: return __psOpaqueHostIOErrorReadDir(error);
  }
};
`.trim());
    registry.registerTargetExprLowering("typescript", "lean.io.fs.readDir", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3R10", "Malformed System.FilePath.readDir IR node.");
      const root = context.emitExpr(expr.args[0]!);
      return `(() => { const __ps_root=${root}; let __ps_dir:any=undefined; try { const __ps_fs=(globalThis as any).process?.getBuiltinModule?.("node:fs"); if(!__ps_fs||typeof __ps_fs.opendirSync!=="function") return ({tag:"Error",error:__psOpaqueHostIOErrorReadDir(new Error("Node fs host unavailable"))} as const); __ps_dir=__ps_fs.opendirSync(__ps_root.toString,{encoding:"utf8"}); const __ps_entries:IOFSDirEntry[]=[]; for(;;){ const __ps_entry=__ps_dir.readSync(); if(__ps_entry===null) break; __ps_entries.push(__psDirEntry(__ps_root,String(__ps_entry.name))); } __ps_dir.closeSync(); __ps_dir=undefined; return ({tag:"Ok",value:__ps_entries as ReadonlyArray<IOFSDirEntry>} as const); } catch(__ps_error){ if(__ps_dir!==undefined){ try{__ps_dir.closeSync();}catch{} } return ({tag:"Error",error:__psNodeReadDirError(__ps_error,__ps_root)} as const); } })`;
    });
  },
};
export default plugin;

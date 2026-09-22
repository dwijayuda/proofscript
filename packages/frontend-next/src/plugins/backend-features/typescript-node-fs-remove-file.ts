import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";
const plugin: ProofScriptPlugin = { id:"proofscript.backend-feature.typescript-node-fs-remove-file", version: "0.91.0", kind:"backend-feature", requires:["proofscript.backend.typescript","proofscript.feature.io-fs-remove-file","proofscript.backend-feature.typescript-filepath","proofscript.backend-feature.typescript-io","proofscript.backend-feature.typescript-io-error-structured","proofscript.backend-feature.typescript-uint32","proofscript.backend-feature.typescript-option"], setup(registry){ registry.addTargetCapability("typescript","core.io.fs.removeFile"); registry.registerSemanticInfo("typescript.nodeFsRemoveFilePrelude",`
const __psOpaqueHostIOErrorRemoveFile = (error: unknown) => ({ __proofscriptIOErrorBrand: "IO.Error", __proofscriptHostError: error } as { readonly __proofscriptIOErrorBrand: "IO.Error" });
const __psNodeRemoveFileError = (error: any, filename: SystemFilePath) => {
  const path = filename.toString;
  const platform = (globalThis as any).process?.platform;
  const arch = (globalThis as any).process?.arch;
  if (platform !== "linux" || arch !== "x64") return __psOpaqueHostIOErrorRemoveFile(error);
  switch (error?.code) {
    case "ENOENT": return ({ __proofscriptIOErrorBrand: "IO.Error", tag: "noFileOrDirectory", filename: path, osCode: __psUInt32(4294967294n), details: "no such file or directory" } as { readonly __proofscriptIOErrorBrand: "IO.Error" });
    case "EISDIR": return ({ __proofscriptIOErrorBrand: "IO.Error", tag: "inappropriateType", filename: ({ tag: "Some", value: path } as const), osCode: __psUInt32(4294967275n), details: "illegal operation on a directory" } as { readonly __proofscriptIOErrorBrand: "IO.Error" });
    case "ENOTDIR": return ({ __proofscriptIOErrorBrand: "IO.Error", tag: "inappropriateType", filename: ({ tag: "Some", value: path } as const), osCode: __psUInt32(4294967276n), details: "not a directory" } as { readonly __proofscriptIOErrorBrand: "IO.Error" });
    default: return __psOpaqueHostIOErrorRemoveFile(error);
  }
};`.trim()); registry.registerTargetExprLowering("typescript","lean.io.fs.removeFile",(expr,context)=>{if(expr.kind!=="op"||expr.args.length!==1)throw new ProofScriptError("PS3F40","Malformed IO.FS.removeFile IR node."); const filename=context.emitExpr(expr.args[0]!); return `(() => { const __ps_path = ${filename}; try { const __ps_fs = (globalThis as any).process?.getBuiltinModule?.("node:fs"); if (!__ps_fs || typeof __ps_fs.unlinkSync !== "function") return ({ tag: "Error", error: __psOpaqueHostIOErrorRemoveFile(new Error("Node fs host unavailable")) } as const); __ps_fs.unlinkSync(__ps_path.toString); return ({ tag: "Ok", value: undefined } as const); } catch (__ps_error) { return ({ tag: "Error", error: __psNodeRemoveFileError(__ps_error, __ps_path) } as const); } })`;}); } };
export default plugin;

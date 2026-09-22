import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";
const plugin: ProofScriptPlugin = { id:"proofscript.backend-feature.typescript-node-fs-remove-dir", version: "0.91.0", kind:"backend-feature", requires:["proofscript.backend.typescript","proofscript.feature.io-fs-remove-dir","proofscript.backend-feature.typescript-filepath","proofscript.backend-feature.typescript-io","proofscript.backend-feature.typescript-io-error-structured","proofscript.backend-feature.typescript-uint32","proofscript.backend-feature.typescript-option"], setup(registry){ registry.addTargetCapability("typescript","core.io.fs.removeDir"); registry.registerSemanticInfo("typescript.nodeFsRemoveDirPrelude",`
const __psOpaqueHostIOErrorRemoveDir = (error: unknown) => ({ __proofscriptIOErrorBrand: "IO.Error", __proofscriptHostError: error } as { readonly __proofscriptIOErrorBrand: "IO.Error" });
const __psNodeRemoveDirError = (error: any, dirname: SystemFilePath) => {
  const path = dirname.toString;
  const platform = (globalThis as any).process?.platform;
  const arch = (globalThis as any).process?.arch;
  if (platform !== "linux" || arch !== "x64") return __psOpaqueHostIOErrorRemoveDir(error);
  switch (error?.code) {
    case "ENOENT": return ({ __proofscriptIOErrorBrand: "IO.Error", tag: "noFileOrDirectory", filename: path, osCode: __psUInt32(2n), details: "No such file or directory" } as { readonly __proofscriptIOErrorBrand: "IO.Error" });
    case "ENOTEMPTY": return ({ __proofscriptIOErrorBrand: "IO.Error", tag: "unsatisfiedConstraints", osCode: __psUInt32(39n), details: "Directory not empty" } as { readonly __proofscriptIOErrorBrand: "IO.Error" });
    case "ENOTDIR": return ({ __proofscriptIOErrorBrand: "IO.Error", tag: "inappropriateType", filename: ({ tag: "Some", value: path } as const), osCode: __psUInt32(20n), details: "Not a directory" } as { readonly __proofscriptIOErrorBrand: "IO.Error" });
    default: return __psOpaqueHostIOErrorRemoveDir(error);
  }
};`.trim()); registry.registerTargetExprLowering("typescript","lean.io.fs.removeDir",(expr,context)=>{if(expr.kind!=="op"||expr.args.length!==1)throw new ProofScriptError("PS3F50","Malformed IO.FS.removeDir IR node."); const dirname=context.emitExpr(expr.args[0]!); return `(() => { const __ps_path = ${dirname}; try { const __ps_fs = (globalThis as any).process?.getBuiltinModule?.("node:fs"); if (!__ps_fs || typeof __ps_fs.rmdirSync !== "function") return ({ tag: "Error", error: __psOpaqueHostIOErrorRemoveDir(new Error("Node fs host unavailable")) } as const); __ps_fs.rmdirSync(__ps_path.toString); return ({ tag: "Ok", value: undefined } as const); } catch (__ps_error) { return ({ tag: "Error", error: __psNodeRemoveDirError(__ps_error, __ps_path) } as const); } })`;}); } };
export default plugin;

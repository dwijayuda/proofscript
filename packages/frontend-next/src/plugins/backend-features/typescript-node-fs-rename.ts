import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";
const plugin: ProofScriptPlugin={id:"proofscript.backend-feature.typescript-node-fs-rename",version: "0.91.0",kind:"backend-feature",requires:["proofscript.backend.typescript","proofscript.feature.io-fs-rename","proofscript.backend-feature.typescript-filepath","proofscript.backend-feature.typescript-io","proofscript.backend-feature.typescript-io-error-structured","proofscript.backend-feature.typescript-uint32","proofscript.backend-feature.typescript-option"],setup(registry){registry.addTargetCapability("typescript","core.io.fs.rename");registry.registerSemanticInfo("typescript.nodeFsRenamePrelude",`
const __psOpaqueHostIOErrorRename = (error: unknown) => ({ __proofscriptIOErrorBrand: "IO.Error", __proofscriptHostError: error } as { readonly __proofscriptIOErrorBrand: "IO.Error" });
const __psNodeRenameError = (error: any, oldPath: SystemFilePath, newPath: SystemFilePath) => {
 const oldAndNew = oldPath.toString + " and/or " + newPath.toString;
 const platform=(globalThis as any).process?.platform, arch=(globalThis as any).process?.arch;
 if(platform!=="linux"||arch!=="x64") return __psOpaqueHostIOErrorRename(error);
 switch(error?.code){
  case "ENOENT": return ({__proofscriptIOErrorBrand:"IO.Error",tag:"noFileOrDirectory",filename:oldAndNew,osCode:__psUInt32(2n),details:"No such file or directory"} as {readonly __proofscriptIOErrorBrand:"IO.Error"});
  case "ENOTDIR": return ({__proofscriptIOErrorBrand:"IO.Error",tag:"inappropriateType",filename:({tag:"Some",value:oldAndNew} as const),osCode:__psUInt32(20n),details:"Not a directory"} as {readonly __proofscriptIOErrorBrand:"IO.Error"});
  default:return __psOpaqueHostIOErrorRename(error);
 }
};`.trim());registry.registerTargetExprLowering("typescript","lean.io.fs.rename",(expr,context)=>{if(expr.kind!=="op"||expr.args.length!==2)throw new ProofScriptError("PS3F60","Malformed IO.FS.rename IR node.");const a=context.emitExpr(expr.args[0]!),b=context.emitExpr(expr.args[1]!);return `(() => { const __ps_old=${a}; const __ps_new=${b}; try { const __ps_fs=(globalThis as any).process?.getBuiltinModule?.("node:fs"); if(!__ps_fs||typeof __ps_fs.renameSync!=="function") return ({tag:"Error",error:__psOpaqueHostIOErrorRename(new Error("Node fs host unavailable"))} as const); __ps_fs.renameSync(__ps_old.toString,__ps_new.toString); return ({tag:"Ok",value:undefined} as const); } catch(__ps_error){ return ({tag:"Error",error:__psNodeRenameError(__ps_error,__ps_old,__ps_new)} as const); } })`;});}};
export default plugin;

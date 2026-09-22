import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";
const plugin:ProofScriptPlugin={id:"proofscript.backend-feature.typescript-node-fs-hard-link",version: "0.91.0",kind:"backend-feature",requires:["proofscript.backend.typescript","proofscript.feature.io-fs-hard-link","proofscript.backend-feature.typescript-filepath","proofscript.backend-feature.typescript-io","proofscript.backend-feature.typescript-io-error-structured","proofscript.backend-feature.typescript-uint32","proofscript.backend-feature.typescript-option"],setup(registry){registry.addTargetCapability("typescript","core.io.fs.hardLink");registry.registerSemanticInfo("typescript.nodeFsHardLinkPrelude",`
const __psOpaqueHostIOErrorHardLink = (error: unknown) => ({ __proofscriptIOErrorBrand: "IO.Error", __proofscriptHostError: error } as { readonly __proofscriptIOErrorBrand: "IO.Error" });
const __psNodeHardLinkError = (error: any, orig: SystemFilePath) => {
 const platform=(globalThis as any).process?.platform, arch=(globalThis as any).process?.arch;
 if(platform!=="linux"||arch!=="x64") return __psOpaqueHostIOErrorHardLink(error);
 switch(error?.code){
  case "EEXIST": return ({__proofscriptIOErrorBrand:"IO.Error",tag:"alreadyExists",filename:({tag:"Some",value:orig.toString} as const),osCode:__psUInt32(4294967279n),details:"file already exists"} as {readonly __proofscriptIOErrorBrand:"IO.Error"});
  case "ENOENT": return ({__proofscriptIOErrorBrand:"IO.Error",tag:"noFileOrDirectory",filename:orig.toString,osCode:__psUInt32(4294967294n),details:"no such file or directory"} as {readonly __proofscriptIOErrorBrand:"IO.Error"});
  case "ENOTDIR": return ({__proofscriptIOErrorBrand:"IO.Error",tag:"inappropriateType",filename:({tag:"Some",value:orig.toString} as const),osCode:__psUInt32(4294967276n),details:"not a directory"} as {readonly __proofscriptIOErrorBrand:"IO.Error"});
  default:return __psOpaqueHostIOErrorHardLink(error);
 }
};`.trim());registry.registerTargetExprLowering("typescript","lean.io.fs.hardLink",(expr,context)=>{if(expr.kind!=="op"||expr.args.length!==2)throw new ProofScriptError("PS3F72","Malformed IO.FS.hardLink IR node.");const a=context.emitExpr(expr.args[0]!),b=context.emitExpr(expr.args[1]!);return `(() => { const __ps_orig=${a}; const __ps_link=${b}; try { const __ps_fs=(globalThis as any).process?.getBuiltinModule?.("node:fs"); if(!__ps_fs||typeof __ps_fs.linkSync!=="function") return ({tag:"Error",error:__psOpaqueHostIOErrorHardLink(new Error("Node fs host unavailable"))} as const); __ps_fs.linkSync(__ps_orig.toString,__ps_link.toString); return ({tag:"Ok",value:undefined} as const); } catch(__ps_error){ return ({tag:"Error",error:__psNodeHardLinkError(__ps_error,__ps_orig)} as const); } })`;});}};
export default plugin;

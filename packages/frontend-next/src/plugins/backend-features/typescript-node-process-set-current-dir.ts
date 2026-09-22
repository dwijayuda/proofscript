import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";
const plugin:ProofScriptPlugin={id:"proofscript.backend-feature.typescript-node-process-set-current-dir",version: "0.91.0",kind:"backend-feature",requires:["proofscript.backend.typescript","proofscript.feature.io-process-set-current-dir","proofscript.backend-feature.typescript-filepath","proofscript.backend-feature.typescript-io","proofscript.backend-feature.typescript-io-error-structured","proofscript.backend-feature.typescript-uint32","proofscript.backend-feature.typescript-option"],setup(registry){registry.addTargetCapability("typescript","core.io.process.setCurrentDir");registry.registerSemanticInfo("typescript.nodeProcessSetCurrentDirPrelude",`
const __psOpaqueHostIOErrorSetCurrentDir = (error: unknown) => ({ __proofscriptIOErrorBrand: "IO.Error", __proofscriptHostError: error } as { readonly __proofscriptIOErrorBrand: "IO.Error" });
const __psNodeSetCurrentDirError = (error: any, requested: SystemFilePath) => {
 const platform=(globalThis as any).process?.platform, arch=(globalThis as any).process?.arch;
 if(platform!=="linux"||arch!=="x64") return __psOpaqueHostIOErrorSetCurrentDir(error);
 switch(error?.code){
  case "ENOENT": return ({__proofscriptIOErrorBrand:"IO.Error",tag:"noFileOrDirectory",filename:requested.toString,osCode:__psUInt32(2n),details:"No such file or directory"} as {readonly __proofscriptIOErrorBrand:"IO.Error"});
  case "ENOTDIR": return ({__proofscriptIOErrorBrand:"IO.Error",tag:"inappropriateType",filename:({tag:"Some",value:requested.toString} as const),osCode:__psUInt32(20n),details:"Not a directory"} as {readonly __proofscriptIOErrorBrand:"IO.Error"});
  default:return __psOpaqueHostIOErrorSetCurrentDir(error);
 }
};`.trim());registry.registerTargetExprLowering("typescript","lean.io.process.setCurrentDir",(expr,context)=>{if(expr.kind!=="op"||expr.args.length!==1)throw new ProofScriptError("PS3F73","Malformed IO.Process.setCurrentDir IR node.");const p=context.emitExpr(expr.args[0]!);return `(() => { const __ps_path=${p}; try { const __ps_process=(globalThis as any).process; if(!__ps_process||typeof __ps_process.chdir!=="function") return ({tag:"Error",error:__psOpaqueHostIOErrorSetCurrentDir(new Error("Node process host unavailable"))} as const); __ps_process.chdir(__ps_path.toString); return ({tag:"Ok",value:undefined} as const); } catch(__ps_error){ return ({tag:"Error",error:__psNodeSetCurrentDirError(__ps_error,__ps_path)} as const); } })`;});}};
export default plugin;

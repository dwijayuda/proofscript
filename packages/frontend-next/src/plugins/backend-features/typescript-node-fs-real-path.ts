import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";
const plugin: ProofScriptPlugin={id:"proofscript.backend-feature.typescript-node-fs-real-path",version: "0.91.0",kind:"backend-feature",requires:["proofscript.backend.typescript","proofscript.feature.io-fs-real-path","proofscript.backend-feature.typescript-filepath","proofscript.backend-feature.typescript-io","proofscript.backend-feature.typescript-io-error-structured","proofscript.backend-feature.typescript-uint32"],setup(registry){registry.addTargetCapability("typescript","core.io.fs.realPath");registry.registerSemanticInfo("typescript.nodeFsRealPathPrelude",`
const __psOpaqueHostIOErrorRealPath = (error: unknown) => ({ __proofscriptIOErrorBrand: "IO.Error", __proofscriptHostError: error } as { readonly __proofscriptIOErrorBrand: "IO.Error" });
const __psNodeRealPathError = (error: any, path: SystemFilePath) => {
 const platform=(globalThis as any).process?.platform, arch=(globalThis as any).process?.arch;
 if(platform!=="linux"||arch!=="x64") return __psOpaqueHostIOErrorRealPath(error);
 switch(error?.code){
  case "ENOENT":
  case "ENOTDIR": return ({__proofscriptIOErrorBrand:"IO.Error",tag:"noFileOrDirectory",filename:path.toString,osCode:__psUInt32(2n),details:""} as {readonly __proofscriptIOErrorBrand:"IO.Error"});
  default:return __psOpaqueHostIOErrorRealPath(error);
 }
};`.trim());registry.registerTargetExprLowering("typescript","lean.io.fs.realPath",(expr,context)=>{if(expr.kind!=="op"||expr.args.length!==1)throw new ProofScriptError("PS3F70","Malformed IO.FS.realPath IR node.");const p=context.emitExpr(expr.args[0]!);return `(() => { const __ps_path=${p}; try { const __ps_fs=(globalThis as any).process?.getBuiltinModule?.("node:fs"); if(!__ps_fs||typeof __ps_fs.realpathSync!=="function") return ({tag:"Error",error:__psOpaqueHostIOErrorRealPath(new Error("Node fs host unavailable"))} as const); const __ps_value=__ps_fs.realpathSync(__ps_path.toString); return ({tag:"Ok",value:__psFilePath(String(__ps_value))} as const); } catch(__ps_error){ return ({tag:"Error",error:__psNodeRealPathError(__ps_error,__ps_path)} as const); } })`;});}};
export default plugin;

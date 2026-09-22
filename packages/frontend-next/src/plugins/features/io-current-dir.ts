import { ProofScriptError } from "../../core/errors.js";
import type { IRType } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { nominalType, typeArgument } from "../../core/type-utils.js";
function ioOf(inner: IRType): IRType { return nominalType(`lean.io(${inner.id})`, `IO(${inner.displayName})`, "lean.io", [typeArgument(inner)]); }
export const proofscriptManifest: PluginManifest={schema:"proofscript.plugin/v1",id:"proofscript.feature.io-current-dir",version: "0.91.0",kind:"feature",semanticIds:["lean.io.currentDir"],proofscriptBaseline:"v0.1",leanBaseline:"4.33.1",lean:{assumptionPolicy:"none"}};
const plugin:ProofScriptPlugin={id:proofscriptManifest.id,version:proofscriptManifest.version,kind:"feature",requires:["proofscript.feature.io","proofscript.feature.filepath"],setup(registry){const fp=nominalType("System.FilePath","System.FilePath");registry.registerBuiltinFunction("IO.currentDir",{params:[],result:ioOf(fp),operation:"lean.io.currentDir"});registry.registerOperation("lean.io.currentDir",{requiredCapabilities:["core.io.currentDir"],verification:{level:"kernel-checkable",notes:"Lean IO.currentDir nullary constant; host correspondence is backend/platform specific."},domain:"runtime"});registry.registerLeanExprLowering("lean.io.currentDir",(expr)=>{if(expr.kind!=="op"||expr.args.length!==0)throw new ProofScriptError("PS4F75","Malformed IO.currentDir IR node.");return "IO.currentDir";});}};
export default plugin;

import { ProofScriptError } from "../../core/errors.js";
import type { IRParam, IRType } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { nominalType, typeArgument } from "../../core/type-utils.js";
function valueParam(name:string,type:IRType):IRParam{return{name,type,binderInfo:"explicit"};}
function ioOf(inner:IRType):IRType{return nominalType(`lean.io(${inner.id})`,`IO(${inner.displayName})`,"lean.io",[typeArgument(inner)]);}
export const proofscriptManifest:PluginManifest={schema:"proofscript.plugin/v1",id:"proofscript.feature.io-fs-hard-link",version: "0.91.0",kind:"feature",semanticIds:["lean.io.fs.hardLink"],proofscriptBaseline:"v0.1",leanBaseline:"4.33.1",lean:{assumptionPolicy:"none"}};
const plugin:ProofScriptPlugin={id:proofscriptManifest.id,version:proofscriptManifest.version,kind:"feature",requires:["proofscript.feature.io","proofscript.feature.filepath","proofscript.feature.unit"],setup(registry){const fp=nominalType("System.FilePath","System.FilePath"),unit=nominalType("Unit","Unit");registry.registerBuiltinFunction("IO.FS.hardLink",{params:[valueParam("orig",fp),valueParam("link",fp)],result:ioOf(unit),operation:"lean.io.fs.hardLink"});registry.registerOperation("lean.io.fs.hardLink",{requiredCapabilities:["core.io.fs.hardLink"],verification:{level:"kernel-checkable",notes:"Lean IO.FS.hardLink; host correspondence is backend/platform/primitive specific."},domain:"runtime"});registry.registerLeanExprLowering("lean.io.fs.hardLink",(expr,context)=>{if(expr.kind!=="op"||expr.args.length!==2)throw new ProofScriptError("PS4F72","Malformed IO.FS.hardLink IR node.");return `(IO.FS.hardLink ${context.emitExpr(expr.args[0]!)} ${context.emitExpr(expr.args[1]!)})`;});}};
export default plugin;

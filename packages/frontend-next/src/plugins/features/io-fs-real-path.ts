import { ProofScriptError } from "../../core/errors.js";
import type { IRParam, IRType } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { nominalType, typeArgument } from "../../core/type-utils.js";
function valueParam(name: string, type: IRType): IRParam { return { name, type, binderInfo: "explicit" }; }
function ioOf(inner: IRType): IRType { return nominalType(`lean.io(${inner.id})`, `IO(${inner.displayName})`, "lean.io", [typeArgument(inner)]); }
export const proofscriptManifest: PluginManifest = { schema:"proofscript.plugin/v1", id:"proofscript.feature.io-fs-real-path", version: "0.91.0", kind:"feature", semanticIds:["lean.io.fs.realPath"], proofscriptBaseline:"v0.1", leanBaseline:"4.33.1", lean:{assumptionPolicy:"none"} };
const plugin: ProofScriptPlugin={id:proofscriptManifest.id,version:proofscriptManifest.version,kind:"feature",requires:["proofscript.feature.io","proofscript.feature.filepath"],setup(registry){const fp=nominalType("System.FilePath","System.FilePath");registry.registerBuiltinFunction("IO.FS.realPath",{params:[valueParam("path",fp)],result:ioOf(fp),operation:"lean.io.fs.realPath"});registry.registerOperation("lean.io.fs.realPath",{requiredCapabilities:["core.io.fs.realPath"],verification:{level:"kernel-checkable",notes:"Lean IO.FS.realPath; host correspondence is backend/platform/primitive specific."},domain:"runtime"});registry.registerLeanExprLowering("lean.io.fs.realPath",(expr,context)=>{if(expr.kind!=="op"||expr.args.length!==1)throw new ProofScriptError("PS4F70","Malformed IO.FS.realPath IR node.");return `(IO.FS.realPath ${context.emitExpr(expr.args[0]!)})`;});}};
export default plugin;

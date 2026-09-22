import { CheckSummary } from "@proofscript/kernel"; import { CheckedModuleSnapshot } from "@proofscript/plugin-api";
export function toCheckedModuleSnapshot(summary:CheckSummary,sourcePath:string):CheckedModuleSnapshot{return deepFreeze({schema:1,proofscriptReference:"v0.1",semanticBaseline:"lean-4.33.1",implementationProfile:"K3c-section-vars0",declarations:summary.declarations,assumptions:summary.assumptions,sourcePath} as CheckedModuleSnapshot);}
function deepFreeze<T>(x:T):T{if(x&&typeof x==="object"){Object.freeze(x);for(const v of Object.values(x as any))deepFreeze(v);}return x;}

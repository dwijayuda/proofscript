import {
  Environment,
  Term,
  TypeclassInstanceMetadata,
  defEq,
  infer,
  instantiate,
  kernelWhnf,
  shift,
} from "@proofscript/kernel";
import { ElaborationError, ResourceExhausted, SurfaceBinder, SurfaceTerm, UnsupportedFeature } from "@proofscript/syntax";
import { TypeclassEnvironment, rankInstanceCandidates } from "@proofscript/typeclass";
import { contextFromTypes, flattenCoreApps } from "./coreUtils";
import type { GlobalInfo } from "./globalEnvironment";
import { MetaContext, coreAsPattern, hiddenDomainPattern, solvedCore, unifyFirstOrder } from "./metavars";

export type SurfaceTermElaborator = (
  term: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
  globals: Map<string, GlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  expectedType?: Term,
) => Term;

export function validateK2rInstanceTelescope(type:Term,typeclasses:TypeclassEnvironment,name:string,kernelEnv:Environment):void{
  let target=type;let seenPrerequisite=false;
  while(true){
    const pi=kernelWhnf(kernelEnv,target);if(pi.tag!=="pi"){target=pi;break;}
    const info=pi.binderInfo??"explicit";
    if(info==="implicit"||info==="strictImplicit"){
      if(seenPrerequisite)throw new UnsupportedFeature(`K3c-section-vars0 requires hidden type parameters of instance ${name} to precede all instance prerequisites`);
      if(kernelWhnf(kernelEnv,pi.domain).tag!=="sort")throw new ElaborationError(`instance ${name}: polymorphic binder is not a direct type parameter`);
      target=pi.body;continue;
    }
    if(info==="instImplicit"){
      seenPrerequisite=true;const {head,args}=flattenCoreApps(kernelWhnf(kernelEnv,pi.domain));
      const cls=head.tag==="const"?typeclasses.getClass(head.name):undefined;
      if(head.tag!=="const"||!cls||args.length!==cls.numParams)throw new ElaborationError(`instance ${name}: prerequisite is not a fully applied registered class`);
      try{target=shift(pi.body,-1,0);}catch{throw new UnsupportedFeature(`K3c-section-vars0 does not support instance targets that depend on prerequisite values (${name})`);}
      continue;
    }
    throw new UnsupportedFeature(`K3c-section-vars0 does not support explicit prerequisites on instance ${name}`);
  }
}
export function validateInstanceBinderDomain(binder:Pick<SurfaceBinder,"name"|"binderInfo">,domain:Term,globals:Map<string,GlobalInfo>,kernelEnv:Environment,ctx:Term[]):void{
  if((binder.binderInfo??"explicit")!=="instImplicit")return;
  const wh=kernelWhnf(kernelEnv,domain);const {head,args}=flattenCoreApps(wh);
  const info=head.tag==="const"?globals.get(head.name):undefined;
  if(head.tag!=="const"||!info?.isClass||!info.classMeta||args.length!==info.classMeta.numParams)throw new ElaborationError(`instance implicit binder '${binder.name}' type is not a fully applied registered class`);
}

export function prettyTypeclassGoal(goal:Term):string{
  const {head,args}=flattenCoreApps(goal);
  if(head.tag==="const")return args.length?`${head.name}(${args.map(a=>JSON.stringify(a)).join(", ")})`:head.name;
  return JSON.stringify(goal);
}

const INSTANCE_SEARCH_MAX_DEPTH=16;
interface InstanceSearchState { depth:number; stack:Set<string>; }

function instanceGoalKey(goal:Term):string{return JSON.stringify(goal);}

export function trySynthesizeExactGlobalInstance(
  goal:Term,
  ctx:Term[],
  globals:Map<string,GlobalInfo>,
  kernelEnv:Environment,
  state:InstanceSearchState={depth:0,stack:new Set()},
):Term|undefined{
  const normalized=kernelWhnf(kernelEnv,goal);
  const {head,args}=flattenCoreApps(normalized);
  const classInfo=head.tag==="const"?globals.get(head.name):undefined;
  if(head.tag!=="const"||!classInfo?.isClass||!classInfo.classMeta||args.length!==classInfo.classMeta.numParams)return undefined;
  if(state.depth>=INSTANCE_SEARCH_MAX_DEPTH)throw new ResourceExhausted(`instance search depth limit (${INSTANCE_SEARCH_MAX_DEPTH}) exceeded for ${prettyTypeclassGoal(normalized)}`);
  const key=instanceGoalKey(normalized);
  if(state.stack.has(key))return undefined;
  const stack=new Set(state.stack);stack.add(key);
  const metas:TypeclassInstanceMetadata[]=[];
  for(const info of globals.values())if(info.instanceMeta?.className===head.name)metas.push(info.instanceMeta);
  for(const meta of rankInstanceCandidates(metas,head.name)){
    const entry=kernelEnv.get(meta.name);
    if(!entry||entry.declaration.levelParams.length!==0)continue;
    const candidate:Term={tag:"const",name:meta.name,levels:[]};
    const candidateType=kernelWhnf(kernelEnv,infer(kernelEnv,ctx,candidate));
    if(defEq(kernelEnv,ctx,candidateType,normalized))return candidate;
    const instantiated=tryInstantiateRecursiveInstanceCandidate(candidate,candidateType,normalized,ctx,globals,kernelEnv,{depth:state.depth,stack});
    if(instantiated)return instantiated;
  }
  return undefined;
}

/**
 * K2r: instantiate a global instance candidate with a leading hidden type
 * telescope followed by zero or more instance-implicit prerequisites. Hidden
 * type parameters are solved first-order from the final class goal. Each
 * prerequisite is then synthesized recursively with cycle and depth guards.
 * No metavariable/search state survives into returned Core.
 */
function tryInstantiateRecursiveInstanceCandidate(
  candidate:Term,
  candidateType:Term,
  goal:Term,
  ctx:Term[],
  globals:Map<string,GlobalInfo>,
  kernelEnv:Environment,
  state:InstanceSearchState,
):Term|undefined{
  const metas=new MetaContext();
  const scoped=[];
  let cursor=candidateType;
  while(true){
    const pi=kernelWhnf(kernelEnv,cursor);
    if(pi.tag!=="pi"){cursor=pi;break;}
    const info=pi.binderInfo??"explicit";
    if(info!=="implicit"&&info!=="strictImplicit")break;
    if(kernelWhnf(kernelEnv,pi.domain).tag!=="sort")return undefined;
    scoped.push(metas.fresh(ctx.length));
    cursor=pi.body;
  }

  // Determine the candidate's final class target without running prerequisite
  // search. K2r requires that this target not depend on prerequisite values.
  let targetUnderHidden=cursor;
  while(true){
    const pi=kernelWhnf(kernelEnv,targetUnderHidden);
    if(pi.tag!=="pi"){targetUnderHidden=pi;break;}
    const info=pi.binderInfo??"explicit";
    if(info!=="instImplicit")return undefined;
    const prereqHead=flattenCoreApps(kernelWhnf(kernelEnv,pi.domain));
    const prereqInfo=prereqHead.head.tag==="const"?globals.get(prereqHead.head.name):undefined;
    if(prereqHead.head.tag!=="const"||!prereqInfo?.isClass||!prereqInfo.classMeta||prereqHead.args.length!==prereqInfo.classMeta.numParams)return undefined;
    try{targetUnderHidden=shift(pi.body,-1,0);}catch{return undefined;}
  }

  let solutions:Term[]=[];
  if(scoped.length>0){
    const pattern=hiddenDomainPattern(targetUnderHidden,scoped);
    const actual=coreAsPattern(goal);
    if(!pattern||!actual||!unifyFirstOrder(pattern,actual,metas))return undefined;
    const solved=scoped.map(m=>solvedCore(m,metas));
    if(solved.some(x=>!x))return undefined;
    solutions=solved as Term[];
  }else if(!defEq(kernelEnv,ctx,targetUnderHidden,goal)){
    return undefined;
  }

  let out=candidate;
  let typ=candidateType;
  for(const solution of solutions){
    const pi=kernelWhnf(kernelEnv,typ);
    if(pi.tag!=="pi")return undefined;
    const info=pi.binderInfo??"explicit";
    if(info!=="implicit"&&info!=="strictImplicit")return undefined;
    const solutionSort=kernelWhnf(kernelEnv,infer(kernelEnv,ctx,solution));
    if(solutionSort.tag!=="sort"||!defEq(kernelEnv,ctx,solutionSort,pi.domain))return undefined;
    out={tag:"app",fn:out,arg:solution};
    typ=instantiate(pi.body,solution);
  }

  while(true){
    const pi=kernelWhnf(kernelEnv,typ);
    if(pi.tag!=="pi")break;
    if((pi.binderInfo??"explicit")!=="instImplicit")return undefined;
    const prerequisite=trySynthesizeExactGlobalInstance(pi.domain,ctx,globals,kernelEnv,{depth:state.depth+1,stack:state.stack});
    if(!prerequisite)return undefined;
    out={tag:"app",fn:out,arg:prerequisite};
    typ=instantiate(pi.body,prerequisite);
  }
  const selectedType=kernelWhnf(kernelEnv,infer(kernelEnv,ctx,out));
  return defEq(kernelEnv,ctx,selectedType,goal)?out:undefined;
}

export function trySynthesizeHiddenPrefixFirstOrder(
  fnType: Term,
  sourceArg: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
  globals: Map<string, GlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  elaborateTerm: SurfaceTermElaborator,
): Term[] | undefined {
  const ctx = contextFromTypes(localTypes);
  const metas = new MetaContext();
  const scoped = [];
  let cursor = fnType;

  // Collect consecutive implicit/strict-implicit type parameters. Instance
  // search is a separate subsystem and deliberately stops this solver.
  while (true) {
    const pi = kernelWhnf(kernelEnv, cursor);
    if (pi.tag !== "pi") return undefined;
    const info = pi.binderInfo ?? "explicit";
    if (info === "explicit") { cursor = pi; break; }
    if (info === "instImplicit") return undefined;
    if (kernelWhnf(kernelEnv, pi.domain).tag !== "sort") return undefined;
    scoped.push(metas.fresh(localTypes.length));
    cursor = pi.body;
  }
  if (scoped.length === 0 || cursor.tag !== "pi") return undefined;

  const pattern = hiddenDomainPattern(cursor.domain, scoped);
  if (!pattern) return undefined;
  // Infer the source argument independently, then solve the hidden variables by
  // matching the expected domain pattern against its kernel-inferred type.
  const argCore = elaborateTerm(sourceArg, locals, localTypes, globals, available, kernelEnv);
  const actualType = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, argCore));
  const actualPattern = coreAsPattern(actualType);
  if (!actualPattern || !unifyFirstOrder(pattern, actualPattern, metas)) return undefined;

  const candidates = scoped.map(m => solvedCore(m, metas));
  if (candidates.some(x => !x)) return undefined;

  // Validate each solution against the hidden binder's actual domain after all
  // earlier hidden binders have been instantiated. This makes the kernel the
  // final arbiter even though the unifier itself is untrusted frontend code.
  let current = fnType;
  for (const candidate of candidates as Term[]) {
    const pi = kernelWhnf(kernelEnv, current);
    if (pi.tag !== "pi") return undefined;
    const sort = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, candidate));
    if (!defEq(kernelEnv, ctx, sort, pi.domain)) return undefined;
    current = instantiate(pi.body, candidate);
  }
  return candidates as Term[];
}

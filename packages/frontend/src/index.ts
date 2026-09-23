import path from "node:path";
import crypto from "node:crypto";
import { parseSource } from "@proofscript/parser";
import { collectResolvedGlobalReferences, elaborateProgram, type ProofStateSnapshot, type ResolvedGlobalReference } from "@proofscript/elaborator";
import {
  checkCoreDeclarations,
  CheckSummary,
  CoreArtifact,
  CoreDeclaration,
  Term,
  TypeclassEnvironmentMetadata,
  emptyTypeclassEnvironment,
  prettyLevel,
} from "@proofscript/kernel";
import { CoreModulesBuildMetadata, makeArtifact } from "@proofscript/kernel-codec";
import { prepareCoreEnvironment } from "@proofscript/environment";
import { buildModuleGraph, buildWorkspaceGraph, findProjectRoot, ProjectModuleGraph, ProjectModuleSource, ProjectWorkspaceGraph, type ProjectSourceProvider } from "@proofscript/project";
import { UnsupportedFeature, type SurfaceFeatureUse } from "@proofscript/syntax";

export interface FrontendProofStateLocal {
  readonly name:string;
  readonly type:string;
}
export interface FrontendProofState {
  readonly kind:"tactic"|"branch";
  readonly tactic:string;
  readonly startOffset:number;
  readonly endOffset:number;
  readonly goal:string;
  readonly locals:readonly FrontendProofStateLocal[];
  readonly branch?:string;
}
export interface FrontendProofStateEvent {
  readonly state:FrontendProofState;
  readonly moduleName?:string;
  readonly filePath?:string;
}

export interface FrontendModuleCacheEntry {
  readonly sourceSha256:string;
  readonly visibleEnvironmentSha256:string;
  readonly declarations:CoreDeclaration[];
  readonly typeclasses:TypeclassEnvironmentMetadata;
  readonly ownedFeatures:SurfaceFeatureUse[];
  readonly declarationLocations:ReturnType<typeof parseSource>["declarationLocations"];
  readonly globalReferences:ResolvedGlobalReference[];
  readonly proofStates:FrontendProofState[];
}
export interface FrontendModuleCache {
  get(moduleName:string):FrontendModuleCacheEntry|undefined;
  set(moduleName:string,entry:FrontendModuleCacheEntry):unknown;
  delete?(moduleName:string):unknown;
  keys?():IterableIterator<string>;
}
export interface FrontendOptions {
  prelude?:CoreArtifact;
  /** Internal module-driver switch: imports were already resolved by the project graph. */
  allowResolvedImports?:boolean;
  /** Optional source overlay for unsaved/editor buffers during project checks. */
  sourceProvider?:ProjectSourceProvider;
  /** Optional in-process cache of previously checked modules. Entries are revalidated before reuse. */
  moduleCache?:FrontendModuleCache;
  /** Unsaved/new workspace files not yet present on disk. Used only by workspace indexing. */
  workspaceAdditionalFiles?:readonly string[];
  /**
   * Read-only proof-state event sink for editor tooling. Events are emitted by
   * the canonical elaboration path as states become available, so already
   * observed states survive a later elaboration failure. Sink failures are
   * ignored and can never affect source acceptance.
   */
  proofStateSink?:(event:FrontendProofStateEvent)=>void;
}
export interface FrontendResult {
  artifact: ReturnType<typeof makeArtifact>;
  summary: CheckSummary;
  parserState: ReturnType<typeof parseSource>["finalState"];
  /** ProofScript-owned surface feature occurrences with source offsets. */
  ownedFeatures: SurfaceFeatureUse[];
  /** Non-semantic source locations for declarations, produced by the canonical parser. */
  declarationLocations: ReturnType<typeof parseSource>["declarationLocations"];
  /** Direct global references resolved with canonical namespace/open-namespace rules. */
  globalReferences: ResolvedGlobalReference[];
  /** Observational states emitted by the ordinary checked proof elaboration path. */
  proofStates: FrontendProofState[];
}

export interface CheckedProjectModule {
  source:ProjectModuleSource;
  declarations:CoreDeclaration[];
  typeclasses:TypeclassEnvironmentMetadata;
  ownedFeatures:SurfaceFeatureUse[];
  declarationLocations:ReturnType<typeof parseSource>["declarationLocations"];
  globalReferences:ResolvedGlobalReference[];
  proofStates:FrontendProofState[];
}
export interface FrontendProjectResult {
  artifact:ReturnType<typeof makeArtifact>;
  summary:CheckSummary;
  graph:ProjectModuleGraph;
  modules:CheckedProjectModule[];
  moduleReuse:{reused:string[];rebuilt:string[]};
}
export interface FrontendWorkspaceResult {
  graph:ProjectWorkspaceGraph;
  modules:CheckedProjectModule[];
  moduleReuse:{reused:string[];rebuilt:string[]};
}

/** Check one already-loaded source unit. Filesystem imports require checkProjectFile. */
export function checkSource(source:string,options:FrontendOptions={}):FrontendResult{
  const prepared=options.prelude?prepareCoreEnvironment(options.prelude):undefined;
  const proofStates:FrontendProofState[]=[];
  const recordProofState=(state:ProofStateSnapshot):void=>{
    const displayed=safeDisplayProofState(state);
    if(!displayed)return;
    proofStates.push(displayed);
    safeEmitProofState(options.proofStateSink,{state:cloneProofState(displayed)});
  };
  const parsed=parseSource(source,undefined,{
    knownGlobalNames:prepared?.globals.map(g=>g.name)??[],
    validateOpenNamespaces:true,
    ...(options.proofStateSink?{
      incompleteProofSink:(observation)=>{
        try{
          // The source remains rejected by the parser. We only elaborate the
          // canonical prefix AST the parser actually reached so editor tooling
          // can display already-determined goals/locals.
          elaborateProgram(
            observation.declarations,
            prepared?.globals??[],
            prepared?.artifact.declarations??[],
            prepared?.typeclasses,
            {recordProofState},
          );
        }catch{
          // Partial-state recovery is observational and never replaces the
          // original parse failure or fabricates continuation after it.
        }
      },
    }:{}),
  });
  if(parsed.imports.length&&!options.allowResolvedImports)throw new UnsupportedFeature("K3c-section-vars0 source imports require project/module resolution; use the project frontend");
  const elaborated=elaborateProgram(
    parsed.declarations,
    prepared?.globals??[],
    prepared?.artifact.declarations??[],
    prepared?.typeclasses,
    {recordProofState},
  );
  const initial=prepared?.artifact.declarations??[];
  const all=[...initial,...elaborated.declarations];
  const summary=checkCoreDeclarations(all, 'KERNEL-level-instantiation-conformance1');
  const modules:CoreModulesBuildMetadata={entry:"__single__",modules:[{name:"__single__",sourceSha256:sha256Text(source),imports:[],declarations:elaborated.declarations.map(d=>d.name)}]};
  // The project driver supplies the complete graph after every dependency has been checked.
  // Intermediate per-module artifacts intentionally carry no partial module metadata.
  const globalReferences=[...collectResolvedGlobalReferences(parsed.declarations,all.map(declaration=>declaration.name))];
  return{artifact:makeArtifact(all,elaborated.typeclasses,options.allowResolvedImports?undefined:modules),summary,parserState:parsed.finalState,ownedFeatures:[...parsed.ownedFeatures],declarationLocations:parsed.declarationLocations.map(item=>({...item})),globalReferences,proofStates};
}

/**
 * Resolve and elaborate a complete import closure. Each module sees only the
 * checked standard/prelude environment plus its transitive imports, never
 * unrelated sibling modules. The final artifact is self-contained Core.
 */
export function checkProjectFile(entryFile:string,options:FrontendOptions={}):FrontendProjectResult{
  const graph=buildModuleGraph(entryFile,undefined,options.sourceProvider);
  const compiled=compileResolvedModules(graph.modules,options);
  const checkedModules=compiled.modules;
  const baseDecls=[...(options.prelude?.declarations??[])];
  const baseTypeclasses=cloneTypeclasses(options.prelude?.typeclasses??emptyTypeclassEnvironment());
  const declarations=[...baseDecls,...checkedModules.flatMap(m=>m.declarations)];
  const typeclasses=normalizeTypeclassOrder(declarations,mergeTypeclasses(baseTypeclasses,...checkedModules.map(m=>m.typeclasses)));
  const summary=checkCoreDeclarations(declarations, 'KERNEL-level-instantiation-conformance1');
  const modules:CoreModulesBuildMetadata={
    entry:graph.entry,
    modules:checkedModules.map(m=>({
      name:m.source.name,
      sourceSha256:m.source.sourceSha256,
      imports:[...m.source.imports],
      declarations:m.declarations.map(d=>d.name),
    })),
  };
  return{artifact:makeArtifact(declarations,typeclasses,modules),summary,graph,modules:checkedModules,moduleReuse:{reused:compiled.reused,rebuilt:compiled.rebuilt}};
}

/**
 * Check every module discoverable under the configured source roots for editor/workspace indexing.
 *
 * Each module is elaborated only against its transitive imports, exactly like the normal
 * project checker. Disconnected modules are aggregated for navigation metadata only; this
 * function does not invent a synthetic semantic import relation between them.
 */
export function checkWorkspace(projectRoot:string,options:FrontendOptions={}):FrontendWorkspaceResult{
  const graph=buildWorkspaceGraph(projectRoot,{
    sourceProvider:options.sourceProvider,
    additionalFiles:options.workspaceAdditionalFiles,
  });
  const compiled=compileResolvedModules(graph.modules,options);
  return{graph,modules:compiled.modules,moduleReuse:{reused:compiled.reused,rebuilt:compiled.rebuilt}};
}

export function checkWorkspaceForFile(filePath:string,options:FrontendOptions={}):FrontendWorkspaceResult{
  return checkWorkspace(findProjectRoot(path.dirname(path.resolve(filePath))),options);
}

function compileResolvedModules(
  sourceModules:readonly ProjectModuleSource[],
  options:FrontendOptions,
):{modules:CheckedProjectModule[];reused:string[];rebuilt:string[]}{
  const baseDecls=[...(options.prelude?.declarations??[])];
  const baseTypeclasses=cloneTypeclasses(options.prelude?.typeclasses??emptyTypeclassEnvironment());
  const compiled=new Map<string,CheckedProjectModule>();
  const graphByName=new Map(sourceModules.map(m=>[m.name,m] as const));
  const reused:string[]=[];
  const rebuilt:string[]=[];

  for(const sourceModule of sourceModules){
    const visible=dependencyClosure(sourceModule,graphByName);
    const visibleModules=sourceModules.filter(m=>visible.has(m.name)).map(m=>compiled.get(m.name)!).filter(Boolean);
    const visibleDecls=[...baseDecls,...visibleModules.flatMap(m=>m.declarations)];
    const visibleTypeclasses=normalizeTypeclassOrder(visibleDecls,mergeTypeclasses(baseTypeclasses,...visibleModules.map(m=>m.typeclasses)));
    const visibleEnvironmentSha256=checkedEnvironmentSha256(visibleDecls,visibleTypeclasses);
    const cached=options.moduleCache?.get(sourceModule.name);
    if(cached&&cached.sourceSha256===sourceModule.sourceSha256&&cached.visibleEnvironmentSha256===visibleEnvironmentSha256){
      const cachedProofStates=cloneProofStates(cached.proofStates);
      compiled.set(sourceModule.name,{
        source:sourceModule,
        declarations:cached.declarations,
        typeclasses:cloneTypeclasses(cached.typeclasses),
        ownedFeatures:cached.ownedFeatures.map(item=>({...item})),
        declarationLocations:cached.declarationLocations.map(item=>({...item})),
        globalReferences:cached.globalReferences.map(item=>({...item})),
        proofStates:cachedProofStates,
      });
      for(const state of cachedProofStates){
        safeEmitProofState(options.proofStateSink,{
          state:cloneProofState(state),
          moduleName:sourceModule.name,
          filePath:sourceModule.filePath,
        });
      }
      reused.push(sourceModule.name);
      continue;
    }

    const envArtifact=makeArtifact(visibleDecls,visibleTypeclasses);
    const checked=checkSource(sourceModule.source,{
      prelude:envArtifact,
      allowResolvedImports:true,
      ...(options.proofStateSink?{
        proofStateSink:(event:FrontendProofStateEvent)=>options.proofStateSink!({
          ...event,
          moduleName:sourceModule.name,
          filePath:sourceModule.filePath,
        }),
      }:{}),
    });
    const declarations=checked.artifact.declarations.slice(visibleDecls.length);
    const owned=new Set(declarations.map(d=>d.name));
    const typeclasses:TypeclassEnvironmentMetadata={
      classes:checked.artifact.typeclasses.classes.filter(c=>owned.has(c.name)).map(cloneClass),
      instances:checked.artifact.typeclasses.instances.filter(i=>owned.has(i.name)).map(i=>({...i})),
    };
    const moduleResult:CheckedProjectModule={
      source:sourceModule,
      declarations,
      typeclasses,
      ownedFeatures:[...checked.ownedFeatures],
      declarationLocations:checked.declarationLocations.map(item=>({...item})),
      globalReferences:checked.globalReferences.map(item=>({...item})),
      proofStates:cloneProofStates(checked.proofStates),
    };
    compiled.set(sourceModule.name,moduleResult);
    options.moduleCache?.set(sourceModule.name,{
      sourceSha256:sourceModule.sourceSha256,
      visibleEnvironmentSha256,
      declarations,
      typeclasses:cloneTypeclasses(typeclasses),
      ownedFeatures:checked.ownedFeatures.map(item=>({...item})),
      declarationLocations:checked.declarationLocations.map(item=>({...item})),
      globalReferences:checked.globalReferences.map(item=>({...item})),
      proofStates:cloneProofStates(checked.proofStates),
    });
    rebuilt.push(sourceModule.name);
  }

  return{modules:sourceModules.map(module=>compiled.get(module.name)!),reused,rebuilt};
}

function safeDisplayProofState(state:ProofStateSnapshot):FrontendProofState|undefined{
  try{return displayProofState(state);}
  catch{
    // Display metadata is observational only. A formatter bug must not turn a
    // successfully checked Core program into a frontend rejection.
    return undefined;
  }
}
function safeEmitProofState(
  sink:FrontendOptions["proofStateSink"],
  event:FrontendProofStateEvent,
):void{
  try{sink?.(event);}
  catch{
    // Editor observers have no proof authority and must not affect compilation.
  }
}
function displayProofState(state:ProofStateSnapshot):FrontendProofState{
  const localNames=state.locals.map(local=>local.name);
  return{
    kind:state.kind,
    tactic:state.tactic,
    startOffset:state.startOffset,
    endOffset:state.endOffset,
    goal:prettyProofTerm(state.goal,localNames),
    locals:state.locals.map((local,index)=>({
      name:local.name,
      type:prettyProofTerm(local.type,localNames.slice(0,index)),
    })),
    ...(state.branch?{branch:state.branch}:{}),
  };
}
function prettyProofTerm(term:Term,locals:readonly string[]):string{
  switch(term.tag){
    case "sort":return prettyLevel(term.level);
    case "bvar":return locals[locals.length-1-term.index]??`#${term.index}`;
    case "const":return term.levels.length?`${term.name}.{${term.levels.map(prettyLevel).join(",")}}`:term.name;
    case "lit":return term.literal.tag==="str"?JSON.stringify(term.literal.value):String(term.literal.value);
    case "app":return `(${prettyProofTerm(term.fn,locals)} ${prettyProofTerm(term.arg,locals)})`;
    case "lam":{
      const name=freshDisplayBinder(locals);
      return `(fun (${name}: ${prettyProofTerm(term.domain,locals)}) => ${prettyProofTerm(term.body,[...locals,name])})`;
    }
    case "pi":{
      const name=freshDisplayBinder(locals);
      return `(Pi (${name}: ${prettyProofTerm(term.domain,locals)}) -> ${prettyProofTerm(term.body,[...locals,name])})`;
    }
    case "let":{
      const name=freshDisplayBinder(locals);
      return `(let ${name}: ${prettyProofTerm(term.type,locals)} := ${prettyProofTerm(term.value,locals)}; ${prettyProofTerm(term.body,[...locals,name])})`;
    }
    case "proj":return `(${prettyProofTerm(term.expr,locals)}.${term.index})`;
  }
}
function freshDisplayBinder(locals:readonly string[]):string{
  for(let index=0;;index++){
    const name=`_x${index}`;
    if(!locals.includes(name))return name;
  }
}
function cloneProofState(state:FrontendProofState):FrontendProofState{
  return{
    ...state,
    locals:state.locals.map(local=>({...local})),
  };
}
function cloneProofStates(states:readonly FrontendProofState[]):FrontendProofState[]{
  return states.map(cloneProofState);
}

function dependencyClosure(module:ProjectModuleSource,all:Map<string,ProjectModuleSource>):Set<string>{
  const out=new Set<string>();
  const visit=(name:string):void=>{if(out.has(name))return;out.add(name);const m=all.get(name);if(!m)throw new Error(`internal: missing module '${name}' in resolved graph`);for(const i of m.imports)visit(i);};
  for(const i of module.imports)visit(i);
  return out;
}

function mergeTypeclasses(base:TypeclassEnvironmentMetadata,...parts:TypeclassEnvironmentMetadata[]):TypeclassEnvironmentMetadata{
  const classes=[] as TypeclassEnvironmentMetadata["classes"];
  const instances=[] as TypeclassEnvironmentMetadata["instances"];
  const classNames=new Set<string>();const instanceNames=new Set<string>();
  for(const source of [base,...parts]){
    for(const c of source.classes){if(classNames.has(c.name))continue;classNames.add(c.name);classes.push(cloneClass(c));}
    for(const i of source.instances){if(instanceNames.has(i.name))continue;instanceNames.add(i.name);instances.push({...i});}
  }
  return{classes,instances};
}

function normalizeTypeclassOrder(declarations:readonly CoreDeclaration[],metadata:TypeclassEnvironmentMetadata):TypeclassEnvironmentMetadata{
  const pos=new Map(declarations.map((d,i)=>[d.name,i] as const));
  return{
    classes:metadata.classes.map(c=>({...cloneClass(c),declarationOrder:pos.get(c.name)??c.declarationOrder})),
    instances:metadata.instances.map(i=>({...i,declarationOrder:pos.get(i.name)??i.declarationOrder})),
  };
}
function cloneClass(c:TypeclassEnvironmentMetadata["classes"][number]):TypeclassEnvironmentMetadata["classes"][number]{return{...c,params:c.params.map(p=>({...p})),fields:c.fields.map(f=>({...f}))};}
function cloneTypeclasses(x:TypeclassEnvironmentMetadata):TypeclassEnvironmentMetadata{return{classes:x.classes.map(cloneClass),instances:x.instances.map(i=>({...i}))};}
function stableValue(value:unknown):unknown{
  if(Array.isArray(value))return value.map(stableValue);
  if(value&&typeof value==="object"){
    const input=value as Record<string,unknown>;const output:Record<string,unknown>={};
    for(const key of Object.keys(input).sort()){const item=input[key];if(item!==undefined)output[key]=stableValue(item);}
    return output;
  }
  return value;
}
function checkedEnvironmentSha256(declarations:readonly CoreDeclaration[],typeclasses:TypeclassEnvironmentMetadata):string{
  return sha256Text(JSON.stringify(stableValue({declarations,typeclasses})));
}
function sha256Text(text:string):string{return crypto.createHash("sha256").update(text).digest("hex");}

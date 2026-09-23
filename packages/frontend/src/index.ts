import crypto from "node:crypto";
import { parseSource } from "@proofscript/parser";
import { collectResolvedGlobalReferences, elaborateProgram, type ResolvedGlobalReference } from "@proofscript/elaborator";
import {
  checkCoreDeclarations,
  CheckSummary,
  CoreArtifact,
  CoreDeclaration,
  TypeclassEnvironmentMetadata,
  emptyTypeclassEnvironment,
} from "@proofscript/kernel";
import { CoreModulesBuildMetadata, makeArtifact } from "@proofscript/kernel-codec";
import { prepareCoreEnvironment } from "@proofscript/environment";
import { buildModuleGraph, buildWorkspaceGraph, ProjectModuleGraph, ProjectModuleSource, ProjectWorkspaceGraph, type ProjectSourceProvider } from "@proofscript/project";
import { UnsupportedFeature, type SurfaceFeatureUse } from "@proofscript/syntax";

export interface FrontendModuleCacheEntry {
  readonly sourceSha256:string;
  readonly visibleEnvironmentSha256:string;
  readonly declarations:CoreDeclaration[];
  readonly typeclasses:TypeclassEnvironmentMetadata;
  readonly ownedFeatures:SurfaceFeatureUse[];
  readonly declarationLocations:ReturnType<typeof parseSource>["declarationLocations"];
  readonly globalReferences:ResolvedGlobalReference[];
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
}

export interface CheckedProjectModule {
  source:ProjectModuleSource;
  declarations:CoreDeclaration[];
  typeclasses:TypeclassEnvironmentMetadata;
  ownedFeatures:SurfaceFeatureUse[];
  declarationLocations:ReturnType<typeof parseSource>["declarationLocations"];
  globalReferences:ResolvedGlobalReference[];
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
  const parsed=parseSource(source,undefined,{knownGlobalNames:prepared?.globals.map(g=>g.name)??[],validateOpenNamespaces:true});
  if(parsed.imports.length&&!options.allowResolvedImports)throw new UnsupportedFeature("K3c-section-vars0 source imports require project/module resolution; use the project frontend");
  const elaborated=elaborateProgram(parsed.declarations,prepared?.globals??[],prepared?.artifact.declarations??[],prepared?.typeclasses);
  const initial=prepared?.artifact.declarations??[];
  const all=[...initial,...elaborated.declarations];
  const summary=checkCoreDeclarations(all, 'KERNEL-level-instantiation-conformance1');
  const modules:CoreModulesBuildMetadata={entry:"__single__",modules:[{name:"__single__",sourceSha256:sha256Text(source),imports:[],declarations:elaborated.declarations.map(d=>d.name)}]};
  // The project driver supplies the complete graph after every dependency has been checked.
  // Intermediate per-module artifacts intentionally carry no partial module metadata.
  const globalReferences=[...collectResolvedGlobalReferences(parsed.declarations,all.map(declaration=>declaration.name))];
  return{artifact:makeArtifact(all,elaborated.typeclasses,options.allowResolvedImports?undefined:modules),summary,parserState:parsed.finalState,ownedFeatures:[...parsed.ownedFeatures],declarationLocations:parsed.declarationLocations.map(item=>({...item})),globalReferences};
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
      compiled.set(sourceModule.name,{
        source:sourceModule,
        declarations:cached.declarations,
        typeclasses:cloneTypeclasses(cached.typeclasses),
        ownedFeatures:cached.ownedFeatures.map(item=>({...item})),
        declarationLocations:cached.declarationLocations.map(item=>({...item})),
        globalReferences:cached.globalReferences.map(item=>({...item})),
      });
      reused.push(sourceModule.name);
      continue;
    }

    const envArtifact=makeArtifact(visibleDecls,visibleTypeclasses);
    const checked=checkSource(sourceModule.source,{prelude:envArtifact,allowResolvedImports:true});
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
    });
    rebuilt.push(sourceModule.name);
  }

  return{modules:sourceModules.map(module=>compiled.get(module.name)!),reused,rebuilt};
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

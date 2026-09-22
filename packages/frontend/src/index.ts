import crypto from "node:crypto";
import { parseSource } from "@proofscript/parser";
import { elaborateProgram } from "@proofscript/elaborator";
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
import { buildModuleGraph, ProjectModuleGraph, ProjectModuleSource } from "@proofscript/project";
import { UnsupportedFeature } from "@proofscript/syntax";

export interface FrontendOptions {
  prelude?:CoreArtifact;
  /** Internal module-driver switch: imports were already resolved by the project graph. */
  allowResolvedImports?:boolean;
}
export interface FrontendResult {
  artifact: ReturnType<typeof makeArtifact>;
  summary: CheckSummary;
  parserState: ReturnType<typeof parseSource>["finalState"];
}

export interface CheckedProjectModule {
  source:ProjectModuleSource;
  declarations:CoreDeclaration[];
  typeclasses:TypeclassEnvironmentMetadata;
}
export interface FrontendProjectResult {
  artifact:ReturnType<typeof makeArtifact>;
  summary:CheckSummary;
  graph:ProjectModuleGraph;
  modules:CheckedProjectModule[];
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
  return{artifact:makeArtifact(all,elaborated.typeclasses,options.allowResolvedImports?undefined:modules),summary,parserState:parsed.finalState};
}

/**
 * Resolve and elaborate a complete import closure. Each module sees only the
 * checked standard/prelude environment plus its transitive imports, never
 * unrelated sibling modules. The final artifact is self-contained Core.
 */
export function checkProjectFile(entryFile:string,options:FrontendOptions={}):FrontendProjectResult{
  const graph=buildModuleGraph(entryFile);
  const baseDecls=[...(options.prelude?.declarations??[])];
  const baseTypeclasses=cloneTypeclasses(options.prelude?.typeclasses??emptyTypeclassEnvironment());
  const compiled=new Map<string,CheckedProjectModule>();
  const graphByName=new Map(graph.modules.map(m=>[m.name,m] as const));

  for(const sourceModule of graph.modules){
    const visible=dependencyClosure(sourceModule,graphByName);
    const visibleModules=graph.modules.filter(m=>visible.has(m.name)).map(m=>compiled.get(m.name)!).filter(Boolean);
    const visibleDecls=[...baseDecls,...visibleModules.flatMap(m=>m.declarations)];
    const visibleTypeclasses=normalizeTypeclassOrder(visibleDecls,mergeTypeclasses(baseTypeclasses,...visibleModules.map(m=>m.typeclasses)));
    const envArtifact=makeArtifact(visibleDecls,visibleTypeclasses);
    const checked=checkSource(sourceModule.source,{prelude:envArtifact,allowResolvedImports:true});
    const declarations=checked.artifact.declarations.slice(visibleDecls.length);
    const owned=new Set(declarations.map(d=>d.name));
    const typeclasses:TypeclassEnvironmentMetadata={
      classes:checked.artifact.typeclasses.classes.filter(c=>owned.has(c.name)).map(cloneClass),
      instances:checked.artifact.typeclasses.instances.filter(i=>owned.has(i.name)).map(i=>({...i})),
    };
    compiled.set(sourceModule.name,{source:sourceModule,declarations,typeclasses});
  }

  const checkedModules=graph.modules.map(m=>compiled.get(m.name)!);
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
  return{artifact:makeArtifact(declarations,typeclasses,modules),summary,graph,modules:checkedModules};
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
function sha256Text(text:string):string{return crypto.createHash("sha256").update(text).digest("hex");}

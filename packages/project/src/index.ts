import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { parseSource } from "@proofscript/parser";

export interface PluginConfigEntry { use:string; options?:unknown; }
export interface ProjectConfig {
  /** Current product language profile; "0.1" is retained for legacy project compatibility. */
  language?:"0.6.1"|"0.1";
  /** Current product profile. Do not use this field on legacy 0.1 configs. */
  productProfile?:"ps1-v061";
  /** Legacy project compatibility field. Current 0.6.1 configs must not use it. */
  semanticBaseline?:"lean-4.33.1";
  plugins?:Array<string|PluginConfigEntry>;
  /** Ordered project-relative roots used only to locate ProofScript source modules. */
  sourceRoots?:string[];
}

export interface ProjectModuleSource {
  name:string;
  filePath:string;
  source:string;
  sourceSha256:string;
  imports:string[];
}

export interface ProjectModuleGraph {
  root:string;
  entry:string;
  sourceRoots:string[];
  /** Deterministic dependency-first topological order; the entry is last. */
  modules:ProjectModuleSource[];
}


/** Optional source overlay used by compiler/editor services for unsaved buffers.
 * Returning undefined falls back to the filesystem. */
export type ProjectSourceProvider=(filePath:string)=>string|undefined;

export interface ProjectWorkspaceGraph {
  root:string;
  sourceRoots:string[];
  /** All discovered project modules in deterministic dependency-first order. */
  modules:ProjectModuleSource[];
}

export interface WorkspaceGraphOptions {
  sourceProvider?:ProjectSourceProvider;
  /** Unsaved/new files that may not exist on disk yet. */
  additionalFiles?:readonly string[];
}

export class ProjectError extends Error {}

export function findProjectRoot(start:string):string{
  let dir=path.resolve(start);
  while(true){
    if(fs.existsSync(path.join(dir,"proofscript.config.cts"))||fs.existsSync(path.join(dir,"package.json")))return dir;
    const parent=path.dirname(dir);if(parent===dir)return path.resolve(start);dir=parent;
  }
}

export function loadProjectConfig(root:string):ProjectConfig{
  const file=path.join(root,"proofscript.config.cts");
  if(!fs.existsSync(file))return{};
  const req=createRequire(path.join(root,"package.json"));
  const loaded=req(file);const cfg=(loaded.default??loaded) as ProjectConfig;
  if(!cfg||typeof cfg!=="object"||Array.isArray(cfg))throw new ProjectError("proofscript.config.cts must export an object");
  if(cfg.language&&cfg.language!=="0.6.1"&&cfg.language!=="0.1")throw new ProjectError(`unsupported ProofScript language ${cfg.language}`);
  if(cfg.productProfile&&cfg.productProfile!=="ps1-v061")throw new ProjectError(`unsupported ProofScript product profile ${cfg.productProfile}`);
  if(cfg.semanticBaseline&&cfg.semanticBaseline!=="lean-4.33.1")throw new ProjectError(`semantic baseline mismatch ${cfg.semanticBaseline}`);
  if(cfg.language==="0.6.1"&&cfg.semanticBaseline!==undefined)throw new ProjectError("current ProofScript project config must not present a Lean/Core compatibility baseline as the product semantic version");
  if(cfg.language==="0.1"&&cfg.productProfile!==undefined)throw new ProjectError("legacy ProofScript 0.1 project config must not use the current productProfile field");
  if(cfg.sourceRoots!==undefined){
    if(!Array.isArray(cfg.sourceRoots)||cfg.sourceRoots.length===0||!cfg.sourceRoots.every(x=>typeof x==="string"&&x.length>0))throw new ProjectError("sourceRoots must be a non-empty string array");
  }
  return cfg;
}

export function resolveSourceRoots(root:string,cfg:ProjectConfig=loadProjectConfig(root)):string[]{
  const rootAbs=path.resolve(root);
  const raw=cfg.sourceRoots??["src"];
  const resolved=raw.map((item,i)=>{
    if(path.isAbsolute(item))throw new ProjectError(`sourceRoots[${i}] must be project-relative`);
    const p=path.resolve(rootAbs,item);
    if(!isInsideOrEqual(rootAbs,p))throw new ProjectError(`sourceRoots[${i}] escapes the project root`);
    return p;
  });
  if(new Set(resolved.map(normalizeFsKey)).size!==resolved.length)throw new ProjectError("sourceRoots contains duplicate roots");
  return resolved;
}

export function buildModuleGraph(entryFile:string,projectRoot?:string,sourceProvider?:ProjectSourceProvider):ProjectModuleGraph{
  const entryPath=path.resolve(entryFile);
  if(!sourceExists(entryPath,sourceProvider))throw new ProjectError(`entry source file not found: ${entryPath}`);
  if(path.extname(entryPath)!==".ps")throw new ProjectError("ProofScript source files must use the .ps extension");
  const root=path.resolve(projectRoot??findProjectRoot(path.dirname(entryPath)));
  const cfg=loadProjectConfig(root);
  const sourceRoots=resolveSourceRoots(root,cfg);
  const entry=moduleNameForEntry(entryPath,sourceRoots);

  const nodes=new Map<string,ProjectModuleSource>();
  const filesToNames=new Map<string,string>();
  const state=new Map<string,"visiting"|"done">();
  const stack:string[]=[];
  const order:ProjectModuleSource[]=[];

  const visit=(name:string,filePath:string):void=>{
    const fileAbs=path.resolve(filePath);
    const real=realPathKey(fileAbs);
    const previousName=filesToNames.get(real);
    if(previousName&&previousName!==name)throw new ProjectError(`module file '${fileAbs}' is reachable as both '${previousName}' and '${name}'`);
    filesToNames.set(real,name);

    const existing=nodes.get(name);
    if(existing&&normalizeFsKey(existing.filePath)!==normalizeFsKey(fileAbs))throw new ProjectError(`module '${name}' resolves to more than one source file`);
    const s=state.get(name);
    if(s==="done")return;
    if(s==="visiting"){
      const at=stack.indexOf(name);const cycle=[...stack.slice(at>=0?at:0),name];
      throw new ProjectError(`module import cycle: ${cycle.join(" -> ")}`);
    }

    state.set(name,"visiting");stack.push(name);
    const source=readSource(fileAbs,sourceProvider);
    const parsed=parseSource(source);
    const node:ProjectModuleSource={name,filePath:fileAbs,source,sourceSha256:sha256Text(source),imports:[...parsed.imports]};
    nodes.set(name,node);
    for(const imported of node.imports){
      const importedPath=resolveModuleFileWithProvider(imported,sourceRoots,sourceProvider);
      visit(imported,importedPath);
    }
    stack.pop();state.set(name,"done");order.push(node);
  };

  visit(entry,entryPath);
  return{root,entry,sourceRoots:[...sourceRoots],modules:order};
}


/** Build a complete project graph, including disconnected modules, for editor/workspace indexing.
 * Language semantics still come from the compiler/frontend; this layer only resolves sources/imports. */
export function buildWorkspaceGraph(projectRoot:string,options:WorkspaceGraphOptions={}):ProjectWorkspaceGraph{
  const root=path.resolve(projectRoot);
  const cfg=loadProjectConfig(root);
  const sourceRoots=resolveSourceRoots(root,cfg);
  const files=new Map<string,string>();

  for(const sourceRoot of sourceRoots){
    if(!fs.existsSync(sourceRoot))continue;
    for(const file of walkPsFiles(sourceRoot)){
      const name=moduleNameForEntry(file,sourceRoots);
      if(name==="__entry__")continue;
      const previous=files.get(name);
      if(previous&&realPathKey(previous)!==realPathKey(file))throw new ProjectError(`module '${name}' resolves to more than one source file`);
      files.set(name,path.resolve(file));
    }
  }

  for(const extra of options.additionalFiles??[]){
    const file=path.resolve(extra);
    if(path.extname(file)!==".ps"||!isInsideAny(sourceRoots,file))continue;
    const name=moduleNameForEntry(file,sourceRoots);
    if(name==="__entry__")continue;
    const previous=files.get(name);
    if(previous&&normalizeFsKey(previous)!==normalizeFsKey(file))throw new ProjectError(`module '${name}' resolves to more than one source file`);
    files.set(name,file);
  }

  const raw=new Map<string,ProjectModuleSource>();
  for(const [name,filePath] of [...files.entries()].sort(([a],[b])=>a.localeCompare(b))){
    const source=readSource(filePath,options.sourceProvider);
    const parsed=parseSource(source);
    raw.set(name,{name,filePath,source,sourceSha256:sha256Text(source),imports:[...parsed.imports]});
  }

  for(const module of [...raw.values()]){
    for(const imported of module.imports)if(!raw.has(imported)){
      const importedPath=resolveModuleFileWithProvider(imported,sourceRoots,options.sourceProvider);
      const importedName=moduleNameForEntry(importedPath,sourceRoots);
      if(!raw.has(importedName)){
        const source=readSource(importedPath,options.sourceProvider);
        const parsed=parseSource(source);
        raw.set(importedName,{name:importedName,filePath:importedPath,source,sourceSha256:sha256Text(source),imports:[...parsed.imports]});
      }
    }
  }

  const state=new Map<string,"visiting"|"done">();
  const stack:string[]=[];
  const order:ProjectModuleSource[]=[];
  const visit=(name:string):void=>{
    const stateNow=state.get(name);if(stateNow==="done")return;
    if(stateNow==="visiting"){const at=stack.indexOf(name);throw new ProjectError(`module import cycle: ${[...stack.slice(at>=0?at:0),name].join(" -> ")}`);}
    const module=raw.get(name);if(!module)throw new ProjectError(`missing module '${name}'`);
    state.set(name,"visiting");stack.push(name);
    for(const imported of module.imports)visit(imported);
    stack.pop();state.set(name,"done");order.push(module);
  };
  for(const name of [...raw.keys()].sort())visit(name);
  return{root,sourceRoots:[...sourceRoots],modules:order};
}

export function resolveModuleFile(moduleName:string,sourceRoots:string[]):string{
  return resolveModuleFileWithProvider(moduleName,sourceRoots);
}

function resolveModuleFileWithProvider(moduleName:string,sourceRoots:string[],sourceProvider?:ProjectSourceProvider):string{
  validateModuleName(moduleName);
  const rel=moduleName.split(".").join(path.sep)+".ps";
  const matches:string[]=[];
  for(const root of sourceRoots){
    const candidate=path.resolve(root,rel);
    if(!isInsideOrEqual(root,candidate))throw new ProjectError(`module '${moduleName}' escapes configured source root`);
    if(sourceExists(candidate,sourceProvider))matches.push(candidate);
  }
  const unique=[...new Map(matches.map(p=>[normalizeFsKey(p),p])).values()];
  if(unique.length===0)throw new ProjectError(`missing module '${moduleName}' in configured source roots`);
  if(unique.length>1)throw new ProjectError(`ambiguous module '${moduleName}' resolves to: ${unique.join(", ")}`);
  return path.resolve(unique[0]);
}

function readSource(filePath:string,sourceProvider?:ProjectSourceProvider):string{
  const abs=path.resolve(filePath);
  const overlaid=sourceProvider?.(abs);
  if(overlaid!==undefined)return overlaid;
  return fs.readFileSync(abs,"utf8");
}

function sourceExists(filePath:string,sourceProvider?:ProjectSourceProvider):boolean{
  const abs=path.resolve(filePath);
  if(sourceProvider?.(abs)!==undefined)return true;
  return fs.existsSync(abs)&&fs.statSync(abs).isFile();
}

function walkPsFiles(dir:string):string[]{
  const out:string[]=[];
  const stack=[path.resolve(dir)];
  while(stack.length){
    const current=stack.pop()!;
    for(const entry of fs.readdirSync(current,{withFileTypes:true}).sort((a:any,b:any)=>a.name.localeCompare(b.name))){
      const file=path.join(current,entry.name);
      if(entry.isDirectory()){if(!entry.name.startsWith("."))stack.push(file);}
      else if(entry.isFile()&&entry.name.endsWith(".ps"))out.push(file);
    }
  }
  return out.sort();
}

function isInsideAny(roots:readonly string[],file:string):boolean{return roots.some(root=>isInsideOrEqual(root,file));}

function moduleNameForEntry(filePath:string,sourceRoots:string[]):string{
  const matches:string[]=[];
  for(const root of sourceRoots){
    const rel=path.relative(root,filePath);
    if(rel===""||rel.startsWith(`..${path.sep}`)||rel===".."||path.isAbsolute(rel))continue;
    if(path.extname(rel)!==".ps")continue;
    const noExt=rel.slice(0,-3);
    const candidate=noExt.split(path.sep).join(".");
    try{validateModuleName(candidate);matches.push(candidate);}catch{/* entry may be an ad-hoc fixture outside module naming conventions */}
  }
  const unique=[...new Set(matches)];
  if(unique.length>1)throw new ProjectError(`entry source belongs to multiple configured module roots: ${unique.join(", ")}`);
  return unique[0]??"__entry__";
}

function validateModuleName(name:string):void{
  if(!/^[A-Za-z_][A-Za-z0-9_']*(?:\.[A-Za-z_][A-Za-z0-9_']*)*$/.test(name))throw new ProjectError(`invalid module name '${name}'`);
}
function sha256Text(text:string):string{return crypto.createHash("sha256").update(text).digest("hex");}
function normalizeFsKey(p:string):string{return process.platform==="win32"?path.resolve(p).toLowerCase():path.resolve(p);}
function realPathKey(p:string):string{return normalizeFsKey(fs.existsSync(p)?fs.realpathSync(p):p);}
function isInsideOrEqual(parent:string,child:string):boolean{
  const rel=path.relative(path.resolve(parent),path.resolve(child));
  return rel===""||(!rel.startsWith(`..${path.sep}`)&&rel!==".."&&!path.isAbsolute(rel));
}

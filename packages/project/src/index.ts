import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { parseSource } from "@proofscript/parser";

export interface PluginConfigEntry { use:string; options?:unknown; }
export interface ProjectConfig {
  language?:"0.1";
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
  if(cfg.language&&cfg.language!=="0.1")throw new ProjectError(`unsupported ProofScript language ${cfg.language}`);
  if(cfg.semanticBaseline&&cfg.semanticBaseline!=="lean-4.33.1")throw new ProjectError(`semantic baseline mismatch ${cfg.semanticBaseline}`);
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

export function buildModuleGraph(entryFile:string,projectRoot?:string):ProjectModuleGraph{
  const entryPath=path.resolve(entryFile);
  if(!fs.existsSync(entryPath)||!fs.statSync(entryPath).isFile())throw new ProjectError(`entry source file not found: ${entryPath}`);
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
    const source=fs.readFileSync(fileAbs,"utf8");
    const parsed=parseSource(source);
    const node:ProjectModuleSource={name,filePath:fileAbs,source,sourceSha256:sha256Text(source),imports:[...parsed.imports]};
    nodes.set(name,node);
    for(const imported of node.imports){
      const importedPath=resolveModuleFile(imported,sourceRoots);
      visit(imported,importedPath);
    }
    stack.pop();state.set(name,"done");order.push(node);
  };

  visit(entry,entryPath);
  return{root,entry,sourceRoots:[...sourceRoots],modules:order};
}

export function resolveModuleFile(moduleName:string,sourceRoots:string[]):string{
  validateModuleName(moduleName);
  const rel=moduleName.split(".").join(path.sep)+".ps";
  const matches:string[]=[];
  for(const root of sourceRoots){
    const candidate=path.resolve(root,rel);
    if(!isInsideOrEqual(root,candidate))throw new ProjectError(`module '${moduleName}' escapes configured source root`);
    if(fs.existsSync(candidate)&&fs.statSync(candidate).isFile())matches.push(candidate);
  }
  const unique=[...new Map(matches.map(p=>[realPathKey(p),p])).values()];
  if(unique.length===0)throw new ProjectError(`missing module '${moduleName}' in configured source roots`);
  if(unique.length>1)throw new ProjectError(`ambiguous module '${moduleName}' resolves to: ${unique.join(", ")}`);
  return path.resolve(unique[0]);
}

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
function realPathKey(p:string):string{return normalizeFsKey(fs.realpathSync(p));}
function isInsideOrEqual(parent:string,child:string):boolean{
  const rel=path.relative(path.resolve(parent),path.resolve(child));
  return rel===""||(!rel.startsWith(`..${path.sep}`)&&rel!==".."&&!path.isAbsolute(rel));
}

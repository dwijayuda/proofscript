import path from "node:path"; import { createRequire } from "node:module";
import { BackendPlugin, OraclePlugin, PLUGIN_API_VERSION, PluginAPI, ProofScriptPlugin } from "@proofscript/plugin-api";
import { loadProjectConfig } from "@proofscript/project";
export const HOST_CAPABILITIES=Object.freeze(["backend:v1","oracle:v1"]);
export class PluginHost{
  private backends=new Map<string,BackendPlugin>(); private oracles=new Map<string,OraclePlugin>(); readonly loaded:{specifier:string;plugin:ProofScriptPlugin}[]=[];
  private api:PluginAPI=Object.freeze({registerBackend:(b: BackendPlugin)=>{if(this.backends.has(b.name))throw new Error(`duplicate backend ${b.name}`);this.backends.set(b.name,Object.freeze(b));},registerOracle:(o: OraclePlugin)=>{if(this.oracles.has(o.name))throw new Error(`duplicate oracle ${o.name}`);this.oracles.set(o.name,Object.freeze(o));}});
  async load(specifier:string,root:string,options?:unknown){const req=createRequire(path.join(root,"package.json"));const resolved=specifier.startsWith(".")||specifier.startsWith("/")?path.resolve(root,specifier):req.resolve(specifier);const mod=req(resolved);const plugin:ProofScriptPlugin=mod.default??mod.plugin??mod;validatePlugin(plugin,specifier);await plugin.setup(this.api,options);this.loaded.push({specifier,plugin});}
  getBackend(n:string){return this.backends.get(n);} getOracle(n:string){return this.oracles.get(n);}
}
export async function loadConfiguredPlugins(root:string){const host=new PluginHost();const cfg=loadProjectConfig(root);for(const e of cfg.plugins??[])typeof e==="string"?await host.load(e,root):await host.load(e.use,root,e.options);return host;}
function validatePlugin(p:ProofScriptPlugin,s:string){if(!p||typeof p.setup!=="function"||!p.manifest)throw new Error(`invalid ProofScript plugin ${s}`);const m=p.manifest;if(m.pluginApi!==PLUGIN_API_VERSION)throw new Error(`${m.name}: plugin API mismatch`);if(m.proofscriptReference!=="v0.1"||m.semanticBaseline!=="lean-4.33.1")throw new Error(`${m.name}: semantic baseline mismatch`);for(const c of m.requiresHostCapabilities??[])if(!HOST_CAPABILITIES.includes(c))throw new Error(`${m.name}: host capability '${c}' is unsupported`);}

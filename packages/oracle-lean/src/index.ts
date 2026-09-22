import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {CURRENT_PRODUCT_PROFILE,CURRENT_PROOFSCRIPT_REFERENCE,ProofScriptPlugin,OracleResult} from "@proofscript/plugin-api";
import {decodeArtifact} from "@proofscript/kernel-codec";
import {emitLeanArtifact} from "@proofscript/lean-export";
import {stripStandardBootstrap} from "@proofscript/environment";
import {probeLean} from "./lean";

interface LeanOracleOptions { binary?:string; }

const plugin:ProofScriptPlugin={
  manifest:{name:"@proofscript/oracle-lean",version:"0.1.0-dev.0",pluginApi:1,proofscriptReference:CURRENT_PROOFSCRIPT_REFERENCE,productProfile:CURRENT_PRODUCT_PROFILE,coreCompatibility:{proofscriptReference:"v0.1",leanSemanticBaseline:"lean-4.33.1"},kinds:["oracle"],requiresHostCapabilities:["oracle:v1"],logicalContribution:"none"},
  setup(api,options){
    const configured=(options??{}) as LeanOracleOptions;
    if(configured.binary!==undefined&&(typeof configured.binary!=="string"||configured.binary.length===0))throw new Error("@proofscript/oracle-lean option 'binary' must be a non-empty string");
    const binary=configured.binary??process.env.PROOFSCRIPT_LEAN_BIN??"lean";
    api.registerOracle({name:"lean",verify(input):OracleResult{
      let artifact;
      try{artifact=decodeArtifact(input.artifact);}catch(e){return{status:"implementation_error",oracle:"lean",message:`invalid core for oracle: ${e instanceof Error?e.message:String(e)}`};}
      const probe=probeLean(binary);
      if(probe.status!=="accepted")return{status:"unsupported",oracle:"lean",message:probe.message,details:{binary:probe.binary,version:probe.version,commit:probe.commit,output:probe.output}};
      const dir=fs.mkdtempSync(path.join(process.cwd(),".proofscript-lean-oracle-"));const file=path.join(dir,"Generated.lean");
      try{
        const oracleArtifact=stripStandardBootstrap(artifact)??artifact;
        fs.writeFileSync(file,emitLeanArtifact(oracleArtifact));
        const r=spawnSync(binary,[file],{encoding:"utf8"});
        if(r.status===0)return{status:"accepted",oracle:"lean",message:"pinned Lean 4.33.1 accepted generated artifact",details:{binary,version:probe.version,commit:probe.commit}};
        return{status:"rejected",oracle:"lean",message:(r.stderr||r.stdout||"Lean rejected artifact").trim(),details:{binary,version:probe.version,commit:probe.commit,exitCode:r.status}};
      }finally{fs.rmSync(dir,{recursive:true,force:true});}
    }});
  }
};
export=plugin;

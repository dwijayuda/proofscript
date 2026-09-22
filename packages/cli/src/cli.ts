#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { loadStandardBootstrap, stripStandardBootstrap } from "@proofscript/environment";
import { UnsupportedFeature, ResourceExhausted } from "@proofscript/syntax";
import { decodeArtifact } from "@proofscript/kernel-codec";
import { relativeBinding } from "@proofscript/certificates";
import { findProjectRoot } from "@proofscript/project";
import { loadConfiguredPlugins, PluginHost } from "@proofscript/plugin-host";
import { checkProjectFile, runBackend } from "@proofscript/compiler";
import { emitLeanArtifact } from "@proofscript/lean-export";

function usage():never{console.error(`usage:
  psc plugins [--json]
  psc check <file.ps> [--std] [--emit-core <file>] [--json]
  psc build <file.ps> [--std] --target <name> --out <path> [--json]
  psc emit-lean <core.json> [--std] --out <file.lean>
  psc certify <file.ps> [--std] --core <core.json> --out <cert.json>
  psc verify <core-or-cert.json> [--allow-axioms a,b] [--oracle lean] [--lean <path>] [--json]`);process.exit(4);throw new Error("unreachable");}
const opt=(a:string[],n:string)=>{const i=a.indexOf(n);return i>=0?a[i+1]:undefined;};
const has=(a:string[],n:string)=>a.includes(n);

async function main(){
  const args=process.argv.slice(2);const cmd=args.shift();if(!cmd)usage();const json=has(args,"--json");
  try{
    if(cmd==="plugins"){
      const root=findProjectRoot(process.cwd());const host=await loadConfiguredPlugins(root);const rows=host.loaded.map(x=>x.plugin.manifest);
      if(json)console.log(JSON.stringify(rows,null,2));else rows.forEach(m=>console.log(`${m.name}@${m.version} [${m.kinds.join(",")}]`));return;
    }

    if(cmd==="check"||cmd==="build"||cmd==="certify"){
      const file=args[0];if(!file||file.startsWith("--"))usage();
      const prelude=has(args,"--std")?loadStandardBootstrap().artifact:undefined;
      const checked=checkProjectFile(file,{prelude});
      const {artifact,summary}=checked;

      if(cmd==="check"){
        const out=opt(args,"--emit-core");if(out){fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(artifact,null,2)+"\n");}
        if(json)console.log(JSON.stringify({...summary,entryModule:checked.graph.entry,modules:checked.graph.modules.map(m=>m.name)},null,2));
        else console.log(`accepted ${summary.declarations.length}/${summary.declarations.length} declaration(s); assumptions=${summary.assumptions.length}; modules=${checked.graph.modules.length}`);
        return;
      }

      if(cmd==="build"){
        const target=opt(args,"--target"),out=opt(args,"--out");if(!target||!out)usage();
        const root=findProjectRoot(path.dirname(path.resolve(file)));const host=await loadConfiguredPlugins(root);const backend=host.getBackend(target);
        if(!backend)throw new Error(`unsupported backend target '${target}'`);
        const r=await runBackend(backend,summary,path.resolve(file),path.resolve(out));
        if(json)console.log(JSON.stringify({status:"accepted",result:r},null,2));else console.log(`✓ built ${r.target}: ${r.files.join(", ")} (execution correspondence: ${r.executionCorrespondence})`);return;
      }

      const core=opt(args,"--core"),cert=opt(args,"--out");if(!core||!cert)usage();
      fs.mkdirSync(path.dirname(core),{recursive:true});const coreText=JSON.stringify(artifact,null,2)+"\n";fs.writeFileSync(core,coreText);
      const sources=checked.graph.modules.map(m=>({module:m.name,...relativeBinding(cert,m.filePath,m.source)}));
      const c={
        format:"proofscript-certificate",version:2,proofscriptReference:"v0.1",semanticBaseline:"lean-4.33.1",implementationProfile:"K3c-section-vars0",
        checker:{name:"@proofscript/kernel",implementation:"0.1.0-dev.0"},entryModule:checked.graph.entry,sources,
        core:relativeBinding(cert,core,coreText),declarations:summary.declarations,assumptions:summary.assumptions,
      };
      fs.mkdirSync(path.dirname(cert),{recursive:true});fs.writeFileSync(cert,JSON.stringify(c,null,2)+"\n");
      console.log(`✓ certified ${summary.declarations.length} declaration(s) from ${sources.length} module source(s): ${cert}`);return;
    }

    if(cmd==="emit-lean"){
      const file=args[0],out=opt(args,"--out");if(!file||!out)usage();let artifact=decodeArtifact(JSON.parse(fs.readFileSync(file,"utf8")));
      if(has(args,"--std")){const stripped=stripStandardBootstrap(artifact);if(!stripped)throw new Error("artifact does not begin with the exact checked standard bootstrap");artifact=stripped;}
      fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,emitLeanArtifact(artifact));console.log(`✓ emitted Lean artifact: ${out}`);return;
    }

    if(cmd==="verify"){
      const file=args[0];if(!file)usage();const req=createRequire(__filename);const verifierBin=req.resolve("@proofscript/verifier/bin");const va=[verifierBin,file,"--json"];
      const allow=opt(args,"--allow-axioms");if(allow)va.push("--allow-axioms",allow);
      const rr=spawnSync(process.execPath,va,{encoding:"utf8"});let result:any;try{result=JSON.parse(rr.stdout||"{}");}catch{result={status:"implementation_error",message:rr.stderr||rr.stdout};}
      if(rr.status!==0){if(json)console.log(JSON.stringify(result,null,2));else console.error(`${result.status}: ${result.message}`);process.exit(rr.status??4);}
      const oracle=opt(args,"--oracle");
      if(oracle){
        if(oracle!=="lean")throw new Error(`unsupported oracle '${oracle}'`);const host=new PluginHost();const root=findProjectRoot(process.cwd());const leanBinary=opt(args,"--lean");await host.load("@proofscript/oracle-lean",root,leanBinary?{binary:leanBinary}:undefined);
        const raw=JSON.parse(fs.readFileSync(file,"utf8"));let artifactRaw=raw;if(raw?.format==="proofscript-certificate"){const certDir=path.dirname(path.resolve(file));artifactRaw=JSON.parse(fs.readFileSync(path.resolve(certDir,raw.core.path),"utf8"));}
        result.oracle=await host.getOracle("lean")!.verify({artifact:artifactRaw});
      }
      if(json)console.log(JSON.stringify(result,null,2));else{console.log(`✓ independently replayed ${result.declarations} declaration(s); project plugins loaded: no`);if(result.oracle)console.log(`  oracle: ${result.oracle.status} — ${result.oracle.message}`);}return;
    }
    usage();
  }catch(e){
    const msg=e instanceof Error?e.message:String(e);
    const status=e instanceof ResourceExhausted?"resource_exhausted":e instanceof UnsupportedFeature||msg.startsWith("unsupported")?"unsupported":"rejected";
    if(json)console.log(JSON.stringify({status,message:msg},null,2));else console.error(`${status}: ${msg}`);
    process.exit(status==="unsupported"?2:status==="resource_exhausted"?3:1);
  }
}
main();

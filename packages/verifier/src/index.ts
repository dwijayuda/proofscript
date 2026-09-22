import fs from "node:fs";
import { checkCoreDeclarations, KernelError, KernelResourceError } from "@proofscript/kernel";
import { decodeArtifact, ArtifactError, ArtifactResourceError, validateTypeclassMetadataAgainstDeclarations } from "@proofscript/kernel-codec";
import { CertificateResourceError, CertificateV1, CertificateV2, decodeCertificate, resolveBinding } from "@proofscript/certificates";

export type VerifyStatus="accepted"|"rejected"|"unsupported"|"resource_exhausted"|"implementation_error";
export interface VerifyResult{status:VerifyStatus;declarations?:number;assumptions?:string[];message?:string;projectPluginsLoaded:false;}

const MAX_VERIFY_FILE_BYTES=64*1024*1024;

export function verifyFile(filename:string,allowedAxioms=new Set<string>()):VerifyResult{
  try{
    if(fs.statSync(filename).size>MAX_VERIFY_FILE_BYTES)return{status:"resource_exhausted",message:"verification input file-size resource limit exceeded",projectPluginsLoaded:false};
    const raw=JSON.parse(fs.readFileSync(filename,"utf8"));
    let artifact;
    let cert:CertificateV1|CertificateV2|undefined;
    if(raw?.format==="proofscript-certificate"){
      cert=decodeCertificate(raw);
      const core=resolveBinding(filename,cert.core,MAX_VERIFY_FILE_BYTES);
      if(core.sha256!==cert.core.sha256)return reject("certificate core hash mismatch");
      artifact=decodeArtifact(JSON.parse(core.text));
      if(cert.version===1){
        const source=resolveBinding(filename,cert.source,MAX_VERIFY_FILE_BYTES);
        if(source.sha256!==cert.source.sha256)return reject("certificate source hash mismatch");
      }else{
        const bindingError=verifyV2Sources(filename,cert,artifact.modules);
        if(bindingError)return reject(bindingError);
      }
    }else artifact=decodeArtifact(raw);

    validateTypeclassMetadataAgainstDeclarations(artifact);
    const summary=checkCoreDeclarations(artifact.declarations,artifact.implementationProfile);
    if(summary.status!=="accepted")return{status:summary.status,message:summary.message,projectPluginsLoaded:false};
    const bad=summary.assumptions.filter(a=>!allowedAxioms.has(a));
    if(bad.length)return reject(`unapproved axiom/assumption(s): ${bad.join(", ")}`);
    if(cert){
      if(JSON.stringify(cert.declarations)!==JSON.stringify(summary.declarations))return reject("certificate declaration claim mismatch");
      if(JSON.stringify(cert.assumptions)!==JSON.stringify(summary.assumptions))return reject("certificate assumption claim mismatch");
    }
    return{status:"accepted",declarations:summary.declarations.length,assumptions:summary.assumptions,projectPluginsLoaded:false};
  }catch(e){
    const message=e instanceof Error?e.message:String(e);
    if(e instanceof ArtifactResourceError||e instanceof KernelResourceError||e instanceof CertificateResourceError)return{status:"resource_exhausted",message,projectPluginsLoaded:false};
    // Historical artifacts predate typed resource errors; preserve their existing
    // resource classification while v68 no longer depends on message matching.
    if((e instanceof ArtifactError||e instanceof KernelError)&&/(resource limit|recursion limit|nesting depth|too many declarations)/i.test(message))return{status:"resource_exhausted",message,projectPluginsLoaded:false};
    if(e instanceof ArtifactError||e instanceof KernelError||e instanceof SyntaxError||(e instanceof Error&&"code" in e))return{status:"rejected",message,projectPluginsLoaded:false};
    return{status:"implementation_error",message,projectPluginsLoaded:false};
  }
}

function verifyV2Sources(certPath:string,cert:CertificateV2,modules:ReturnType<typeof decodeArtifact>["modules"]):string|undefined{
  if(!modules)return "certificate v2 requires module metadata in the Core artifact";
  if(cert.entryModule!==modules.entry)return "certificate entry module does not match Core artifact";
  const artifactByName=new Map(modules.modules.map(m=>[m.name,m] as const));
  const certNames=new Set(cert.sources.map(s=>s.module));
  if(certNames.size!==artifactByName.size||[...artifactByName.keys()].some(name=>!certNames.has(name)))return "certificate module set does not match Core artifact";
  for(const sourceBinding of cert.sources){
    const artifactModule=artifactByName.get(sourceBinding.module);
    if(!artifactModule)return `certificate source module '${sourceBinding.module}' is absent from Core artifact`;
    const source=resolveBinding(certPath,sourceBinding,MAX_VERIFY_FILE_BYTES);
    if(source.sha256!==sourceBinding.sha256)return `certificate source hash mismatch for module '${sourceBinding.module}'`;
    if(sourceBinding.sha256!==artifactModule.sourceSha256)return `certificate/Core source hash mismatch for module '${sourceBinding.module}'`;
  }
  return undefined;
}
function reject(message:string):VerifyResult{return{status:"rejected",message,projectPluginsLoaded:false};}

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export interface DeclarationClaim {
  name: string;
  kind: string;
  universes: string[];
  type: string;
  generated: string[];
  assumptions: string[];
}

export type HistoricalCertificateImplementationProfile =
  | "K1d-foundation0" | "K2a-bindings0" | "K2b-transparency0" | "K2c-structures-match0"
  | "K2d-structural-recursion0" | "K2e-equation-clauses0" | "K2f-patterns0" | "K2g-structure-instances0"
  | "K2h-structure-update0" | "K2i-literals0" | "K2j-equality0" | "K2k-binder-info0"
  | "K2l-implicit-synthesis0" | "K2m-unification0" | "K2n-typeclass-env0" | "K2o-instance-search0"
  | "K2p-parameterized-typeclasses0" | "K2q-polymorphic-instances0" | "K2r-recursive-instance-search0";

export interface CertificateV1 {
  format: "proofscript-certificate";
  version: 1;
  proofscriptReference: "v0.1";
  semanticBaseline: "lean-4.33.1";
  implementationProfile: HistoricalCertificateImplementationProfile;
  checker: { name: "@proofscript/kernel"; implementation: string };
  source: { path: string; sha256: string };
  core: { path: string; sha256: string };
  declarations: DeclarationClaim[];
  assumptions: string[];
}

export interface CertificateSourceBinding { module:string; path:string; sha256:string; }
export interface CertificateV2 {
  format:"proofscript-certificate";
  version:2;
  proofscriptReference:"v0.1";
  semanticBaseline:"lean-4.33.1";
  implementationProfile:"K3a-modules0"|"K3b-module-interfaces0"|"K3c-names0"|"K3c-sections-open0"|"K3c-section-vars0";
  checker:{name:"@proofscript/kernel";implementation:string};
  entryModule:string;
  sources:CertificateSourceBinding[];
  core:{path:string;sha256:string};
  declarations:DeclarationClaim[];
  assumptions:string[];
}
export type Certificate=CertificateV1|CertificateV2;

export function sha256Bytes(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function relativeBinding(certPath: string, targetPath: string, text: string): { path: string; sha256: string } {
  return {
    path: path.relative(path.dirname(path.resolve(certPath)), path.resolve(targetPath)) || ".",
    sha256: sha256Bytes(text),
  };
}

export class CertificateResourceError extends Error { readonly code:string; constructor(message:string,code="certificate_resource_limit"){super(message);this.name="CertificateResourceError";this.code=code;} }

export function resolveBinding(certPath: string, binding: { path: string; sha256: string }, maxBytes?:number): { path: string; text: string; sha256: string } {
  const p = path.resolve(path.dirname(path.resolve(certPath)), binding.path);
  if(maxBytes!==undefined&&fs.statSync(p).size>maxBytes)throw new CertificateResourceError("certificate binding file-size resource limit exceeded","binding_file_bytes");
  const text = fs.readFileSync(p, "utf8");
  return { path: p, text, sha256: sha256Bytes(text) };
}

export function decodeCertificate(v: unknown): Certificate {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("certificate root must be an object");
  const x = v as any;
  if (x.format !== "proofscript-certificate") throw new Error("unsupported certificate format/version");
  if (x.proofscriptReference !== "v0.1" || x.semanticBaseline !== "lean-4.33.1") throw new Error("certificate semantic baseline/profile mismatch");
  validateChecker(x.checker);
  if(!Array.isArray(x.declarations)||!Array.isArray(x.assumptions)||!x.assumptions.every((a:unknown)=>typeof a==="string"))throw new Error("invalid certificate claims");
  validateBinding(x.core,"core");

  if(x.version===1){
    const profiles=new Set<HistoricalCertificateImplementationProfile>([
      "K1d-foundation0","K2a-bindings0","K2b-transparency0","K2c-structures-match0","K2d-structural-recursion0","K2e-equation-clauses0","K2f-patterns0","K2g-structure-instances0","K2h-structure-update0","K2i-literals0","K2j-equality0","K2k-binder-info0","K2l-implicit-synthesis0","K2m-unification0","K2n-typeclass-env0","K2o-instance-search0","K2p-parameterized-typeclasses0","K2q-polymorphic-instances0","K2r-recursive-instance-search0",
    ]);
    if(!profiles.has(x.implementationProfile))throw new Error("certificate semantic baseline/profile mismatch");
    validateBinding(x.source,"source");
    return x as CertificateV1;
  }

  if(x.version===2){
    if(x.implementationProfile!=="K3a-modules0"&&x.implementationProfile!=="K3b-module-interfaces0"&&x.implementationProfile!=="K3c-names0"&&x.implementationProfile!=="K3c-sections-open0"&&x.implementationProfile!=="K3c-section-vars0")throw new Error("certificate semantic baseline/profile mismatch");
    if(typeof x.entryModule!=="string"||!validModuleName(x.entryModule))throw new Error("invalid certificate entryModule");
    if(!Array.isArray(x.sources)||x.sources.length===0)throw new Error("certificate v2 requires non-empty sources");
    const modules=new Set<string>();
    for(let i=0;i<x.sources.length;i++){
      const s=x.sources[i];if(!s||typeof s!=="object"||typeof s.module!=="string"||!validModuleName(s.module))throw new Error(`invalid sources[${i}].module`);
      if(modules.has(s.module))throw new Error(`duplicate certificate source module '${s.module}'`);modules.add(s.module);validateBinding(s,`sources[${i}]`);
    }
    if(!modules.has(x.entryModule))throw new Error("certificate entryModule is not present in sources");
    return x as CertificateV2;
  }
  throw new Error("unsupported certificate format/version");
}

function validateChecker(x:any):void{if(!x||x.name!=="@proofscript/kernel"||typeof x.implementation!=="string")throw new Error("invalid certificate checker identity");}
function validateBinding(x:any,label:string):void{if(!x||typeof x.path!=="string"||x.path.length===0||typeof x.sha256!=="string"||!/^[0-9a-f]{64}$/.test(x.sha256))throw new Error(`invalid ${label} binding`);}
function validModuleName(name:string):boolean{return /^[A-Za-z_][A-Za-z0-9_']*(?:\.[A-Za-z_][A-Za-z0-9_']*)*$/.test(name);}

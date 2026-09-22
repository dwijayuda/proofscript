import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {finalizeModuleMetadata} from "../packages/kernel-codec/dist/index.js";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const cli=path.join(root,"packages/cli/dist/cli.js");
const base=path.join(root,"artifacts/test/k3b-module-interfaces");
fs.rmSync(base,{recursive:true,force:true});fs.mkdirSync(base,{recursive:true});

function run(args,expect=0,cwd=root){
  const r=spawnSync(process.execPath,[cli,...args],{cwd,encoding:"utf8"});
  if(r.status!==expect){console.error(r.stdout);console.error(r.stderr);throw new Error(`${args.join(" ")} expected ${expect}, got ${r.status}`);}
  return r;
}
function write(p,text){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,text);}
function project(name,config='module.exports={language:"0.1",semanticBaseline:"lean-4.33.1",sourceRoots:["src"]};\n'){
  const p=path.join(base,name);fs.mkdirSync(p,{recursive:true});
  write(path.join(p,"package.json"),JSON.stringify({name:`k3b-${name}`,private:true},null,2)+"\n");
  write(path.join(p,"proofscript.config.cts"),config);
  return p;
}

// Positive diamond: Common is imported transitively by A and B and must appear once.
const diamond=project("diamond",'module.exports={language:"0.1",semanticBaseline:"lean-4.33.1",sourceRoots:["src"],plugins:["this-plugin-must-never-load-during-verify"]};\n');
write(path.join(diamond,"src/Lib/Common.ps"),`def sharedZero: Nat := {\n  0\n}\n`);
write(path.join(diamond,"src/Lib/A.ps"),`import Lib.Common;\n\ndef aZero: Nat := {\n  sharedZero\n}\n`);
write(path.join(diamond,"src/Lib/B.ps"),`import Lib.Common;\n\ndef bZero: Nat := {\n  sharedZero\n}\n`);
write(path.join(diamond,"src/Main.ps"),`import Lib.A;\nimport Lib.B;\n\ndef mainZero: Nat := {\n  aZero\n}\n\ndef mainZeroB: Nat := {\n  bZero\n}\n`);
fs.mkdirSync(path.join(diamond,"proof"),{recursive:true});
run(["check","src/Main.ps","--std","--emit-core","proof/Main.pscore.json"],0,diamond);
const firstText=fs.readFileSync(path.join(diamond,"proof/Main.pscore.json"),"utf8");
run(["check","src/Main.ps","--std","--emit-core","proof/Main2.pscore.json"],0,diamond);
assert.equal(fs.readFileSync(path.join(diamond,"proof/Main2.pscore.json"),"utf8"),firstText,"module artifact must be deterministic across repeated checks");
const artifact=JSON.parse(firstText);
assert.equal(artifact.formatVersion,12);assert.equal(artifact.implementationProfile,"K3c-section-vars0");
assert.equal(artifact.modules.entry,"Main");
assert.equal(artifact.modules.interfaceFormatVersion,1);assert.equal(artifact.modules.cacheKeyFormatVersion,1);
assert.match(artifact.modules.baseEnvironmentSha256,/^[0-9a-f]{64}$/);
assert.deepEqual(artifact.modules.modules.map(m=>m.name),["Lib.Common","Lib.A","Lib.B","Main"]);
assert.deepEqual(artifact.modules.modules.map(m=>m.declarations),[["sharedZero"],["aZero"],["bZero"],["mainZero","mainZeroB"]]);
assert.deepEqual(artifact.modules.modules.map(m=>m.exports),artifact.modules.modules.map(m=>m.declarations),"K3b exports every owned declaration until private visibility exists");
assert.equal(artifact.modules.modules.filter(m=>m.name==="Lib.Common").length,1,"diamond dependency must be deduplicated");
const byName=new Map(artifact.modules.modules.map(m=>[m.name,m]));
assert.deepEqual(byName.get("Main").imports.map(i=>[i.module,i.mode]),[["Lib.A","plain"],["Lib.B","plain"]]);
assert.deepEqual(byName.get("Lib.A").imports.map(i=>i.module),["Lib.Common"]);
for(const m of artifact.modules.modules){assert.match(m.sourceSha256,/^[0-9a-f]{64}$/);assert.match(m.interfaceSha256,/^[0-9a-f]{64}$/);assert.match(m.cacheKeySha256,/^[0-9a-f]{64}$/);for(const i of m.imports)assert.match(i.interfaceSha256,/^[0-9a-f]{64}$/);}
assert.equal(byName.get("Lib.A").imports[0].interfaceSha256,byName.get("Lib.Common").interfaceSha256);
assert.equal(byName.get("Lib.B").imports[0].interfaceSha256,byName.get("Lib.Common").interfaceSha256);
// Historical v12/K3b cache keys remain profile-bound and replayable after K3c becomes current.
const legacyBuild={entry:artifact.modules.entry,modules:artifact.modules.modules.map(m=>({name:m.name,sourceSha256:m.sourceSha256,imports:m.imports.map(i=>i.module),declarations:[...m.declarations]}))};
const legacyK3b={...structuredClone(artifact),implementationProfile:"K3b-module-interfaces0",modules:finalizeModuleMetadata(legacyBuild,artifact.declarations,artifact.typeclasses,"K3b-module-interfaces0")};
write(path.join(diamond,"proof/HistoricalK3bV12.pscore.json"),JSON.stringify(legacyK3b,null,2)+"\n");
run(["verify","proof/HistoricalK3bV12.pscore.json"],0,diamond);
const legacyK3cNames={...structuredClone(artifact),implementationProfile:"K3c-names0",modules:finalizeModuleMetadata({entry:artifact.modules.entry,modules:artifact.modules.modules.map(m=>({name:m.name,sourcePath:m.sourcePath,sourceSha256:m.sourceSha256,imports:m.imports.map(i=>i.module),declarations:[...m.declarations]}))},artifact.declarations,artifact.typeclasses,"K3c-names0")};
write(path.join(diamond,"proof/HistoricalK3cNamesV12.pscore.json"),JSON.stringify(legacyK3cNames,null,2)+"\n");
run(["verify","proof/HistoricalK3cNamesV12.pscore.json"],0,diamond);
const legacyK3cSections={...structuredClone(artifact),implementationProfile:"K3c-sections-open0",modules:finalizeModuleMetadata({entry:artifact.modules.entry,modules:artifact.modules.modules.map(m=>({name:m.name,sourcePath:m.sourcePath,sourceSha256:m.sourceSha256,imports:m.imports.map(i=>i.module),declarations:[...m.declarations]}))},artifact.declarations,artifact.typeclasses,"K3c-sections-open0")};
write(path.join(diamond,"proof/HistoricalK3cSectionsV12.pscore.json"),JSON.stringify(legacyK3cSections,null,2)+"\n");
run(["verify","proof/HistoricalK3cSectionsV12.pscore.json"],0,diamond);


run(["verify","proof/Main.pscore.json"],0,diamond);
run(["certify","src/Main.ps","--std","--core","proof/Main.pscore.json","--out","proof/Main.pscert.json"],0,diamond);
const cert=JSON.parse(fs.readFileSync(path.join(diamond,"proof/Main.pscert.json"),"utf8"));
assert.equal(cert.version,2);assert.equal(cert.implementationProfile,"K3c-section-vars0");assert.equal(cert.entryModule,"Main");
assert.deepEqual(cert.sources.map(s=>s.module),["Lib.Common","Lib.A","Lib.B","Main"]);
const verified=JSON.parse(run(["verify","proof/Main.pscert.json","--json"],0,diamond).stdout);
assert.equal(verified.status,"accepted");assert.equal(verified.projectPluginsLoaded,false);
run(["emit-lean","proof/Main.pscore.json","--std","--out","proof/Main.lean"],0,diamond);
const lean=fs.readFileSync(path.join(diamond,"proof/Main.lean"),"utf8");assert.match(lean,/def sharedZero : _root_\.Nat/);assert.match(lean,/def mainZeroB : _root_\.Nat/);

// Interface identity is semantic while cache identity also commits to exact source bytes.
fs.appendFileSync(path.join(diamond,"src/Lib/Common.ps"),"\n-- comment-only cache-key change\n");
run(["check","src/Main.ps","--std","--emit-core","proof/CommentOnly.pscore.json"],0,diamond);
const commentOnly=JSON.parse(fs.readFileSync(path.join(diamond,"proof/CommentOnly.pscore.json"),"utf8"));
const commentByName=new Map(commentOnly.modules.modules.map(m=>[m.name,m]));
assert.notEqual(commentByName.get("Lib.Common").sourceSha256,byName.get("Lib.Common").sourceSha256);
assert.notEqual(commentByName.get("Lib.Common").cacheKeySha256,byName.get("Lib.Common").cacheKeySha256);
for(const name of ["Lib.Common","Lib.A","Lib.B","Main"])assert.equal(commentByName.get(name).interfaceSha256,byName.get(name).interfaceSha256,`comment-only change must preserve ${name} interface`);
for(const name of ["Lib.A","Lib.B","Main"])assert.equal(commentByName.get(name).cacheKeySha256,byName.get(name).cacheKeySha256,`unchanged downstream source/dependency interface must preserve ${name} cache identity`);
write(path.join(diamond,"src/Lib/Common.ps"),`def sharedZero: Nat := {\n  1\n}\n`);
run(["check","src/Main.ps","--std","--emit-core","proof/SemanticChange.pscore.json"],0,diamond);
const semantic=JSON.parse(fs.readFileSync(path.join(diamond,"proof/SemanticChange.pscore.json"),"utf8"));const semanticByName=new Map(semantic.modules.modules.map(m=>[m.name,m]));
for(const name of ["Lib.Common","Lib.A","Lib.B","Main"]){assert.notEqual(semanticByName.get(name).interfaceSha256,byName.get(name).interfaceSha256,`semantic dependency change must propagate into ${name} interface`);assert.notEqual(semanticByName.get(name).cacheKeySha256,byName.get(name).cacheKeySha256,`semantic dependency change must invalidate ${name} cache identity`);}
write(path.join(diamond,"src/Lib/Common.ps"),`def sharedZero: Nat := {\n  0\n}\n`);

// A certificate binds every transitive source; changing an imported file is fatal.
fs.appendFileSync(path.join(diamond,"src/Lib/Common.ps"),"\n-- tampered after certification\n");
const tamperSource=run(["verify","proof/Main.pscert.json","--json"],1,diamond);assert.match(tamperSource.stdout,/source hash mismatch for module 'Lib\.Common'/);
// Restore exact bytes for certificate-metadata tests.
write(path.join(diamond,"src/Lib/Common.ps"),`def sharedZero: Nat := {\n  0\n}\n`);

const certMissing=structuredClone(cert);certMissing.sources=certMissing.sources.filter(s=>s.module!=="Lib.B");
write(path.join(diamond,"proof/CertMissingSource.json"),JSON.stringify(certMissing,null,2)+"\n");
assert.match(run(["verify","proof/CertMissingSource.json","--json"],1,diamond).stdout,/module set does not match Core artifact/);

// v12 module/interface metadata is inert to kernel typing but strictly replay-validated.
const badHash=structuredClone(artifact);badHash.modules.modules[0].sourceSha256="bad";
write(path.join(diamond,"proof/BadHash.pscore.json"),JSON.stringify(badHash,null,2)+"\n");assert.match(run(["verify","proof/BadHash.pscore.json","--json"],1,diamond).stdout,/sourceSha256 invalid/);
const badOwner=structuredClone(artifact);badOwner.modules.modules[1].declarations.push("sharedZero");
write(path.join(diamond,"proof/BadOwner.pscore.json"),JSON.stringify(badOwner,null,2)+"\n");assert.match(run(["verify","proof/BadOwner.pscore.json","--json"],1,diamond).stdout,/owned by both/);
const badExport=structuredClone(artifact);badExport.modules.modules[1].exports=[];
write(path.join(diamond,"proof/BadExport.pscore.json"),JSON.stringify(badExport,null,2)+"\n");assert.match(run(["verify","proof/BadExport.pscore.json","--json"],1,diamond).stdout,/exports mismatch/);
const badInterface=structuredClone(artifact);badInterface.modules.modules[0].interfaceSha256="0".repeat(64);
write(path.join(diamond,"proof/BadInterface.pscore.json"),JSON.stringify(badInterface,null,2)+"\n");assert.match(run(["verify","proof/BadInterface.pscore.json","--json"],1,diamond).stdout,/interfaceSha256 mismatch/);
const badCache=structuredClone(artifact);badCache.modules.modules[0].cacheKeySha256="0".repeat(64);
write(path.join(diamond,"proof/BadCache.pscore.json"),JSON.stringify(badCache,null,2)+"\n");assert.match(run(["verify","proof/BadCache.pscore.json","--json"],1,diamond).stdout,/cacheKeySha256 mismatch/);
const badBase=structuredClone(artifact);badBase.modules.baseEnvironmentSha256="0".repeat(64);
write(path.join(diamond,"proof/BadBase.pscore.json"),JSON.stringify(badBase,null,2)+"\n");assert.match(run(["verify","proof/BadBase.pscore.json","--json"],1,diamond).stdout,/baseEnvironmentSha256 mismatch/);
const badEdge=structuredClone(artifact);badEdge.modules.modules.find(m=>m.name==="Lib.A").imports[0].interfaceSha256="0".repeat(64);
write(path.join(diamond,"proof/BadEdge.pscore.json"),JSON.stringify(badEdge,null,2)+"\n");assert.match(run(["verify","proof/BadEdge.pscore.json","--json"],1,diamond).stdout,/imports interface binding mismatch/);
const badImport=structuredClone(artifact);badImport.modules.modules[0].imports=[{module:"Does.Not.Exist",mode:"plain",interfaceSha256:"0".repeat(64)}];
write(path.join(diamond,"proof/BadImport.pscore.json"),JSON.stringify(badImport,null,2)+"\n");assert.match(run(["verify","proof/BadImport.pscore.json","--json"],1,diamond).stdout,/imports missing module/);
const badCycle=structuredClone(artifact);badCycle.modules.modules[0].imports=[{module:"Main",mode:"plain",interfaceSha256:byName.get("Main").interfaceSha256}];
write(path.join(diamond,"proof/BadCycle.pscore.json"),JSON.stringify(badCycle,null,2)+"\n");assert.match(run(["verify","proof/BadCycle.pscore.json","--json"],1,diamond).stdout,/module metadata cycle/);

// A raw historical v11/K3a artifact remains replayable and is upgraded to validated K3b interface metadata on decode.
const legacyV11={...structuredClone(artifact),formatVersion:11,implementationProfile:"K3a-modules0",modules:{entry:artifact.modules.entry,modules:artifact.modules.modules.map(m=>({name:m.name,sourceSha256:m.sourceSha256,imports:m.imports.map(i=>i.module),declarations:[...m.declarations]}))}};
write(path.join(diamond,"proof/HistoricalK3aV11.pscore.json"),JSON.stringify(legacyV11,null,2)+"\n");run(["verify","proof/HistoricalK3aV11.pscore.json"],0,diamond);

// Missing modules are rejected rather than silently treated as unsupported declarations.
const missing=project("missing");write(path.join(missing,"src/Main.ps"),`import Missing.Module;\ndef mainZero: Nat := { 0 }\n`);
assert.match(run(["check","src/Main.ps","--std"],1,missing).stderr,/missing module 'Missing\.Module'/);

// Cycles are rejected with a concrete cycle path.
const cycle=project("cycle");write(path.join(cycle,"src/A.ps"),`import B;\ndef a: Nat := { 0 }\n`);write(path.join(cycle,"src/B.ps"),`import A;\ndef b: Nat := { 0 }\n`);
assert.match(run(["check","src/A.ps","--std"],1,cycle).stderr,/module import cycle: A -> B -> A/);

// Import resolution refuses ambiguity across configured source roots.
const ambiguous=project("ambiguous",'module.exports={language:"0.1",semanticBaseline:"lean-4.33.1",sourceRoots:["src1","src2"]};\n');
write(path.join(ambiguous,"src1/Main.ps"),`import Lib.X;\ndef mainZero: Nat := { xZero }\n`);write(path.join(ambiguous,"src1/Lib/X.ps"),`def xZero: Nat := { 0 }\n`);write(path.join(ambiguous,"src2/Lib/X.ps"),`def xZero2: Nat := { 0 }\n`);
assert.match(run(["check","src1/Main.ps","--std"],1,ambiguous).stderr,/ambiguous module 'Lib\.X'/);

// Sibling isolation: A cannot see B merely because Main imports both.
const siblings=project("siblings");write(path.join(siblings,"src/Common.ps"),`def commonZero: Nat := { 0 }\n`);write(path.join(siblings,"src/A.ps"),`import Common;\ndef aZero: Nat := { bZero }\n`);write(path.join(siblings,"src/B.ps"),`import Common;\ndef bZero: Nat := { commonZero }\n`);write(path.join(siblings,"src/Main.ps"),`import A;\nimport B;\ndef mainZero: Nat := { bZero }\n`);
assert.match(run(["check","src/Main.ps","--std"],1,siblings).stderr,/unknown identifier: bZero/);

// Imports are header-only. Richer import forms remain explicitly unsupported.
const late=project("late");write(path.join(late,"src/Lib.ps"),`def libZero: Nat := { 0 }\n`);write(path.join(late,"src/Main.ps"),`def early: Nat := { 0 }\nimport Lib;\n`);
assert.match(run(["check","src/Main.ps","--std"],1,late).stderr,/import declarations must appear before all non-import commands/);
const allImport=project("import-all");write(path.join(allImport,"src/Main.ps"),`import all;\ndef x: Nat := { 0 }\n`);assert.match(run(["check","src/Main.ps","--std"],2,allImport).stderr,/does not implement 'import all'/);
const publicImport=project("public-import");write(path.join(publicImport,"src/Main.ps"),`public import Lib;\n`);assert.equal(run(["check","src/Main.ps","--std"],2,publicImport).status,2);

// Historical certificate v1 remains independently replayable.
run(["verify","tests/fixtures/cert-v1/proof/Main.pscert.json"],0,root);

console.log("✓ K3b module-interface fingerprints, deterministic cache identities, semantic-change propagation, v12 replay validation, K3a/v11 compatibility, certificate-v2 source binding, plugin-free replay, and module isolation passed");

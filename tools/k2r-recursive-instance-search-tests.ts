import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const cli=path.join(root,"packages/cli/dist/cli.js");
const out=path.join(root,"artifacts/test/k2r-recursive-instance-search.pscore.json");
const lean=path.join(root,"artifacts/test/k2r-recursive-instance-search.lean");
function run(args,expect=0){const r=spawnSync(process.execPath,[cli,...args],{cwd:root,encoding:"utf8"});if(r.status!==expect){console.error(r.stdout,r.stderr);throw new Error(`${args.join(" ")} expected ${expect}, got ${r.status}`);}return r;}
run(["check","tests/conformance/positive/k2r-recursive-instance-search.ps","--std","--emit-core",out]);
const artifact=JSON.parse(fs.readFileSync(out,"utf8"));
assert.equal(artifact.formatVersion,12);assert.equal(artifact.implementationProfile,"K3c-section-vars0");
const auto=artifact.declarations.find(d=>d.name==="automaticBoxTag");assert(auto&&auto.kind==="definition");const autoJson=JSON.stringify(auto.value);assert.match(autoJson,/boxMarker/);assert.match(autoJson,/natMarker/);assert.match(autoJson,/Nat/);
const box=artifact.declarations.find(d=>d.name==="boxMarker");assert(box&&box.kind==="definition");assert.equal(box.type.tag,"pi");assert.equal(box.type.binderInfo,"implicit");assert.equal(box.type.body.tag,"pi");assert.equal(box.type.body.binderInfo,"instImplicit");
run(["verify",out]);run(["emit-lean",out,"--std","--out",lean]);const lt=fs.readFileSync(lean,"utf8");assert.match(lt,/@_root_\.boxMarker _root_\.Nat _root_\.natMarker/);assert.match(lt,/\[x1 : \(@_root_\.Marker x0\)\]/);
const cyc=run(["check","tests/conformance/negative/k2r-instance-search-cycle.ps","--std"],1);assert.match(cyc.stderr,/failed to synthesize instance/);
const dep=run(["check","tests/conformance/negative/k2r-dependent-instance-target.ps","--std"],2);assert.match(dep.stderr,/depend on prerequisite values/);
// Exact depth boundary: 15 recursive wrappers succeeds; 16 exhausts the search budget.
const mkDepth=(n)=>{let t="Nat";for(let i=0;i<n;i++)t=`Box(${t})`;return t;};
const prefix=`inductive Box(A: Type): Type {\n  | mk(x: A);\n}\nclass Marker(A: Type) {\n  tag: Nat;\n}\ninstance natMarker: Marker(Nat) := { tag := 0 };\ninstance {A: Type} [m: Marker(A)] boxMarker: Marker(Box(A)) := { tag := Marker.tag(A, m) };\n`;
for(const [depth,expect] of [[15,0],[16,3]]){const f=path.join(root,`artifacts/test/k2r-depth-${depth}.ps`);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,prefix+`def need[m: Marker(${mkDepth(depth)})](n: Nat): Nat := { 0 }\ndef result: Nat := { need(0) }\n`);const rr=run(["check",f,"--std"],expect);if(expect===3)assert.match(rr.stderr,/resource_exhausted: instance search depth limit/);}
const tampered=structuredClone(artifact);const td=tampered.declarations.find(d=>d.name==="boxMarker");td.type.body.binderInfo="explicit";const bad=path.join(root,"artifacts/test/k2r-tampered.pscore.json");fs.writeFileSync(bad,JSON.stringify(tampered,null,2));run(["verify",bad],1);
console.log("✓ K2r bounded recursive global instance prerequisites, cycle guard, depth resource limit, explicit Core insertion, strict replay, and Lean emission passed");

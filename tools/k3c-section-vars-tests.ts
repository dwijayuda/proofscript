import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const cli=path.join(root,"packages/cli/dist/cli.js");
const lean=process.env.PROOFSCRIPT_LEAN_BIN||"/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lean";
const base=path.join(root,"artifacts/test/k3c-section-vars");
fs.rmSync(base,{recursive:true,force:true});fs.mkdirSync(base,{recursive:true});
const write=(p,s)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s)};
function run(args,expect=0,cwd=base){const r=spawnSync(process.execPath,[cli,...args],{cwd,encoding:"utf8",env:{...process.env,PROOFSCRIPT_LEAN_BIN:lean}});if(r.status!==expect){console.error(r.stdout,r.stderr);throw new Error(`${args.join(" ")} expected ${expect}, got ${r.status}`);}return r;}
function binders(term){const out=[];let cur=term;while(cur?.tag==="pi"){out.push(cur.binderInfo??"explicit");cur=cur.body;}return out;}
function decl(artifact,name){const d=artifact.declarations.find(x=>x.name===name);assert(d,`missing declaration ${name}`);return d;}

write(path.join(base,"Main.ps"),`section {
  variable {A: Type};
  variable (x: A);
  variable (unused: Nat);
  def keep: A := { x }
  def noCapture: Nat := { 0 }
  theorem headerUse: x = x := Eq.refl.{1}(A, x);
}
section {
  variable {A: Type};
  variable (x: A);
  include x;
  theorem forced: 0 = 0 := Eq.refl.{1}(Nat, 0);
}
section {
  variable (n: Nat);
  omit n;
  def omitDoesNotAffectDef: Nat := { n }
}
section {
  variable (n: Nat);
  include n;
  section Inner {
    omit n;
    theorem inner: 0 = 0 := Eq.refl.{1}(Nat, 0);
  }
  theorem outer: 0 = 0 := Eq.refl.{1}(Nat, 0);
}
section {
  variable (x: Nat);
  def shadow(x: Bool): Bool := { x }
}
`);
run(["check","Main.ps","--std","--emit-core","Main.pscore.json","--json"]);
const art=JSON.parse(fs.readFileSync(path.join(base,"Main.pscore.json"),"utf8"));
assert.deepEqual(binders(decl(art,"keep").type),["implicit","explicit"]);
assert.deepEqual(binders(decl(art,"noCapture").type),[]);
assert.deepEqual(binders(decl(art,"headerUse").type),["implicit","explicit"]);
assert.deepEqual(binders(decl(art,"forced").type),["implicit","explicit"],"include x must close dependency A before x");
assert.deepEqual(binders(decl(art,"omitDoesNotAffectDef").type),["explicit"],"omit/include policy is theorem-specific");
assert.deepEqual(binders(decl(art,"inner").type),[],"inner omit must suppress outer include within nested section");
assert.deepEqual(binders(decl(art,"outer").type),["explicit"],"nested section must restore outer include state");
assert.deepEqual(binders(decl(art,"shadow").type),["explicit"],"explicit declaration binder shadows same-named section variable");
run(["verify","Main.pscore.json"]);
run(["emit-lean","Main.pscore.json","--std","--out","Main.lean"]);
if(fs.existsSync(lean)){const lr=spawnSync(lean,[path.join(base,"Main.lean")],{encoding:"utf8"});assert.equal(lr.status,0,lr.stderr);}

for(const [name,src,pattern] of [
  ["TheoremProofOnly.ps",`section { variable (n: Nat); theorem bad: 0 = 0 := (fun (k: Nat) => Eq.refl.{1}(Nat, 0))(n); }\n`,/section variable is not present in the theorem header and is not included/],
  ["OmitHeader.ps",`section { variable (n: Nat); omit n; theorem bad: n = n := Eq.refl.{1}(Nat, n); }\n`,/cannot omit referenced section variable 'n'/],
  ["OmitDependency.ps",`section { variable {A: Type}; variable (x: A); include x; omit A; theorem bad: 0 = 0 := Eq.refl.{1}(Nat, 0); }\n`,/cannot omit referenced section variable 'A'/],
  ["IncludeUnknown.ps",`section { include nope; theorem bad: 0 = 0 := Eq.refl.{1}(Nat, 0); }\n`,/has not been declared in the current scope/],
  ["OmitUnknown.ps",`section { omit nope; theorem bad: 0 = 0 := Eq.refl.{1}(Nat, 0); }\n`,/has not been declared in the current scope/],
  ["VariableLeak.ps",`section { variable (n: Nat); def local: Nat := { n } } def bad: Nat := { n }\n`,/unknown identifier: n/],
]){write(path.join(base,name),src);assert.match(run(["check",name,"--std","--json"],1).stdout,pattern);}

write(path.join(base,"SectionInstance.ps"),`class Marker(A: Type) { mark: Nat; } section { variable [m: Marker(Nat)]; def x: Nat := { 0 } }\n`);
assert.match(run(["check","SectionInstance.ps","--std","--json"],2).stdout,/section instance variables/);
write(path.join(base,"StructureCapture.ps"),`section { variable (A: Type); structure Box { value: A; } }\n`);
assert.match(run(["check","StructureCapture.ps","--std","--json"],2).stdout,/generalizes section variables only for value declarations/);

console.log("✓ K3c section vars: auto-generalization, theorem include/omit, dependency closure, BinderInfo, lexical restoration, shadowing, and fail-closed deferred forms passed");

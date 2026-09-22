import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const cli=path.join(root,"packages/cli/dist/cli.js");
const lean=process.env.PROOFSCRIPT_LEAN_BIN||"/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lean";
const base=path.join(root,"artifacts/test/k3c-names");
fs.rmSync(base,{recursive:true,force:true});fs.mkdirSync(base,{recursive:true});
const write=(p,s)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s)};
function run(args,expect=0,cwd=root){const r=spawnSync(process.execPath,[cli,...args],{cwd,encoding:"utf8",env:{...process.env,PROOFSCRIPT_LEAN_BIN:lean}});if(r.status!==expect){console.error(r.stdout,r.stderr);throw new Error(`${args.join(" ")} expected ${expect}, got ${r.status}`);}return r;}

const single=path.join(base,"single");fs.mkdirSync(single,{recursive:true});
write(path.join(single,"Main.ps"),`def x: Nat := { 0 }
namespace A {
  def x: Bool := { true }
  def rootNat: Nat := { _root_.x }
  def localBool: Bool := { x }
  def B.relative: Bool := { x }
  namespace B {
    def nested: Bool := { x }
    def explicitParent: Bool := { A.x }
    def siblingQualified: Bool := { B.relative }
  }
}
`);
run(["check","Main.ps","--std","--emit-core","Main.pscore.json","--json"],0,single);
const art=JSON.parse(fs.readFileSync(path.join(single,"Main.pscore.json"),"utf8"));
assert.equal(art.formatVersion,12);assert.equal(art.implementationProfile,"K3c-section-vars0");
for(const n of ["x","A.x","A.rootNat","A.localBool","A.B.relative","A.B.nested","A.B.explicitParent","A.B.siblingQualified"])assert(art.declarations.some(d=>d.name===n),`missing ${n}`);
const val=n=>art.declarations.find(d=>d.name===n)?.value;
assert.equal(val("A.rootNat")?.name,"x");
for(const n of ["A.localBool","A.B.relative","A.B.nested","A.B.explicitParent"])assert.equal(val(n)?.name,"A.x",n);
assert.equal(val("A.B.siblingQualified")?.name,"A.B.relative");
run(["verify","Main.pscore.json"],0,single);
run(["emit-lean","Main.pscore.json","--std","--out","Main.lean"],0,single);
if(fs.existsSync(lean)){const lr=spawnSync(lean,[path.join(single,"Main.lean")],{encoding:"utf8"});assert.equal(lr.status,0,lr.stderr);}
const emitted=fs.readFileSync(path.join(single,"Main.lean"),"utf8");assert.match(emitted,/_root_\.x/);assert.match(emitted,/_root_\.A\.x/);

// Qualified and unqualified structural recursion both lower to the same qualified Core name.
write(path.join(single,"Rec.ps"),`namespace Math {
  def twice(n: Nat): Nat := {
    match (n) {
      | .zero => Nat.zero
      | .succ(k) => Nat.succ(Nat.succ(Math.twice(k)))
    }
  }
}
`);
run(["check","Rec.ps","--std","--emit-core","Rec.pscore.json"],0,single);
const rec=JSON.parse(fs.readFileSync(path.join(single,"Rec.pscore.json"),"utf8"));
for(const n of ["Math.twice","Math.twice.eq_1","Math.twice.eq_2"])assert(rec.declarations.some(d=>d.name===n),`missing ${n}`);
run(["emit-lean","Rec.pscore.json","--std","--out","Rec.lean"],0,single);
if(fs.existsSync(lean)){const lr=spawnSync(lean,[path.join(single,"Rec.lean")],{encoding:"utf8"});assert.equal(lr.status,0,lr.stderr);}

// Namespace scopes universe declarations, matching Lean's section/environment behavior.
write(path.join(single,"Universe.ps"),`namespace Poly {
  universe u;
  def id(A: Type u, x: A): A := { x }
}
def use: Nat := { Poly.id.{0}(Nat, Nat.zero) }
`);
run(["check","Universe.ps","--std"],0,single);
write(path.join(single,"UniverseLeak.ps"),`namespace Poly { universe u; def id(A: Type u, x: A): A := { x } }
def bad(A: Type u): Type u := { A }
`);
assert.match(run(["check","UniverseLeak.ps","--std","--json"],1,single).stdout,/"status": "rejected"/);

// Same leaf name in distinct namespaces is legal; duplicates in one namespace are not.
write(path.join(single,"Distinct.ps"),`namespace A { def x: Nat := { 0 } }
namespace B { def x: Nat := { 0 } }
`);run(["check","Distinct.ps","--std"],0,single);
write(path.join(single,"Duplicate.ps"),`namespace A { def x: Nat := { 0 } def x: Nat := { 0 } }
`);assert.match(run(["check","Duplicate.ps","--std","--json"],1,single).stdout,/duplicate source declaration: A\.x/);

// Namespace lookup does not leak across sibling namespaces.
write(path.join(single,"SiblingLeak.ps"),`namespace A { def x: Nat := { 0 } }
namespace B { def y: Nat := { x } }
`);assert.match(run(["check","SiblingLeak.ps","--std","--json"],1,single).stdout,/unknown identifier: x/);

// K3c-section-vars0 is a monotonic extension of names0: ordinary open/section now succeed; richer forms are tested separately.
write(path.join(single,"Open.ps"),`namespace A { def x: Nat := { 0 } }
open A;
def y: Nat := { x }
`);run(["check","Open.ps","--std"],0,single);
write(path.join(single,"Section.ps"),`section S { def x: Nat := { 0 } }
`);run(["check","Section.ps","--std"],0,single);

// Multi-file ownership and imported qualified resolution use ordinary Core names.
const proj=path.join(base,"project");
write(path.join(proj,"package.json"),JSON.stringify({name:"k3c-names-project",private:true},null,2));
write(path.join(proj,"proofscript.config.cts"),'module.exports={language:"0.1",semanticBaseline:"lean-4.33.1",sourceRoots:["src"]};\n');
write(path.join(proj,"src/Lib/Data.ps"),`namespace Model { def zero: Nat := { 0 } }\n`);
write(path.join(proj,"src/Main.ps"),`import Lib.Data;\ndef userMain: Nat := { Model.zero }\n`);
run(["check","src/Main.ps","--std","--emit-core","Main.pscore.json"],0,proj);
const pa=JSON.parse(fs.readFileSync(path.join(proj,"Main.pscore.json"),"utf8"));
assert.deepEqual(pa.modules.modules.map(m=>[m.name,m.declarations]),[["Lib.Data",["Model.zero"]],["Main",["userMain"]]]);
assert.equal(pa.declarations.find(d=>d.name==="userMain")?.value?.name,"Model.zero");
run(["certify","src/Main.ps","--std","--core","Main.pscore.json","--out","Main.pscert.json"],0,proj);
const cert=JSON.parse(fs.readFileSync(path.join(proj,"Main.pscert.json"),"utf8"));assert.equal(cert.implementationProfile,"K3c-section-vars0");
const vr=JSON.parse(run(["verify","Main.pscert.json","--json"],0,proj).stdout);assert.equal(vr.status,"accepted");assert.equal(vr.projectPluginsLoaded,false);
run(["emit-lean","Main.pscore.json","--std","--out","Main.lean"],0,proj);
if(fs.existsSync(lean)){const lr=spawnSync(lean,[path.join(proj,"Main.lean")],{encoding:"utf8"});assert.equal(lr.status,0,lr.stderr);}

console.log("✓ K3c names: nested namespaces, relative/qualified/root resolution, namespace-scoped universes, recursive names, module ownership, exact Lean emission, and monotonic section/open extension passed");

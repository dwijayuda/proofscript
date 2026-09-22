import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const cli=path.join(root,"packages/cli/dist/cli.js");
const lean=process.env.PROOFSCRIPT_LEAN_BIN||"/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lean";
const base=path.join(root,"artifacts/test/k3c-sections-open");
fs.rmSync(base,{recursive:true,force:true});fs.mkdirSync(base,{recursive:true});
const write=(p,s)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s)};
function run(args,expect=0,cwd=root){const r=spawnSync(process.execPath,[cli,...args],{cwd,encoding:"utf8",env:{...process.env,PROOFSCRIPT_LEAN_BIN:lean}});if(r.status!==expect){console.error(r.stdout,r.stderr);throw new Error(`${args.join(" ")} expected ${expect}, got ${r.status}`);}return r;}

const single=path.join(base,"single");fs.mkdirSync(single,{recursive:true});
write(path.join(single,"Main.ps"),`def x: Nat := { 0 }
namespace A { def x: Bool := { true } }
namespace B { def x: Nat := { 0 } }
open A B;
def openedFirst: Bool := { x }
namespace Outer {
  def x: Nat := { 0 }
  namespace N { def x: Bool := { true } }
  namespace Inner {
    open N;
    def parentWins: Nat := { x }
  }
}
section Scoped {
  universe u;
  namespace Local { def y: Nat := { 0 } }
  open Local;
  def inside: Nat := { y }
  def poly(A: Type u, a: A): A := { a }
}
def after: Nat := { Local.y }
`);
run(["check","Main.ps","--std","--emit-core","Main.pscore.json","--json"],0,single);
const art=JSON.parse(fs.readFileSync(path.join(single,"Main.pscore.json"),"utf8"));
const value=n=>art.declarations.find(d=>d.name===n)?.value;
assert.equal(value("openedFirst")?.name,"A.x");
assert.equal(value("Outer.Inner.parentWins")?.name,"Outer.x");
assert.equal(value("inside")?.name,"Local.y");
assert(art.declarations.some(d=>d.name==="poly"),"section label must not qualify declaration names");
assert(!art.declarations.some(d=>d.name==="Scoped.poly"));
run(["verify","Main.pscore.json"],0,single);
run(["emit-lean","Main.pscore.json","--std","--out","Main.lean"],0,single);
if(fs.existsSync(lean)){const lr=spawnSync(lean,[path.join(single,"Main.lean")],{encoding:"utf8"});assert.equal(lr.status,0,lr.stderr);}

// Open state is lexically scoped by sections and namespaces.
write(path.join(single,"SectionLeak.ps"),`section S { namespace Local { def x: Nat := { 0 } } open Local; def inside: Nat := { x } }
def bad: Nat := { x }
`);
assert.match(run(["check","SectionLeak.ps","--std","--json"],1,single).stdout,/unknown identifier: x/);
write(path.join(single,"NamespaceLeak.ps"),`namespace A { namespace Local { def x: Nat := { 0 } } open Local; def inside: Nat := { x } }
def bad: Nat := { x }
`);
assert.match(run(["check","NamespaceLeak.ps","--std","--json"],1,single).stdout,/unknown identifier: x/);

// Section universe state is restored at the closing brace.
write(path.join(single,"UniverseLeak.ps"),`section S { universe u; def id(A: Type u, a: A): A := { a } }
def bad(A: Type u): Type u := { A }
`);
assert.match(run(["check","UniverseLeak.ps","--std","--json"],1,single).stdout,/expected universe level|found 'u'|unknown/i);

// Exact Lean 4.33.1 resolves earlier opens first, not by synthetic ambiguity rejection.
write(path.join(single,"OpenOrder.ps"),`namespace A { def x: Nat := { 0 } }
namespace B { def x: Bool := { true } }
open A;
open B;
def chosen: Nat := { x }
`);
run(["check","OpenOrder.ps","--std","--emit-core","OpenOrder.pscore.json"],0,single);
const order=JSON.parse(fs.readFileSync(path.join(single,"OpenOrder.pscore.json"),"utf8"));
assert.equal(order.declarations.find(d=>d.name==="chosen")?.value?.name,"A.x");

// Open targets resolve relative to the surrounding namespace, with nearest namespace winning.
write(path.join(single,"Relative.ps"),`namespace A { def rootOnly: Nat := { 0 } }
namespace Outer {
  namespace A { def localOnly: Nat := { 0 } }
  namespace Inner { open A; def chosen: Nat := { localOnly } }
}
`);
run(["check","Relative.ps","--std","--emit-core","Relative.pscore.json"],0,single);
const rel=JSON.parse(fs.readFileSync(path.join(single,"Relative.pscore.json"),"utf8"));
assert.equal(rel.declarations.find(d=>d.name==="Outer.Inner.chosen")?.value?.name,"Outer.A.localOnly");

// Unknown open namespaces are logical/source rejection at the command point.
write(path.join(single,"UnknownOpen.ps"),`open Missing; def x: Nat := { 0 }\n`);
assert.match(run(["check","UnknownOpen.ps","--std","--json"],1,single).stdout,/unknown namespace 'Missing'/);

// Richer open forms remain explicit capability gaps; they are not flattened into ordinary open.
for(const [name,src] of [
  ["OpenScoped.ps",`open scoped BigOperators; def x: Nat := { 0 }\n`],
  ["OpenSelective.ps",`namespace A { def x: Nat := { 0 } } open A (x); def y: Nat := { x }\n`],
  ["OpenHiding.ps",`namespace A { def x: Nat := { 0 } } open A hiding x; def y: Nat := { 0 }\n`],
  ["OpenIn.ps",`namespace A { def x: Nat := { 0 } } open A in def y: Nat := { x }\n`],
]){write(path.join(single,name),src);run(["check",name,"--std"],2,single);}

// Opened constructor namespaces also participate in pattern resolution.
write(path.join(single,"Patterns.ps"),`namespace Data { inductive Flag: Type { | off; | on; } }
open Data.Flag;
def asBool(x: Data.Flag): Bool := {
  match (x) { | off => false | on => true }
}
`);
run(["check","Patterns.ps","--std","--emit-core","Patterns.pscore.json"],0,single);
run(["emit-lean","Patterns.pscore.json","--std","--out","Patterns.lean"],0,single);
if(fs.existsSync(lean)){const lr=spawnSync(lean,[path.join(single,"Patterns.lean")],{encoding:"utf8"});assert.equal(lr.status,0,lr.stderr);}

// Imported namespaces can be opened after dependency resolution.
const proj=path.join(base,"project");
write(path.join(proj,"package.json"),JSON.stringify({name:"k3c-sections-open-project",private:true},null,2));
write(path.join(proj,"proofscript.config.cts"),'module.exports={language:"0.1",semanticBaseline:"lean-4.33.1",sourceRoots:["src"]};\n');
write(path.join(proj,"src/Lib/Data.ps"),`namespace Model { def zero: Nat := { 0 } }\n`);
write(path.join(proj,"src/Main.ps"),`import Lib.Data;\nopen Model;\ndef userMain: Nat := { zero }\n`);
run(["check","src/Main.ps","--std","--emit-core","Main.pscore.json"],0,proj);
const pa=JSON.parse(fs.readFileSync(path.join(proj,"Main.pscore.json"),"utf8"));
assert.equal(pa.declarations.find(d=>d.name==="userMain")?.value?.name,"Model.zero");
run(["certify","src/Main.ps","--std","--core","Main.pscore.json","--out","Main.pscert.json"],0,proj);
const vr=JSON.parse(run(["verify","Main.pscert.json","--json"],0,proj).stdout);assert.equal(vr.status,"accepted");assert.equal(vr.projectPluginsLoaded,false);

console.log("✓ K3c sections/open: section scope, ordinary open precedence/restoration, relative/imported opens, constructor resolution, and fail-closed richer forms passed");

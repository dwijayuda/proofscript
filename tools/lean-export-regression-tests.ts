import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const cli=path.join(root,"packages/cli/dist/cli.js");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"proofscript-lean-export-regression-"));
function run(args){const r=spawnSync(process.execPath,[cli,...args],{cwd:root,encoding:"utf8"});if(r.status!==0)throw new Error(`${args.join(" ")} failed (${r.status})\n${r.stdout}\n${r.stderr}`);return r;}
function emit(id,source,std){const core=path.join(dir,`${id}.pscore.json`),lean=path.join(dir,`${id}.lean`);const ca=["check",source];if(std)ca.push("--std");ca.push("--emit-core",core);run(ca);const ea=["emit-lean",core];if(std)ea.push("--std");ea.push("--out",lean);run(ea);return fs.readFileSync(lean,"utf8");}
try{
  const universes=emit("universes","tests/differential/proofscript/universes.ps",false);
  assert.match(universes,/Sort \(max u \(v \+ 1\)\)/,"Lean level printer must preserve max/succ precedence");
  assert.doesNotMatch(universes,/Sort max u v \+ 1/,"Lean export must not emit precedence-ambiguous universe syntax");

  const equations=emit("equations","tests/differential/proofscript/equation-patterns.ps",true);
  assert.match(equations,/theorem isZeroPattern\.proofscript_eq_1\b/,"reserved equation theorem must receive deterministic Lean-safe name");
  assert.match(equations,/isZeroPattern\.proofscript_eq_1\b/,"references must be rewritten with the equation theorem declaration");
  assert.doesNotMatch(equations,/theorem isZeroPattern\.eq_1\b/,"Lean-reserved equation compiler name must not be redeclared");

  const structure=emit("structure","tests/differential/proofscript/structure.ps",true);
  assert.match(structure,/noncomputable def PairNat\.fst\b/,"direct custom-recursor projection must be marked noncomputable in Lean source");
  assert.match(structure,/noncomputable def PairNat\.snd\b/);
  assert.match(structure,/\ndef pairValue\b/,"constructor-only values should remain computable");

  const update=emit("update","tests/differential/proofscript/structure-update.ps",true);
  assert.match(update,/noncomputable def updateLeft\b/,"noncomputability must propagate through projection dependencies");
  assert.match(update,/\ndef updateBoth\b/,"constructor-only structure update must remain computable");

  const tc=emit("typeclass","tests/differential/proofscript/typeclass.ps",true);
  assert.doesNotMatch(tc,/noncomputable def getBoxNat\b/,"Lean-reconstructed class projections must not poison computability closure");
  const rtc=emit("recursive-typeclass","tests/differential/proofscript/recursive-typeclass.ps",true);
  assert.doesNotMatch(rtc,/noncomputable instance[^\n]*boxMarker\b/,"class projection use in an instance must remain computable after Lean reconstructs the class");
  assert.doesNotMatch(rtc,/noncomputable def automaticBoxTag\b/);
  console.log("✓ Lean exporter regressions: universe precedence, equation-name hygiene, and selective recursor noncomputability");
}finally{fs.rmSync(dir,{recursive:true,force:true});}

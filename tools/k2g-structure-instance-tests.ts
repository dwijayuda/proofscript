import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const cli=path.join(root,"packages/cli/dist/cli.js");
const out=path.join(root,"artifacts/test-k2g.pscore.json");
const leanOut=path.join(root,"artifacts/test-k2g.lean");
const run=(args,expect=0)=>{const r=spawnSync(process.execPath,[cli,...args],{cwd:root,encoding:"utf8"});if(r.status!==expect)throw new Error(`${args.join(" ")} failed (${r.status})\n${r.stdout}\n${r.stderr}`);return r;};
fs.mkdirSync(path.dirname(out),{recursive:true});
const summary=JSON.parse(run(["check","tests/conformance/positive/k2g-structure-instances.ps","--std","--emit-core",out,"--json"]).stdout);assert.equal(summary.status,"accepted");
const artifact=JSON.parse(fs.readFileSync(out,"utf8"));assert.equal(artifact.formatVersion,12);assert.equal(artifact.implementationProfile,"K3c-section-vars0");
for(const n of ["PairNat","PairNat.left","PairNat.right","pairValue","pairPunned","pairLeft","pairRight","punnedLeft"]){assert.ok(artifact.declarations.some(d=>d.name===n),`missing ${n}`);}
const constants=(term,out=[])=>{if(!term||typeof term!=="object")return out;if(term.tag==="const")out.push(term.name);for(const k of ["fn","arg","domain","body","type","value"])if(term[k])constants(term[k],out);return out;};
for(const n of ["pairValue","pairPunned"]){const d=artifact.declarations.find(x=>x.name===n);assert.ok(d&&d.kind==="definition");assert.ok(constants(d.value).includes("PairNat.mk"),`${n} must lower to PairNat.mk`);assert.equal(JSON.stringify(d.value).includes("structInst"),false,"structure source node must not enter Core");}
const replay=JSON.parse(run(["verify",out,"--json"]).stdout);assert.equal(replay.status,"accepted");assert.equal(replay.projectPluginsLoaded,false);
run(["emit-lean",out,"--std","--out",leanOut]);assert.match(fs.readFileSync(leanOut,"utf8"),/PairNat\.mk/);
for(const f of ["k2g-structure-missing-field.ps","k2g-structure-unknown-field.ps","k2g-structure-duplicate-field.ps"]){run(["check",`tests/conformance/negative/${f}`,"--std"],1);}
run(["check","tests/conformance/negative/k2g-structure-no-expected-type.ps","--std"],2);
fs.rmSync(out,{force:true});fs.rmSync(leanOut,{force:true});
console.log("✓ K2g structure construction/punning lower to generated constructors, reject invalid fields, and independently replay");

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const cli=path.join(root,"packages/cli/dist/cli.js");
const out=path.join(root,"artifacts/test-k2f.pscore.json");
const run=(args,expect=0)=>{const r=spawnSync(process.execPath,[cli,...args],{cwd:root,encoding:"utf8"});if(r.status!==expect)throw new Error(`${args.join(" ")} failed (${r.status})\n${r.stdout}\n${r.stderr}`);return r;};
fs.mkdirSync(path.dirname(out),{recursive:true});
const summary=JSON.parse(run(["check","tests/conformance/positive/k2f-patterns.ps","--std","--emit-core",out,"--json"]).stdout);
assert.equal(summary.status,"accepted");
const artifact=JSON.parse(fs.readFileSync(out,"utf8"));
assert.equal(artifact.formatVersion,12);
assert.equal(artifact.implementationProfile,"K3c-section-vars0");
for(const n of ["isZeroPattern","isZeroPattern.eq_1","isZeroPattern.eq_2","isZeroMatch","useZeroEquation","useSuccEquation"]){assert.ok(artifact.declarations.some(d=>d.name===n),`missing ${n}`);}
const constants=(term,out=[])=>{if(!term||typeof term!=="object")return out;if(term.tag==="const")out.push(term.name);for(const k of ["fn","arg","domain","body","type","value"])if(term[k])constants(term[k],out);return out;};
for(const n of ["isZeroPattern","isZeroMatch"]){const d=artifact.declarations.find(x=>x.name===n);assert.ok(d&&d.kind==="definition");const cs=constants(d.value);assert.ok(cs.includes("Nat.rec"),`${n} must lower through Nat.rec`);}
const replay=JSON.parse(run(["verify",out,"--json"]).stdout);assert.equal(replay.status,"accepted");assert.equal(replay.projectPluginsLoaded,false);
for(const f of ["k2f-wildcard-not-final.ps","k2f-nonzero-numeric-pattern.ps","k2f-zero-on-bool.ps"]){const r=run(["check",`tests/conformance/negative/${f}`,"--std"],2);assert.match(r.stderr,/unsupported:/);}
run(["check","tests/conformance/negative/k2f-duplicate-zero.ps","--std"],1);
fs.rmSync(out,{force:true});
console.log("✓ K2f wildcard/Nat-zero patterns lower to recursors, generate equations, reject unsupported overlaps, and independently replay");

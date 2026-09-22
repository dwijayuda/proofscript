import fs from "node:fs";import path from "node:path";import assert from "node:assert/strict";import {spawnSync} from "node:child_process";import {fileURLToPath} from "node:url";
import {MetaContext} from "../packages/elaborator/dist/metavars.js";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");const cli=path.join(root,"packages/cli/dist/cli.js");const out=path.join(root,"artifacts/test-k2m.pscore.json");
const run=(args,expect=0)=>{const r=spawnSync(process.execPath,[cli,...args],{cwd:root,encoding:"utf8"});if(r.status!==expect)throw new Error(`${args.join(" ")} failed (${r.status})\n${r.stdout}\n${r.stderr}`);return r;};
const summary=JSON.parse(run(["check","tests/conformance/positive/k2m-unification.ps","--std","--emit-core",out,"--json"]).stdout);assert.equal(summary.status,"accepted");
const artifact=JSON.parse(fs.readFileSync(out,"utf8"));assert.equal(artifact.formatVersion,12);assert.equal(artifact.implementationProfile,"K3c-section-vars0");
const usePair=artifact.declarations.find(d=>d.name==="usePair");assert.ok(usePair&&usePair.kind==="definition");const text=JSON.stringify(usePair.value);assert.match(text,/keepPairTypes/);assert.match(text,/Nat/);assert.match(text,/Bool/);
const replay=JSON.parse(run(["verify",out,"--json"]).stdout);assert.equal(replay.status,"accepted");assert.equal(replay.projectPluginsLoaded,false);
for(const f of ["k2m-unsolved-meta.ps","k2m-higher-order-pattern.ps"])run(["check",`tests/conformance/negative/${f}`,"--std"],2);
// Direct occurs-check gate on the elaborator-only meta engine.
const metas=new MetaContext();const m=metas.fresh(0);assert.throws(()=>metas.assign(m.id,{tag:"app",fn:{tag:"const",name:"F",levels:[]},arg:{tag:"mvar",id:m.id}}),/occurs check failed/);
fs.rmSync(out,{force:true});console.log("✓ K2m scoped metas solve first-order structured hidden type parameters (including multiple metas), reject unsolved/higher-order cases, pass occurs check, and leave no metas in Core");

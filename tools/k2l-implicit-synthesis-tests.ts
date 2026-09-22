import fs from "node:fs";import path from "node:path";import assert from "node:assert/strict";import {spawnSync} from "node:child_process";import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");const cli=path.join(root,"packages/cli/dist/cli.js");const out=path.join(root,"artifacts/test-k2l.pscore.json");
const run=(args,expect=0)=>{const r=spawnSync(process.execPath,[cli,...args],{cwd:root,encoding:"utf8"});if(r.status!==expect)throw new Error(`${args.join(" ")} failed (${r.status})\n${r.stdout}\n${r.stderr}`);return r;};
const summary=JSON.parse(run(["check","tests/conformance/positive/k2l-implicit-synthesis.ps","--std","--emit-core",out,"--json"]).stdout);assert.equal(summary.status,"accepted");
const artifact=JSON.parse(fs.readFileSync(out,"utf8"));assert.equal(artifact.formatVersion,12);assert.equal(artifact.implementationProfile,"K3c-section-vars0");
const useNat=artifact.declarations.find(d=>d.name==="useNat");assert.ok(useNat&&useNat.kind==="definition");const text=JSON.stringify(useNat.value);assert.match(text,/\"name\":\"iid\"|\"name\": \"iid\"/);assert.match(text,/\"name\":\"Nat\"|\"name\": \"Nat\"/);
const replay=JSON.parse(run(["verify",out,"--json"]).stdout);assert.equal(replay.status,"accepted");assert.equal(replay.projectPluginsLoaded,false);
run(["check","tests/conformance/negative/k2l-instance-synthesis-deferred.ps","--std"],1);for(const f of ["k2l-noninferable-hidden.ps","k2l-hidden-value-deferred.ps"])run(["check",`tests/conformance/negative/${f}`,"--std"],2);
fs.rmSync(out,{force:true});console.log("✓ K2l infers direct implicit/strict-implicit type parameters from later explicit arguments; instance/noninferable/value-hidden synthesis remains unsupported");

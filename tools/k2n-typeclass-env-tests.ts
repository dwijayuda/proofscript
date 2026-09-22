import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {TypeclassEnvironment} from "../packages/typeclass/dist/index.js";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const cli=path.join(root,"packages/cli/dist/cli.js");
const out=path.join(root,"artifacts/test/k2n-typeclass.pscore.json");
const lean=path.join(root,"artifacts/test/k2n-typeclass.lean");
function run(args,expect=0){const r=spawnSync(process.execPath,[cli,...args],{cwd:root,encoding:"utf8"});if(r.status!==expect){console.error(r.stdout,r.stderr);throw new Error(`${args.join(" ")} expected ${expect}, got ${r.status}`);}return r;}
run(["check","tests/conformance/positive/k2n-typeclass-env.ps","--std","--emit-core",out]);
const artifact=JSON.parse(fs.readFileSync(out,"utf8"));
assert.equal(artifact.formatVersion,12);assert.equal(artifact.implementationProfile,"K3c-section-vars0");
assert.equal(artifact.typeclasses.classes.length,1);assert.equal(artifact.typeclasses.classes[0].name,"Flag");assert.deepEqual(artifact.typeclasses.classes[0].fields.map(f=>f.name),["enabled"]);
assert.equal(artifact.typeclasses.instances.length,3);
const env=new TypeclassEnvironment(artifact.typeclasses);assert.deepEqual(env.candidates("Flag").map(x=>x.name),["flagHighLater","flagHigh","flagDefault"]);
run(["verify",out]);run(["emit-lean",out,"--std","--out",lean]);
const leanText=fs.readFileSync(lean,"utf8");assert.match(leanText,/class Flag where/);assert.match(leanText,/instance \(priority := 2000\) flagHigh : _root_\.Flag/);assert.match(leanText,/instance flagDefault : _root_\.Flag/);
for(const f of ["k2n-nonclass-instance-binder.ps","k2n-instance-target-not-class.ps","k2n-instance-missing-field.ps"]){run(["check",`tests/conformance/negative/${f}`,"--std"],1);}
run(["check","tests/conformance/negative/k2n-class-parameters-deferred.ps","--std"],0);run(["check","tests/conformance/negative/k2n-instance-parameters-deferred.ps","--std"],0);
const tampered=structuredClone(artifact);tampered.typeclasses.instances[0].className="MissingClass";const bad=path.join(root,"artifacts/test/k2n-typeclass-tampered.pscore.json");fs.writeFileSync(bad,JSON.stringify(tampered,null,2));run(["verify",bad],1);
console.log("✓ K2n class/instance registration, priority/declaration ordering, binder-class validation, v9 replay, metadata tamper rejection, and Lean reconstruction passed");

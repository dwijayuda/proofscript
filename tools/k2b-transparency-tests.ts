import assert from "node:assert/strict";
import { checkSource } from "../packages/frontend/dist/index.js";
import { loadStandardBootstrap } from "../packages/environment/dist/index.js";
import { decodeArtifact } from "../packages/kernel-codec/dist/index.js";
import { Environment, checkAndAddDeclaration, kernelWhnf, pretty } from "../packages/kernel/dist/index.js";

const std=loadStandardBootstrap().artifact;
const source=`
abbrev aliasZero: Nat := Nat.zero;
opaque hiddenZero: Nat := Nat.zero;
theorem aliasReduces: Eq.{1}(Nat, aliasZero, Nat.zero) := Eq.refl.{1}(Nat, Nat.zero);
example(n: Nat): Eq.{1}(Nat, Nat.add(n, Nat.zero), n) := Eq.refl.{1}(Nat, n);
`;
const checked=checkSource(source,{prelude:std});
assert.equal(checked.artifact.formatVersion,12);
assert.equal(checked.artifact.implementationProfile,"K3c-section-vars0");
const tail=checked.artifact.declarations.slice(-4);
assert.equal(tail[0].kind,"definition"); if(tail[0].kind==="definition") assert.equal(tail[0].reducibility,"abbrev");
assert.equal(tail[1].kind,"opaque");
assert.equal(tail[2].kind,"theorem");
assert.equal(tail[3].kind,"example");
const round=decodeArtifact(JSON.parse(JSON.stringify(checked.artifact)));
const env=new Environment(); for(const d of round.declarations) checkAndAddDeclaration(env,d);
assert.equal(pretty(kernelWhnf(env,{tag:"const",name:"aliasZero",levels:[]})),"Nat.zero");
assert.equal(pretty(kernelWhnf(env,{tag:"const",name:"hiddenZero",levels:[]})),"hiddenZero");
assert.equal(env.has(tail[3].name),false,"example must not enter the environment");
let rejected=false; try{checkSource(`opaque hiddenZero: Nat := Nat.zero; theorem bad: Eq.{1}(Nat, hiddenZero, Nat.zero) := Eq.refl.{1}(Nat, Nat.zero);`,{prelude:std});}catch(e){rejected=/type mismatch/i.test(String(e));}
assert.equal(rejected,true,"opaque declarations must not delta-reduce during kernel conversion");
console.log("✓ K2b abbrev/opaque/example declaration transparency slice passed");

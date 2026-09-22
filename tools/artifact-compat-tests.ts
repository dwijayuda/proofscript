import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodeArtifact } from "../packages/kernel-codec/dist/index.js";
import { checkCoreDeclarations } from "../packages/kernel/dist/index.js";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");

const oldK0={format:"proofscript-core",formatVersion:1,proofscriptReference:"v0.1",leanSemanticBaseline:"4.33.1",implementationProfile:"K0-bootstrap",declarations:[{kind:"theorem",name:"legacyIdentity",type:{tag:"pi",domain:{tag:"sort",level:0},body:{tag:"pi",domain:{tag:"bvar",index:0},body:{tag:"bvar",index:1}}},value:{tag:"lam",domain:{tag:"sort",level:0},body:{tag:"lam",domain:{tag:"bvar",index:0},body:{tag:"bvar",index:0}}}}]};
const fromV1=decodeArtifact(oldK0);assert.equal(fromV1.formatVersion,12);assert.equal(fromV1.implementationProfile,"K3c-section-vars0");assert.equal(checkCoreDeclarations(fromV1.declarations).status,"accepted");

const oldV2={format:"proofscript-core",formatVersion:2,proofscriptReference:"v0.1",leanSemanticBaseline:"4.33.1",implementationProfile:"K1-inductives0",declarations:[{kind:"inductive",name:"LegacyNat",levelParams:[],type:{tag:"sort",level:{tag:"succ",of:{tag:"zero"}}},numParams:0,numIndices:0,constructors:[{name:"LegacyNat.zero",type:{tag:"const",name:"LegacyNat",levels:[]}},{name:"LegacyNat.succ",type:{tag:"pi",domain:{tag:"const",name:"LegacyNat",levels:[]},body:{tag:"const",name:"LegacyNat",levels:[]}}}]}]};
const fromV2=decodeArtifact(oldV2);assert.equal(fromV2.formatVersion,12);assert.equal(fromV2.implementationProfile,"K3c-section-vars0");assert.equal(checkCoreDeclarations(fromV2.declarations).status,"accepted");

const oldV3={format:"proofscript-core",formatVersion:3,proofscriptReference:"v0.1",leanSemanticBaseline:"4.33.1",implementationProfile:"K1c-indexed0",declarations:[{kind:"inductive",name:"LegacyEq",levelParams:["u"],type:{tag:"pi",domain:{tag:"sort",level:{tag:"param",name:"u"}},body:{tag:"pi",domain:{tag:"bvar",index:0},body:{tag:"pi",domain:{tag:"bvar",index:1},body:{tag:"sort",level:{tag:"zero"}}}}},numParams:2,numIndices:1,constructors:[{name:"LegacyEq.refl",type:{tag:"pi",domain:{tag:"sort",level:{tag:"param",name:"u"}},body:{tag:"pi",domain:{tag:"bvar",index:0},body:{tag:"app",fn:{tag:"app",fn:{tag:"app",fn:{tag:"const",name:"LegacyEq",levels:[{tag:"param",name:"u"}]},arg:{tag:"bvar",index:1}},arg:{tag:"bvar",index:0}},arg:{tag:"bvar",index:0}}}}}]}]};
const fromV3=decodeArtifact(oldV3);assert.equal(fromV3.formatVersion,12);assert.equal(fromV3.implementationProfile,"K3c-section-vars0");assert.equal(checkCoreDeclarations(fromV3.declarations).status,"accepted");


const oldV5={format:"proofscript-core",formatVersion:5,proofscriptReference:"v0.1",leanSemanticBaseline:"4.33.1",implementationProfile:"K2a-bindings0",declarations:[{kind:"definition",name:"LegacyLet",levelParams:[],type:{tag:"sort",level:{tag:"succ",of:{tag:"zero"}}},value:{tag:"let",type:{tag:"sort",level:{tag:"succ",of:{tag:"zero"}}},value:{tag:"sort",level:{tag:"zero"}},body:{tag:"bvar",index:0},nondep:false},reducibility:"regular"}]};
const fromV5=decodeArtifact(oldV5);assert.equal(fromV5.formatVersion,12);assert.equal(fromV5.implementationProfile,"K3c-section-vars0");assert.equal(checkCoreDeclarations(fromV5.declarations).status,"accepted");
const oldV4={format:"proofscript-core",formatVersion:4,proofscriptReference:"v0.1",leanSemanticBaseline:"4.33.1",implementationProfile:"K1d-foundation0",declarations:[{kind:"definition",name:"LegacyType",levelParams:[],type:{tag:"sort",level:{tag:"succ",of:{tag:"zero"}}},value:{tag:"sort",level:{tag:"zero"}},reducibility:"regular"}]};
const fromV4=decodeArtifact(oldV4);assert.equal(fromV4.formatVersion,12);assert.equal(fromV4.implementationProfile,"K3c-section-vars0");assert.equal(checkCoreDeclarations(fromV4.declarations).status,"accepted");

const oldV6={format:"proofscript-core",formatVersion:6,proofscriptReference:"v0.1",leanSemanticBaseline:"4.33.1",implementationProfile:"K2b-transparency0",declarations:[{kind:"definition",name:"LegacyAbbrev",levelParams:[],type:{tag:"sort",level:{tag:"succ",of:{tag:"zero"}}},value:{tag:"sort",level:{tag:"zero"}},reducibility:"abbrev"}]};
const fromV6=decodeArtifact(oldV6);assert.equal(fromV6.formatVersion,12);assert.equal(fromV6.implementationProfile,"K3c-section-vars0");assert.equal(checkCoreDeclarations(fromV6.declarations).status,"accepted");

const oldV7={format:"proofscript-core",formatVersion:7,proofscriptReference:"v0.1",leanSemanticBaseline:"4.33.1",implementationProfile:"K2d-structural-recursion0",declarations:[{kind:"definition",name:"LegacyV7",levelParams:[],type:{tag:"sort",level:{tag:"succ",of:{tag:"zero"}}},value:{tag:"sort",level:{tag:"zero"}},reducibility:"regular"}]};
const fromV7=decodeArtifact(oldV7);assert.equal(fromV7.formatVersion,12);assert.equal(fromV7.implementationProfile,"K3c-section-vars0");assert.equal(checkCoreDeclarations(fromV7.declarations).status,"accepted");

const oldV7K2e={format:"proofscript-core",formatVersion:7,proofscriptReference:"v0.1",leanSemanticBaseline:"4.33.1",implementationProfile:"K2e-equation-clauses0",declarations:[{kind:"definition",name:"LegacyK2e",levelParams:[],type:{tag:"sort",level:{tag:"succ",of:{tag:"zero"}}},value:{tag:"sort",level:{tag:"zero"}},reducibility:"regular"}]};
const fromV7K2e=decodeArtifact(oldV7K2e);assert.equal(fromV7K2e.formatVersion,12);assert.equal(fromV7K2e.implementationProfile,"K3c-section-vars0");assert.equal(checkCoreDeclarations(fromV7K2e.declarations).status,"accepted");

const oldV7K2f={format:"proofscript-core",formatVersion:7,proofscriptReference:"v0.1",leanSemanticBaseline:"4.33.1",implementationProfile:"K2f-patterns0",declarations:[{kind:"definition",name:"LegacyK2f",levelParams:[],type:{tag:"sort",level:{tag:"succ",of:{tag:"zero"}}},value:{tag:"sort",level:{tag:"zero"}},reducibility:"regular"}]};
const fromV7K2f=decodeArtifact(oldV7K2f);assert.equal(fromV7K2f.formatVersion,12);assert.equal(fromV7K2f.implementationProfile,"K3c-section-vars0");assert.equal(checkCoreDeclarations(fromV7K2f.declarations).status,"accepted");

const oldV7K2g={format:"proofscript-core",formatVersion:7,proofscriptReference:"v0.1",leanSemanticBaseline:"4.33.1",implementationProfile:"K2g-structure-instances0",declarations:[{kind:"definition",name:"LegacyK2g",levelParams:[],type:{tag:"sort",level:{tag:"succ",of:{tag:"zero"}}},value:{tag:"sort",level:{tag:"zero"}},reducibility:"regular"}]};
const fromV7K2g=decodeArtifact(oldV7K2g);assert.equal(fromV7K2g.formatVersion,12);assert.equal(fromV7K2g.implementationProfile,"K3c-section-vars0");assert.equal(checkCoreDeclarations(fromV7K2g.declarations).status,"accepted");

const oldV7K2h={format:"proofscript-core",formatVersion:7,proofscriptReference:"v0.1",leanSemanticBaseline:"4.33.1",implementationProfile:"K2h-structure-update0",declarations:[{kind:"definition",name:"LegacyK2h",levelParams:[],type:{tag:"sort",level:{tag:"succ",of:{tag:"zero"}}},value:{tag:"sort",level:{tag:"zero"}},reducibility:"regular"}]};
const fromV7K2h=decodeArtifact(oldV7K2h);assert.equal(fromV7K2h.formatVersion,12);assert.equal(fromV7K2h.implementationProfile,"K3c-section-vars0");assert.equal(checkCoreDeclarations(fromV7K2h.declarations).status,"accepted");

const oldV7K2i={format:"proofscript-core",formatVersion:7,proofscriptReference:"v0.1",leanSemanticBaseline:"4.33.1",implementationProfile:"K2i-literals0",declarations:[{kind:"definition",name:"LegacyK2i",levelParams:[],type:{tag:"sort",level:{tag:"succ",of:{tag:"zero"}}},value:{tag:"sort",level:{tag:"zero"}},reducibility:"regular"}]};
const fromV7K2i=decodeArtifact(oldV7K2i);assert.equal(fromV7K2i.formatVersion,12);assert.equal(fromV7K2i.implementationProfile,"K3c-section-vars0");assert.equal(checkCoreDeclarations(fromV7K2i.declarations).status,"accepted");

const oldV7K2j={format:"proofscript-core",formatVersion:7,proofscriptReference:"v0.1",leanSemanticBaseline:"4.33.1",implementationProfile:"K2j-equality0",declarations:[{kind:"axiom",name:"LegacyK2j",levelParams:[],type:{tag:"pi",domain:{tag:"sort",level:{tag:"succ",of:{tag:"zero"}}},body:{tag:"sort",level:{tag:"succ",of:{tag:"zero"}}}}}]};
const fromV7K2j=decodeArtifact(oldV7K2j);assert.equal(fromV7K2j.formatVersion,12);assert.equal(fromV7K2j.implementationProfile,"K3c-section-vars0");assert.equal(checkCoreDeclarations(fromV7K2j.declarations).status,"accepted");
const legacyPi=fromV7K2j.declarations[0].type;if(legacyPi.tag!=="pi")throw new Error("legacy K2j Pi missing");assert.equal(legacyPi.binderInfo??"explicit","explicit");

const oldV8K2k={format:"proofscript-core",formatVersion:8,proofscriptReference:"v0.1",leanSemanticBaseline:"4.33.1",implementationProfile:"K2k-binder-info0",declarations:[{kind:"axiom",name:"LegacyImplicit",levelParams:[],type:{tag:"pi",binderInfo:"implicit",domain:{tag:"sort",level:{tag:"succ",of:{tag:"zero"}}},body:{tag:"sort",level:{tag:"succ",of:{tag:"zero"}}}}}]};
const fromV8K2k=decodeArtifact(oldV8K2k);assert.equal(fromV8K2k.formatVersion,12);assert.equal(fromV8K2k.implementationProfile,"K3c-section-vars0");assert.equal(checkCoreDeclarations(fromV8K2k.declarations).status,"accepted");const legacyHidden=fromV8K2k.declarations[0].type;if(legacyHidden.tag!=="pi")throw new Error("legacy K2k Pi missing");assert.equal(legacyHidden.binderInfo,"implicit");
const oldV8K2l={format:"proofscript-core",formatVersion:8,proofscriptReference:"v0.1",leanSemanticBaseline:"4.33.1",implementationProfile:"K2l-implicit-synthesis0",declarations:[{kind:"axiom",name:"LegacyK2l",levelParams:[],type:{tag:"pi",binderInfo:"implicit",domain:{tag:"sort",level:{tag:"succ",of:{tag:"zero"}}},body:{tag:"pi",domain:{tag:"bvar",index:0},body:{tag:"bvar",index:1}}}}]};
const fromV8K2l=decodeArtifact(oldV8K2l);assert.equal(fromV8K2l.formatVersion,12);assert.equal(fromV8K2l.implementationProfile,"K3c-section-vars0");assert.equal(checkCoreDeclarations(fromV8K2l.declarations).status,"accepted");

const oldV8K2m={format:"proofscript-core",formatVersion:8,proofscriptReference:"v0.1",leanSemanticBaseline:"4.33.1",implementationProfile:"K2m-unification0",declarations:[{kind:"axiom",name:"LegacyK2m",levelParams:[],type:{tag:"sort",level:{tag:"succ",of:{tag:"zero"}}}}]};
const fromV8K2m=decodeArtifact(oldV8K2m);assert.equal(fromV8K2m.formatVersion,12);assert.equal(fromV8K2m.implementationProfile,"K3c-section-vars0");assert.equal(checkCoreDeclarations(fromV8K2m.declarations).status,"accepted");
const oldV9K2n=JSON.parse((await import("node:fs")).default.readFileSync(new URL("../tests/fixtures/k2n-v9-typeclass.pscore.json", import.meta.url),"utf8"));
const fromV9K2n=decodeArtifact(oldV9K2n);
assert.equal(fromV9K2n.formatVersion,12);assert.equal(fromV9K2n.implementationProfile,"K3c-section-vars0");
assert.equal(checkCoreDeclarations(fromV9K2n.declarations).status,"accepted");
assert.equal(fromV9K2n.typeclasses.classes.length,1);assert.equal(fromV9K2n.typeclasses.instances.length,3);

const oldV9K2o=JSON.parse((await import("node:fs")).default.readFileSync(new URL("../tests/fixtures/k2o-v9-instance-search.pscore.json", import.meta.url),"utf8"));
const fromV9K2o=decodeArtifact(oldV9K2o);assert.equal(fromV9K2o.formatVersion,12);assert.equal(fromV9K2o.implementationProfile,"K3c-section-vars0");assert.equal(checkCoreDeclarations(fromV9K2o.declarations).status,"accepted");assert.equal(fromV9K2o.typeclasses.classes.length,1);assert.equal(fromV9K2o.typeclasses.instances.length,3);

const oldV10K2p=JSON.parse(fs.readFileSync(path.join(root,"tests/fixtures/k2p-v10-bootstrap.pscore.json"),"utf8"));
const fromV10K2p=decodeArtifact(oldV10K2p);assert.equal(fromV10K2p.formatVersion,12);assert.equal(fromV10K2p.implementationProfile,"K3c-section-vars0");assert.equal(checkCoreDeclarations(fromV10K2p.declarations).status,"accepted");
const oldV10K2q=JSON.parse(fs.readFileSync(path.join(root,"tests/fixtures/k2q-v10-polymorphic-instances.pscore.json"),"utf8"));
const fromV10K2q=decodeArtifact(oldV10K2q);assert.equal(fromV10K2q.formatVersion,12);assert.equal(fromV10K2q.implementationProfile,"K3c-section-vars0");assert.equal(checkCoreDeclarations(fromV10K2q.declarations).status,"accepted");
console.log("✓ core artifacts v1-v7, v8/K2k/K2l/K2m, and v9/K2n/K2o and v10/K2p/K2q replay into current v12 K3c core; BinderInfo and K2n typeclass metadata are preserved");

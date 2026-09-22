import assert from 'node:assert/strict';
import kernel from '../packages/kernel/dist/index.js';
import codec from '../packages/kernel-codec/dist/index.js';

const {LevelZero,levelParam,levelSucc,levelMax,levelIMax,levelGeq,levelDefEq,checkCoreDeclarations}=kernel;
const {makeKernelUniverseConformanceArtifact,decodeArtifact}=codec;
const u=levelParam('u'), v=levelParam('v');
const A=levelIMax(levelMax(v,v),u);
const B=levelIMax(levelIMax(LevelZero,u),levelIMax(v,u));
const c=(name)=>({tag:'const',name,levels:[u,v]});
const declarations=[
  {kind:'axiom',name:'T',levelParams:['u','v'],type:{tag:'sort',level:levelSucc(B)}},
  {kind:'inductive',name:'I',levelParams:['u','v'],type:{tag:'sort',level:levelSucc(A)},numParams:0,numIndices:0,constructors:[
    {name:'I.mk',type:{tag:'pi',domain:c('T'),body:c('I'),binderInfo:'explicit'}}
  ]}
];
assert.equal(levelGeq(A,B),false,'Lean 4.33.1 exact counterexample requires A !>= B');
assert.equal(levelGeq(levelSucc(A),levelSucc(B)),false);
assert.equal(levelDefEq(levelIMax(levelSucc(LevelZero),levelSucc(u)),levelSucc(u)),true,'imax 1 (u+1) must normalize to u+1');
let rejected=false;
try { checkCoreDeclarations(declarations,'KERNEL-universe-conformance1'); }
catch (e) { rejected=true; assert.match(String(e?.message),/universe level .* too big/); }
assert.equal(rejected,true,'v69 must reject old-v68 universe-admission counterexample');
const art=makeKernelUniverseConformanceArtifact([]);
assert.equal(art.formatVersion,69);
assert.equal(art.implementationProfile,'KERNEL-universe-conformance1');
const round=decodeArtifact(JSON.parse(JSON.stringify(art)));
assert.equal(round.formatVersion,69);
assert.equal(round.implementationProfile,'KERNEL-universe-conformance1');
console.log('PASS KERNEL-universe-conformance1: Core v69 identity, codec round-trip, universe repair, old-v68 soundness counterexample rejection');

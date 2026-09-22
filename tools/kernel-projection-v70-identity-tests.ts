import assert from 'node:assert/strict';
import kernel from '../packages/kernel/dist/index.js';
import codec from '../packages/kernel-codec/dist/index.js';
const {LevelZero,levelOfNat,levelParam,levelSucc,levelMax,levelIMax,levelGeq,checkCoreDeclarations}=kernel;
const {makeKernelProjectionConformanceArtifact,decodeArtifact}=codec;
const L0=LevelZero,L1=levelOfNat(1);
const S=level=>({tag:'sort',level}); const B=index=>({tag:'bvar',index}); const C=name=>({tag:'const',name,levels:[]});
const App=(fn,arg)=>({tag:'app',fn,arg}); const Pi=(domain,body)=>({tag:'pi',domain,body,binderInfo:'explicit'}); const P=(typeName,index,expr)=>({tag:'proj',typeName,index,expr});

const art=makeKernelProjectionConformanceArtifact([]);
assert.equal(art.formatVersion,70); assert.equal(art.implementationProfile,'KERNEL-projection-conformance1');
const round=decodeArtifact(JSON.parse(JSON.stringify(art)));
assert.equal(round.formatVersion,70); assert.equal(round.implementationProfile,'KERNEL-projection-conformance1');

// v70 must still inherit the v69 universe repair.
const u=levelParam('u'),v=levelParam('v');
const A=levelIMax(levelMax(v,v),u),Blev=levelIMax(levelIMax(LevelZero,u),levelIMax(v,u));
assert.equal(levelGeq(A,Blev),false);
const Udecls=[
  {kind:'axiom',name:'T',levelParams:['u','v'],type:{tag:'sort',level:levelSucc(Blev)}},
  {kind:'inductive',name:'I',levelParams:['u','v'],type:{tag:'sort',level:levelSucc(A)},numParams:0,numIndices:0,constructors:[
    {name:'I.mk',type:{tag:'pi',domain:{tag:'const',name:'T',levels:[u,v]},body:{tag:'const',name:'I',levels:[u,v]},binderInfo:'explicit'}}]}
];
assert.throws(()=>checkCoreDeclarations(Udecls,'KERNEL-projection-conformance1'),/universe level .* too big/);

console.log('PASS KERNEL-projection-conformance1: Core v70 identity/codec and v69 universe-conformance inheritance');

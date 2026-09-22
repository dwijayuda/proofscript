import assert from 'node:assert/strict';
import {
  Environment,
  checkAndAddDeclaration,
  defEq,
  levelOfNat,
  levelParam,
  levelSucc,
} from '../packages/kernel/dist/index.js';

const env = new Environment();
const S=(level)=>({tag:'sort',level});
const B=(index)=>({tag:'bvar',index});
const C=(name,levels=[])=>({tag:'const',name,levels});
const App=(fn,arg)=>({tag:'app',fn,arg});
const Pi=(domain,body)=>({tag:'pi',domain,body,binderInfo:'explicit'});
const Lam=(domain,body)=>({tag:'lam',domain,body,binderInfo:'explicit'});

const u=levelParam('u');
const polyFnType=Pi(S(u),Pi(B(0),B(1)));
checkAndAddDeclaration(env,{kind:'axiom',name:'etaF',levelParams:['u'],type:polyFnType});
checkAndAddDeclaration(env,{kind:'axiom',name:'etaG',levelParams:['u'],type:polyFnType});

const propFamilyType=Pi(S(u),S(levelOfNat(0)));
checkAndAddDeclaration(env,{kind:'axiom',name:'proofP',levelParams:['u'],type:propFamilyType});
checkAndAddDeclaration(env,{kind:'axiom',name:'proofQ',levelParams:['u'],type:propFamilyType});
const proofPType=Pi(S(u),App(C('proofP',[u]),B(0)));
const proofQType=Pi(S(u),App(C('proofQ',[u]),B(0)));
checkAndAddDeclaration(env,{kind:'axiom',name:'proofLeft',levelParams:['u'],type:proofPType});
checkAndAddDeclaration(env,{kind:'axiom',name:'proofRight',levelParams:['u'],type:proofPType});
checkAndAddDeclaration(env,{kind:'axiom',name:'proofOther',levelParams:['u'],type:proofQType});

let etaPositive=0,etaNegative=0,proofPositive=0,proofNegative=0,failures=0;
function bad(label,actual,expected){
  failures++;
  if(failures<=10) console.error(`MISMATCH ${label}: actual=${actual} expected=${expected}`);
}
for(let i=0;i<250;i++){
  const k=levelOfNat((i*5+1)%17);
  const inst=levelSucc(k);
  const alpha=S(k);
  const f=App(C('etaF',[inst]),alpha);
  const eta=Lam(alpha,App(f,B(0)));
  etaPositive++;
  const actual=defEq(env,[],eta,f);
  if(actual!==true)bad(`eta-positive-${i}`,actual,true);
}
for(let i=0;i<250;i++){
  const k=levelOfNat((i*7+3)%17);
  const inst=levelSucc(k);
  const alpha=S(k);
  const f=App(C('etaF',[inst]),alpha);
  const g=App(C('etaG',[inst]),alpha);
  const etaG=Lam(alpha,App(g,B(0)));
  etaNegative++;
  const actual=defEq(env,[],etaG,f);
  if(actual!==false)bad(`eta-negative-${i}`,actual,false);
}
for(let i=0;i<250;i++){
  const k=levelOfNat((i*11+5)%17);
  const inst=levelSucc(k);
  const alpha=S(k);
  const p=App(C('proofLeft',[inst]),alpha);
  const q=App(C('proofRight',[inst]),alpha);
  proofPositive++;
  const actual=defEq(env,[],p,q);
  if(actual!==true)bad(`proof-positive-${i}`,actual,true);
}
for(let i=0;i<250;i++){
  const k=levelOfNat((i*13+7)%17);
  const inst=levelSucc(k);
  const alpha=S(k);
  const p=App(C('proofLeft',[inst]),alpha);
  const q=App(C('proofOther',[inst]),alpha);
  proofNegative++;
  const actual=defEq(env,[],p,q);
  if(actual!==false)bad(`proof-negative-${i}`,actual,false);
}
assert.equal(etaPositive+etaNegative+proofPositive+proofNegative,1000);
assert.equal(failures,0);
console.log(`ETA_PROOF_TS_CASES=1000 ETA_TRUE=${etaPositive} ETA_FALSE=${etaNegative} PROOF_TRUE=${proofPositive} PROOF_FALSE=${proofNegative} FAILURES=${failures}`);

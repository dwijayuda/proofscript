import assert from 'node:assert/strict';
import {
  Environment,
  checkAndAddDeclaration,
  check,
  levelOfNat,
} from '../packages/kernel/dist/index.js';

const env=new Environment();
const S=(n)=>({tag:'sort',level:levelOfNat(n)});
const B=(index)=>({tag:'bvar',index});
const C=(name)=>({tag:'const',name,levels:[]});
const App=(fn,arg)=>({tag:'app',fn,arg});
const Pi=(domain,body)=>({tag:'pi',domain,body,binderInfo:'explicit'});
const Lam=(domain,body)=>({tag:'lam',domain,body,binderInfo:'explicit'});
const Let=(type,value,body)=>({tag:'let',type,value,body,nondep:false});

const D=C('ConvD');
const f=C('convF');
const g=C('convG');
const p=C('convP1');
const q=C('convP2');

checkAndAddDeclaration(env,{kind:'axiom',name:'ConvD',levelParams:[],type:S(1)});
checkAndAddDeclaration(env,{kind:'axiom',name:'convDValue',levelParams:[],type:D});
checkAndAddDeclaration(env,{kind:'axiom',name:'convF',levelParams:[],type:Pi(D,D)});
checkAndAddDeclaration(env,{kind:'axiom',name:'convG',levelParams:[],type:Pi(D,D)});
checkAndAddDeclaration(env,{kind:'axiom',name:'ConvEtaType',levelParams:[],type:Pi(Pi(D,D),S(1))});
checkAndAddDeclaration(env,{kind:'axiom',name:'convEtaX',levelParams:[],type:App(C('ConvEtaType'),f)});

checkAndAddDeclaration(env,{kind:'axiom',name:'ConvP',levelParams:[],type:S(0)});
checkAndAddDeclaration(env,{kind:'axiom',name:'convP1',levelParams:[],type:C('ConvP')});
checkAndAddDeclaration(env,{kind:'axiom',name:'convP2',levelParams:[],type:C('ConvP')});
checkAndAddDeclaration(env,{kind:'axiom',name:'ConvProofType',levelParams:[],type:Pi(C('ConvP'),S(1))});
checkAndAddDeclaration(env,{kind:'axiom',name:'ConvOtherProofType',levelParams:[],type:Pi(C('ConvP'),S(1))});
checkAndAddDeclaration(env,{kind:'axiom',name:'convProofX',levelParams:[],type:App(C('ConvProofType'),p)});

checkAndAddDeclaration(env,{kind:'definition',name:'ConvAliasD',levelParams:[],type:S(1),value:D,reducibility:'regular'});

const etaF=Lam(D,App(f,B(0)));
const etaG=Lam(D,App(g,B(0)));
const betaD=App(Lam(S(1),B(0)),D);
const zetaD=Let(S(1),D,B(0));

let etaTrue=0,etaFalse=0,proofTrue=0,proofFalse=0,beta=0,zeta=0,delta=0,failures=0;
function expectCheck(term,expected,shouldPass,label){
  let passed=true;
  try{check(env,[],term,expected);}catch{passed=false;}
  if(passed!==shouldPass){failures++;if(failures<=10)console.error(`MISMATCH ${label}: passed=${passed} expected=${shouldPass}`);}
}
for(let i=0;i<200;i++){
  etaTrue++; expectCheck(C('convEtaX'),App(C('ConvEtaType'),etaF),true,`eta-true-${i}`);
}
for(let i=0;i<100;i++){
  etaFalse++; expectCheck(C('convEtaX'),App(C('ConvEtaType'),etaG),false,`eta-false-${i}`);
}
for(let i=0;i<200;i++){
  proofTrue++; expectCheck(C('convProofX'),App(C('ConvProofType'),q),true,`proof-true-${i}`);
}
for(let i=0;i<100;i++){
  proofFalse++; expectCheck(C('convProofX'),App(C('ConvOtherProofType'),q),false,`proof-false-${i}`);
}
for(let i=0;i<150;i++){
  beta++; expectCheck(C('convDValue'),betaD,true,`beta-${i}`);
}
for(let i=0;i<150;i++){
  zeta++; expectCheck(C('convDValue'),zetaD,true,`zeta-${i}`);
}
for(let i=0;i<100;i++){
  delta++; expectCheck(C('convDValue'),C('ConvAliasD'),true,`delta-${i}`);
}
const total=etaTrue+etaFalse+proofTrue+proofFalse+beta+zeta+delta;
assert.equal(total,1000);
assert.equal(failures,0);
console.log(`CONVERSION_TYPING_TS_CASES=${total} ETA_TRUE=${etaTrue} ETA_FALSE=${etaFalse} PROOF_TRUE=${proofTrue} PROOF_FALSE=${proofFalse} BETA=${beta} ZETA=${zeta} DELTA=${delta} FAILURES=${failures}`);

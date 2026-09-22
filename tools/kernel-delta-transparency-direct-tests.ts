import assert from 'node:assert/strict';
import {
  Environment,
  checkAndAddDeclaration,
  kernelWhnf,
  sameTerm,
  levelOfNat,
  levelParam,
  levelSucc,
} from '../packages/kernel/dist/index.js';

const env=new Environment();
const S=(level)=>({tag:'sort',level});
const B=(index)=>({tag:'bvar',index});
const C=(name,levels=[])=>({tag:'const',name,levels});
const App=(fn,arg)=>({tag:'app',fn,arg});
const Pi=(domain,body)=>({tag:'pi',domain,body,binderInfo:'explicit'});
const Lam=(domain,body)=>({tag:'lam',domain,body,binderInfo:'explicit'});
const u=levelParam('u');
const polyType=Pi(S(u),Pi(B(0),B(1)));
const polyValue=Lam(S(u),Lam(B(0),B(0)));

checkAndAddDeclaration(env,{kind:'definition',name:'deltaRegular',levelParams:['u'],type:polyType,value:polyValue,reducibility:'regular'});
checkAndAddDeclaration(env,{kind:'definition',name:'deltaAbbrev',levelParams:['u'],type:polyType,value:polyValue,reducibility:'abbrev'});
checkAndAddDeclaration(env,{kind:'opaque',name:'deltaOpaque',levelParams:['u'],type:polyType,value:polyValue});
checkAndAddDeclaration(env,{kind:'axiom',name:'DeltaP',levelParams:[],type:S(levelOfNat(0))});
checkAndAddDeclaration(env,{kind:'axiom',name:'deltaProof',levelParams:[],type:C('DeltaP')});
checkAndAddDeclaration(env,{kind:'theorem',name:'deltaTheorem',levelParams:[],type:C('DeltaP'),value:C('deltaProof')});

function polyCase(name,i){
  const v=levelOfNat(i%23), k=levelSucc(v), inst=levelSucc(k);
  const alpha=S(k), x=S(v);
  return {term:App(App(C(name,[inst]),alpha),x),expected:x};
}

let regular=0,abbrev=0,opaque=0,theoremOpaque=0,failures=0;
function mismatch(label,actual,expected){failures++;if(failures<=10)console.error('MISMATCH',label,{actual,expected});}
for(let i=0;i<400;i++){
  const {term,expected}=polyCase('deltaRegular',i); regular++;
  const actual=kernelWhnf(env,term); if(!sameTerm(actual,expected))mismatch(`regular-${i}`,actual,expected);
}
for(let i=0;i<200;i++){
  const {term,expected}=polyCase('deltaAbbrev',i*7+3); abbrev++;
  const actual=kernelWhnf(env,term); if(!sameTerm(actual,expected))mismatch(`abbrev-${i}`,actual,expected);
}
for(let i=0;i<200;i++){
  const {term}=polyCase('deltaOpaque',i*11+5); opaque++;
  const actual=kernelWhnf(env,term); if(!sameTerm(actual,term))mismatch(`opaque-${i}`,actual,term);
}
for(let i=0;i<200;i++){
  const term=C('deltaTheorem'); theoremOpaque++;
  const actual=kernelWhnf(env,term); if(!sameTerm(actual,term))mismatch(`theorem-${i}`,actual,term);
}
assert.equal(regular+abbrev+opaque+theoremOpaque,1000);
assert.equal(failures,0);
console.log(`DELTA_TS_CASES=1000 REGULAR=${regular} ABBREV=${abbrev} OPAQUE=${opaque} THEOREM_OPAQUE=${theoremOpaque} FAILURES=${failures}`);

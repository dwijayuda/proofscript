import assert from 'node:assert/strict';
import { Environment, kernelWhnf, sameTerm, levelOfNat, levelSucc } from '../packages/kernel/dist/index.js';

const env=new Environment();
const S=(level)=>({tag:'sort',level});
const B=(index)=>({tag:'bvar',index});
const Lam=(domain,body)=>({tag:'lam',domain,body,binderInfo:'explicit'});
const App=(fn,arg)=>({tag:'app',fn,arg});
const Let=(type,value,body)=>({tag:'let',type,value,body,nondep:false});
let beta=0,zeta=0,failures=0;
function check(term,expected,label){
  try{const actual=kernelWhnf(env,term);if(!sameTerm(actual,expected)){failures++;if(failures<=10)console.error(`MISMATCH ${label}`,{actual,expected});}}
  catch(e){failures++;if(failures<=10)console.error(`ERROR ${label}: ${e?.stack??e}`);}
}
for(let i=0;i<500;i++){
  const k=levelOfNat(i%9),d=S(levelSucc(k)),arg=S(k);
  beta++;check(App(Lam(d,B(0)),arg),arg,`beta-${i}`);
}
for(let i=0;i<500;i++){
  const k=levelOfNat(i%9),t=S(levelSucc(k)),value=S(k);
  zeta++;check(Let(t,value,B(0)),value,`zeta-${i}`);
}
assert.equal(beta,500);assert.equal(zeta,500);assert.equal(failures,0);
console.log(`BETA_CASES=${beta} ZETA_CASES=${zeta} FAILURES=${failures}`);

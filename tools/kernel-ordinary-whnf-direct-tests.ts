import assert from 'node:assert/strict';
import {Environment,checkAndAddDeclaration,kernelWhnf,sameTerm,levelOfNat,levelParam,levelSucc} from '../packages/kernel/dist/index.js';
const env=new Environment();
const S=(level)=>({tag:'sort',level}),B=(index)=>({tag:'bvar',index}),C=(name,levels=[])=>({tag:'const',name,levels});
const App=(fn,arg)=>({tag:'app',fn,arg}),Pi=(domain,body)=>({tag:'pi',domain,body,binderInfo:'explicit'}),Lam=(domain,body)=>({tag:'lam',domain,body,binderInfo:'explicit'});
const u=levelParam('u');
const idType=Pi(S(u),Pi(B(0),B(1))), idValue=Lam(S(u),Lam(B(0),B(0)));
const headType=Pi(S(u),Pi(B(0),B(1)));
const headValue=Lam(S(u),App(C('ordinaryId',[u]),B(0)));
checkAndAddDeclaration(env,{kind:'definition',name:'ordinaryId',levelParams:['u'],type:idType,value:idValue,reducibility:'regular'});
checkAndAddDeclaration(env,{kind:'definition',name:'ordinaryHead',levelParams:['u'],type:headType,value:headValue,reducibility:'regular'});
checkAndAddDeclaration(env,{kind:'definition',name:'ordinaryAbbrevHead',levelParams:['u'],type:headType,value:headValue,reducibility:'abbrev'});
checkAndAddDeclaration(env,{kind:'opaque',name:'ordinaryOpaqueHead',levelParams:['u'],type:headType,value:headValue});
function mkCase(name,i){const v=levelOfNat(i%23),k=levelSucc(v),inst=levelSucc(k),alpha=S(k),x=S(v);return{term:App(App(C(name,[inst]),alpha),x),expected:x};}
let regular=0,abbrev=0,opaque=0,failures=0;
for(let i=0;i<500;i++){const{term,expected}=mkCase('ordinaryHead',i*5+1);regular++;if(!sameTerm(kernelWhnf(env,term),expected))failures++;}
for(let i=0;i<250;i++){const{term,expected}=mkCase('ordinaryAbbrevHead',i*7+3);abbrev++;if(!sameTerm(kernelWhnf(env,term),expected))failures++;}
for(let i=0;i<250;i++){const{term}=mkCase('ordinaryOpaqueHead',i*11+5);opaque++;if(!sameTerm(kernelWhnf(env,term),term))failures++;}
assert.equal(regular+abbrev+opaque,1000);assert.equal(failures,0);
console.log(`ORDINARY_WHNF_TS_CASES=1000 REGULAR=${regular} ABBREV=${abbrev} OPAQUE=${opaque} FAILURES=${failures}`);

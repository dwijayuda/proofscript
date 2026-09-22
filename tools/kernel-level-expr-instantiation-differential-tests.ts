import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  LevelZero, levelParam, levelSucc, levelMax, levelIMax,
  instantiateLevel, instantiateTermLevels,
} from '../packages/kernel/dist/index.js';

const U=levelParam('u'), V=levelParam('v'), W=levelParam('w'), X=levelParam('x');
const params=['u','v','w'];
const S=level=>({tag:'sort',level});
const C=(name,levels=[])=>({tag:'const',name,levels});
const B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg});
const Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo});
const Let=(type,value,body,nondep)=>({tag:'let',type,value,body,nondep});
const Proj=(typeName,index,expr)=>({tag:'proj',typeName,index,expr});

function levelS(l){
  switch(l.tag){
    case 'zero': return '0';
    case 'succ': return `(s ${levelS(l.of)})`;
    case 'max': return `(max ${levelS(l.left)} ${levelS(l.right)})`;
    case 'imax': return `(imax ${levelS(l.left)} ${levelS(l.right)})`;
    case 'param': return `(p ${l.name})`;
  }
}
function binderS(bi){return bi==='explicit'?'E':bi==='implicit'?'I':bi==='strictImplicit'?'S':'Inst';}
function exprS(e){
  switch(e.tag){
    case 'bvar': return `(b ${e.index})`;
    case 'sort': return `(sort ${levelS(e.level)})`;
    case 'const': return `(c ${e.name} [${e.levels.map(levelS).join(',')}])`;
    case 'app': return `(a ${exprS(e.fn)} ${exprS(e.arg)})`;
    case 'lam': return `(lam ${binderS(e.binderInfo??'explicit')} ${exprS(e.domain)} ${exprS(e.body)})`;
    case 'pi': return `(pi ${binderS(e.binderInfo??'explicit')} ${exprS(e.domain)} ${exprS(e.body)})`;
    case 'let': return `(let ${e.nondep} ${exprS(e.type)} ${exprS(e.value)} ${exprS(e.body)})`;
    case 'proj': return `(proj ${e.typeName} ${e.index} ${exprS(e.expr)})`;
  }
}
function lvl(i,k){
  switch((i+k)%8){
    case 0:return LevelZero;
    case 1:return U;
    case 2:return V;
    case 3:return W;
    case 4:return X;
    case 5:return levelSucc(U);
    case 6:return levelMax(V,levelSucc(W));
    default:return levelIMax(U,V);
  }
}
function argLvl(i,k){
  switch((i*3+k)%6){
    case 0:return LevelZero;
    case 1:return levelSucc(LevelZero);
    case 2:return levelSucc(levelSucc(LevelZero));
    case 3:return X;
    case 4:return levelMax(X,levelSucc(LevelZero));
    default:return levelIMax(X,levelSucc(LevelZero));
  }
}
function bi(i){return ['explicit','implicit','strictImplicit','instImplicit'][i%4];}
function exprFor(i){
  const s0=S(lvl(i,0)), s1=S(lvl(i,1)), c0=C('C',[lvl(i,0),lvl(i,1)]), c1=C('D',[lvl(i,2)]);
  switch(i%8){
    case 0:return s0;
    case 1:return c0;
    case 2:return App(c0,s1);
    case 3:return Lam(s0,App(c1,B(0)),bi(i));
    case 4:return Pi(s0,App(c0,B(0)),bi(i));
    case 5:return Let(s0,c1,App(c0,B(0)),i%2===0);
    case 6:return Proj('S',i%3,App(c0,c1));
    default:return App(Lam(s0,Let(s1,c1,App(c0,B(1)),false),bi(i)),c1);
  }
}
const levelLines=[], exprLines=[];
for(let i=0;i<1000;i++){
  const args=[argLvl(i,0),argLvl(i,1),argLvl(i,2)];
  levelLines.push(`L|${i}|${levelS(instantiateLevel(lvl(i,3),params,args))}`);
  exprLines.push(`I|${i}|${exprS(instantiateTermLevels(exprFor(i),params,args))}`);
}

// Implementation-boundary preconditions used by trusted declaration checking.
assert.throws(()=>instantiateLevel(U,['u','v'],[LevelZero]),/universe arity mismatch/);
console.log('PS_PRECONDITION_EXACT_ARITY=PASS');
console.log('PS_SHARED_DOMAIN_UNIQUE_PARAMS=DECLARATION_VALIDATION');

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(!lean) throw new Error('PROOFSCRIPT_LEAN_BIN is required for exact differential');
const fixture=new URL('../assurance/lean4331/evidence/LevelExprInstantiationNative.lean',import.meta.url).pathname;
const r=spawnSync(lean,[fixture],{encoding:'utf8',maxBuffer:16*1024*1024});
if(r.status!==0){console.error(r.stdout,r.stderr);process.exit(1);}
const leanLevel=r.stdout.split(/\r?\n/).filter(x=>x.startsWith('L|'));
const leanExpr=r.stdout.split(/\r?\n/).filter(x=>x.startsWith('I|'));
assert.equal(leanLevel.length,1000);
assert.equal(leanExpr.length,1000);
let levelMismatch=0, exprMismatch=0;
for(let i=0;i<1000;i++){
  if(levelLines[i]!==leanLevel[i]) { if(levelMismatch<8) console.log(`LEVEL_MISMATCH_${i}\nTS=${levelLines[i]}\nLEAN=${leanLevel[i]}`); levelMismatch++; }
  if(exprLines[i]!==leanExpr[i]) { if(exprMismatch<8) console.log(`EXPR_MISMATCH_${i}\nTS=${exprLines[i]}\nLEAN=${leanExpr[i]}`); exprMismatch++; }
}
console.log(`LEVEL_INSTANTIATION_CASES=1000 MISMATCHES=${levelMismatch}`);
console.log(`EXPR_INSTANTIATION_CASES=1000 MISMATCHES=${exprMismatch}`);
assert.equal(levelMismatch,0);
assert.equal(exprMismatch,0);
assert.match(r.stdout,/LEVEL_NATIVE_CASES=1000 EXPR_NATIVE_CASES=1000/);
console.log('✓ exact Lean 4.33.1 level/expression universe-instantiation differential passed');

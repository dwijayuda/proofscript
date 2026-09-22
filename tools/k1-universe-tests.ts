import {
  LevelZero, levelParam, levelSucc, levelMax, levelIMax, levelDefEq,
  Environment, checkAndAddDeclaration,
} from "../packages/kernel/dist/index.js";

function assert(c,m){if(!c)throw new Error(m);}
const u=levelParam("u"),v=levelParam("v");
assert(levelDefEq(levelMax(u,LevelZero),u),"max u 0 must equal u");
assert(levelDefEq(levelIMax(u,LevelZero),LevelZero),"imax u 0 must equal 0");
assert(levelDefEq(levelIMax(u,levelSucc(v)),levelMax(u,levelSucc(v))),"imax u (v+1) must equal max u (v+1)");

// Kernel, not codec/frontend, rejects free universe parameters in an artifact.
const env=new Environment();
let rejected=false;
try{
  checkAndAddDeclaration(env,{kind:"axiom",name:"Bad",levelParams:[],type:{tag:"sort",level:u}});
}catch(e){rejected=/undeclared universe parameter/.test(String(e));}
assert(rejected,"kernel must reject undeclared universe parameters");
console.log("✓ K1 universe kernel tests passed");

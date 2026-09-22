import assert from "node:assert/strict";
import { checkSource } from "../packages/frontend/dist/index.js";
import {
  Environment,
  checkAndAddDeclaration,
  infer,
  kernelWhnf,
  levelOfNat,
  pretty,
} from "../packages/kernel/dist/index.js";

const source=`
inductive NatK1: Type {
  | zero;
  | succ(n: NatK1);
}
`;
const checked=checkSource(source);
assert.equal(checked.summary.status,"accepted");
assert.deepEqual(checked.summary.declarations[0].generated,["NatK1.zero","NatK1.succ","NatK1.rec"]);

const env=new Environment();
for(const d of checked.artifact.declarations)checkAndAddDeclaration(env,d);
const C=(name,levels=[])=>({tag:"const",name,levels});
const A=(fn,arg)=>({tag:"app",fn,arg});
const many=(fn,args)=>args.reduce((f,a)=>A(f,a),fn);
const nat=C("NatK1"), zero=C("NatK1.zero"), succ=C("NatK1.succ");
const motive={tag:"lam",domain:nat,body:nat};
const succMinor={tag:"lam",domain:nat,body:{tag:"lam",domain:nat,body:A(succ,{tag:"bvar",index:0})}};
const rec=C("NatK1.rec",[levelOfNat(1)]);
const recZero=many(rec,[motive,zero,succMinor,zero]);
const one=A(succ,zero);
const recOne=many(rec,[motive,zero,succMinor,one]);
assert.equal(pretty(kernelWhnf(env,infer(env,[],recZero))),"NatK1");
assert.equal(pretty(kernelWhnf(env,recZero)),"NatK1.zero");
const w1=kernelWhnf(env,recOne);
assert.equal(w1.tag,"app");
assert.equal(pretty(w1.fn),"NatK1.succ");
assert.equal(pretty(kernelWhnf(env,w1.arg)),"NatK1.zero");
console.log("✓ K1 restricted recursor typing and computation rules passed");

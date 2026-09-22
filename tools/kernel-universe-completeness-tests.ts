import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  LevelZero, levelParam, levelSucc, levelMax, levelIMax, levelDefEq, levelGeq, levelLeq,
  normalizeLevel, levelStructuralEq, Environment, checkAndAddDeclaration,
} from "../packages/kernel/dist/index.js";
import { makeArtifact } from "../packages/kernel-codec/dist/index.js";
import { verifyFile } from "../packages/verifier/dist/index.js";

const s = levelSucc;
const m = levelMax;
const im = levelIMax;
const u = levelParam("u");
const v = levelParam("v");
const one = s(LevelZero);
const two = s(one);
const three = s(two);
const eq = (a,b,msg) => assert.equal(levelDefEq(a,b), true, msg);
const neq = (a,b,msg) => assert.equal(levelDefEq(a,b), false, msg);

// Lean 4.33.1 mk_imax identities that the old conservative kernel missed.
eq(im(one,u),u,"imax 1 u = u");
eq(im(u,u),u,"imax u u = u");
eq(im(LevelZero,u),u,"imax 0 u = u");
eq(im(u,LevelZero),LevelZero,"imax u 0 = 0");
eq(im(u,s(v)),m(u,s(v)),"imax u (v+1) = max u (v+1)");
// v68 assurance regression: the old smart-imax path failed to run full max normalization.
eq(im(one,s(u)),s(u),"imax 1 (u+1) = u+1");
eq(im(s(v),s(u)),m(s(v),s(u)),"nonzero imax operands normalize through canonical max");

// Exact max normalization: commutativity/associativity, same-base offsets,
// explicit-universe subsumption, and outer successor distribution.
eq(m(u,v),m(v,u),"max is commutative after normalization");
eq(m(m(u,v),one),m(u,m(v,one)),"max is associative after normalization");
eq(m(u,s(u)),s(u),"max u (u+1) = u+1");
eq(m(s(u),s(s(u))),s(s(u)),"same-base larger offset subsumes smaller");
eq(m(one,s(u)),s(u),"explicit 1 is subsumed by u+1");
eq(s(m(u,v)),m(s(u),s(v)),"succ distributes through normalized max");
eq(m(two,three),three,"explicit max picks the larger numeral");

// Non-equivalences must not be accidentally admitted.
neq(im(two,u),u,"imax 2 u is not definitionally equal to u");
neq(m(one,u),u,"max 1 u is not definitionally equal to u");
neq(s(u),u,"u+1 is not definitionally equal to u");

// Lean is_geq semantics, ported for the canonical no-mvar subset.
assert.equal(levelGeq(s(u),u),true,"u+1 >= u");
assert.equal(levelLeq(u,s(u)),true,"u <= u+1");
assert.equal(levelGeq(u,s(u)),false,"u is not >= u+1");
assert.equal(levelLeq(s(u),u),false,"u+1 is not <= u");
// v68 assurance regression: Lean pattern order handles left-imax before right-imax.
const uvIMax=im(u,v);
assert.equal(levelGeq(im(u,uvIMax),uvIMax),true,"left-imax geq branch must win when both sides are imax");
assert.equal(levelGeq(uvIMax,im(uvIMax,v)),false,"Lean geq is intentionally incomplete/directional on nested imax");

// Normalization must be deterministic/idempotent.
const complex = s(m(im(one,u),m(v,s(u))));
const n1 = normalizeLevel(complex);
const n2 = normalizeLevel(n1);
assert.ok(levelStructuralEq(n1,n2),"universe normalization must be idempotent");

function pi(domain,body){return {tag:"pi",domain,body};}
function lam(domain,body){return {tag:"lam",domain,body};}
const sort = level => ({tag:"sort",level});
const b0 = {tag:"bvar",index:0};

// Kernel-level acceptance must rely on the corrected equality, not frontend
// pretty-printing. This declaration was rejected by the old universe checker.
const goodDecl = {
  kind:"definition", name:"imaxOneKernel", levelParams:["u"], reducibility:"regular",
  type:pi(sort(im(one,u)),sort(u)),
  value:lam(sort(im(one,u)),b0),
};
const env = new Environment();
assert.doesNotThrow(()=>checkAndAddDeclaration(env,goodDecl));

// Neighboring non-equivalent universe must still reject.
const badDecl = {
  kind:"definition", name:"imaxTwoKernel", levelParams:["u"], reducibility:"regular",
  type:pi(sort(im(two,u)),sort(u)),
  value:lam(sort(im(two,u)),b0),
};
assert.throws(()=>checkAndAddDeclaration(new Environment(),badDecl),/type mismatch/);

// Serialized replay must independently exercise the same semantics.
const dir = fs.mkdtempSync(path.join(os.tmpdir(),"proofscript-kernel-universe-"));
try {
  const goodPath=path.join(dir,"good.pscore.json");
  fs.writeFileSync(goodPath,JSON.stringify(makeArtifact([goodDecl]),null,2));
  const verified=verifyFile(goodPath);
  assert.equal(verified.status,"accepted",verified.message);
  assert.equal(verified.projectPluginsLoaded,false);

  const badPath=path.join(dir,"bad.pscore.json");
  fs.writeFileSync(badPath,JSON.stringify(makeArtifact([badDecl]),null,2));
  const rejected=verifyFile(badPath);
  assert.equal(rejected.status,"rejected","non-equivalent universe artifact must reject");

  const malformed=makeArtifact([goodDecl]);
  malformed.declarations[0].type.domain.level={tag:"bogus"};
  const malformedPath=path.join(dir,"malformed.pscore.json");
  fs.writeFileSync(malformedPath,JSON.stringify(malformed,null,2));
  const malformedResult=verifyFile(malformedPath);
  assert.equal(malformedResult.status,"rejected","malformed serialized universe must reject");
} finally { fs.rmSync(dir,{recursive:true,force:true}); }

console.log("✓ exact Lean 4.33.1 universe-equivalence kernel tests passed");

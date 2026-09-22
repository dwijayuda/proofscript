import assert from "node:assert/strict";
import { checkSource } from "../packages/frontend/dist/index.js";
import { Environment, checkAndAddDeclaration, kernelWhnf, levelOfNat, pretty } from "../packages/kernel/dist/index.js";

const eqSource=`
universe u;
inductive Eq(A: Sort u, a: A): A → Prop {
  | refl: Eq(A, a, a);
}
theorem eqRefl(A: Type, a: A): Eq.{1}(A, a, a) := Eq.refl.{1}(A, a);
theorem eqRecRefl(
  A: Type,
  a: A,
  P: ∀ (b: A), Eq.{1}(A, a, b) → Prop,
  h: P(a, Eq.refl.{1}(A, a))
): P(a, Eq.refl.{1}(A, a)) :=
  @Eq.rec.{0, 1}(A, a, P, h, a, Eq.refl.{1}(A, a));
`;
const checked=checkSource(eqSource);
assert.equal(checked.summary.status,"accepted");
assert.deepEqual(checked.summary.declarations[0].generated,["Eq.refl","Eq.rec"]);
assert.equal(checked.artifact.formatVersion,12);
assert.equal(checked.artifact.implementationProfile,"K3c-section-vars0");
const eqDecl=checked.artifact.declarations[0];
assert.equal(eqDecl.kind,"inductive");
if(eqDecl.kind==="inductive"){
  assert.equal(eqDecl.numParams,2);
  assert.equal(eqDecl.numIndices,1);
}
const env=new Environment();for(const d of checked.artifact.declarations)checkAndAddDeclaration(env,d);
assert.ok(env.has("Eq"));assert.ok(env.has("Eq.refl"));assert.ok(env.has("Eq.rec"));

// Computation rule smoke test: use a type-correct Eq.rec application.  The
// recursor is now the Lean-shaped typed recursor, so arbitrary untyped dummy
// constants must not be used as a reduction witness.
const eqIota=checkSource(`
universe u;
inductive Eq(A: Sort u, a: A): A → Prop {
  | refl: Eq(A, a, a);
}
axiom A: Type;
axiom a: A;
axiom P: ∀ (b: A), Eq.{1}(A, a, b) → Prop;
axiom h: P(a, Eq.refl.{1}(A, a));
theorem t: P(a, Eq.refl.{1}(A, a)) := @Eq.rec.{0, 1}(A, a, P, h, a, Eq.refl.{1}(A, a));
`);
const envIota=new Environment();for(const d of eqIota.artifact.declarations)checkAndAddDeclaration(envIota,d);
const theorem=eqIota.artifact.declarations.find(d=>d.name==="t");
assert.ok(theorem&&theorem.kind==="theorem");
assert.equal(pretty(kernelWhnf(envIota,theorem.value)),"h");

let badRejected=false;
try{
  checkSource(`
inductive BadEq(A: Type, a: A, b: A): A → Prop {
  | bad: BadEq(A, b, a, a);
}
`);
}catch(e){badRejected=/codomain parameter|uniform family parameter|result parameter 1|uniform parameter/i.test(String(e));}
assert.equal(badRejected,true,"kernel must reject nonuniform constructor result parameters");
console.log("✓ K1c indexed admission, singleton recursor, and Eq bootstrap tests passed");

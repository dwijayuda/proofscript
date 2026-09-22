import Lean4Lean.Verify.Environment.Primitive.Basic

namespace Lean4Lean.PSKernelKA95
open Lean
open Lean4Lean
open Lean4Lean.Primitive
open Lean4Lean.TypeChecker
open Kernel

/-- KA-95 bridge: the checked `Nat.bitwise` type pins the model type equation. -/
theorem translated_mkTyEqBitwise_wf {v : DefinitionVal} {ci' : VDefVal} {c : VContext}
    (P : Data v ci' c) (hnat : c.venv.contains ``Nat)
    (hb : c.venv.contains ``Bool)
    (h2 : v.type == q((Bool → Bool → Bool) → Nat → Nat → Nat)) :
    ci'.type = .forallE .boolOp2 .natOp2 := by
  exact Data.mkTyEqBitwise P hnat hb h2

/-- KA-95 bridge: checked binary Nat primitive types pin the translated model type equation. -/
theorem translated_mkTyEq_wf {v : DefinitionVal} {ci' : VDefVal} {c : VContext}
    (P : Data v ci' c) (hnat : c.venv.contains ``Nat) {codSrc : Expr}
    (hcodU : TrExprS.IsUnique codSrc)
    (hcod : TrTy c.venv c.lparams [(none, .vlam .nat), (none, .vlam .nat)] codSrc)
    {n₁ n₂ : Name} {d₁ d₂ : MData} {bi₁ bi₂ : BinderInfo}
    (h2 : v.type == Expr.forallE n₁ (.mdata d₁ q(Nat))
      (.forallE n₂ (.mdata d₂ q(Nat)) codSrc bi₂) bi₁) :
    ci'.type = .forallE .nat (.forallE .nat hcod.tgt) := by
  exact Data.mkTyEq P hnat hcodU hcod h2

/-- KA-95 bridge: checked unary Nat primitive types pin the translated model type equation. -/
theorem translated_mkTyEq1_wf {v : DefinitionVal} {ci' : VDefVal} {c : VContext}
    (P : Data v ci' c) (hnat : c.venv.contains ``Nat) {codSrc : Expr}
    (hcodU : TrExprS.IsUnique codSrc)
    (hcod : TrTy c.venv c.lparams [(none, .vlam .nat)] codSrc)
    {n₁ : Name} {d₁ : MData} {bi₁ : BinderInfo}
    (h2 : v.type == Expr.forallE n₁ (.mdata d₁ q(Nat)) codSrc bi₁) :
    ci'.type = .forallE .nat hcod.tgt := by
  exact Data.mkTyEq1 P hnat hcodU hcod h2

end Lean4Lean.PSKernelKA95

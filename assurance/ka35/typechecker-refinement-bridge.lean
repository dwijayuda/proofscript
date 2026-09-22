import Lean4Lean.Verify.TypeChecker

/-
KA-35 direct Lean4Lean typechecker refinement bridge.

This file deliberately imports the real Lean4Lean executable typechecker
verification surface. It only re-exposes conditional wrapper lemmas for core
TypeChecker operations. It does not add PSKernel trusted computation rules,
does not prove PSKernel's executable checker refines Lean4Lean end-to-end,
and does not claim full Lean 4 equivalence.
-/

namespace PSKernelKA35

open Lean4Lean
open Lean hiding Environment Exception
open Kernel
/-- Weak-head normalization preserves translation/typing according to Lean4Lean's real checker proof. -/
theorem translated_whnf_refines_typing
    {e : Expr} {e' : VExpr} {c : Lean4Lean.TypeChecker.VContext} {s : Lean4Lean.TypeChecker.VState}
    (he : c.TrExprS e e') :
    Lean4Lean.TypeChecker.M.WF c s (Lean4Lean.TypeChecker.whnf e) fun e₁ _ => c.FVarsBelow e e₁ ∧ c.TrExpr e₁ e' := by
  exact Lean4Lean.TypeChecker.whnf.WF he

/-- Core weak-head normalization preserves translation/typing according to Lean4Lean's real checker proof. -/
theorem translated_whnfCore_refines_typing
    {e : Expr} {e' : VExpr} {c : Lean4Lean.TypeChecker.VContext} {s : Lean4Lean.TypeChecker.VState}
    (he : c.TrExprS e e') :
    Lean4Lean.TypeChecker.M.WF c s (Lean4Lean.TypeChecker.whnfCore e) fun e₁ _ => c.FVarsBelow e e₁ ∧ c.TrExpr e₁ e' := by
  exact Lean4Lean.TypeChecker.whnfCore.WF he

/-- Type inference returns a translated typing derivation according to Lean4Lean's real checker proof. -/
theorem translated_inferType_refines_typing
    {e : Expr} {e' : VExpr} {inferOnly : Bool} {c : Lean4Lean.TypeChecker.VContext} {s : Lean4Lean.TypeChecker.VState}
    (he : c.TrExprS e e') :
    Lean4Lean.TypeChecker.M.WF c s (Lean4Lean.TypeChecker.inferType e inferOnly) fun ty _ => ∃ ty', c.TrTyping e ty e' ty' := by
  exact Lean4Lean.TypeChecker.inferType.WF he

/-- Check-type is the non-inferOnly inference entry point and has Lean4Lean's typing proof. -/
theorem translated_checkType_refines_typing
    {e : Expr} {c : Lean4Lean.TypeChecker.VContext} {s : Lean4Lean.TypeChecker.VState}
    (h1 : e.FVarsIn (· ∈ c.vlctx.fvars)) :
    Lean4Lean.TypeChecker.M.WF c s (Lean4Lean.TypeChecker.checkType e) fun ty _ => ∃ e' ty', c.TrTyping e ty e' ty' := by
  exact Lean4Lean.TypeChecker.checkType.WF h1

/-- Definitional equality success is sound with respect to Lean4Lean's translated equality relation. -/
theorem translated_isDefEq_refines_defeq
    {e₁ : Expr} {e₁' : VExpr} {e₂ : Expr} {e₂' : VExpr} {c : Lean4Lean.TypeChecker.VContext} {s : Lean4Lean.TypeChecker.VState}
    (he₁ : c.TrExprS e₁ e₁') (he₂ : c.TrExprS e₂ e₂') :
    Lean4Lean.TypeChecker.M.WF c s (Lean4Lean.TypeChecker.isDefEq e₁ e₂) fun b _ => b = true → c.IsDefEqU e₁' e₂' := by
  exact Lean4Lean.TypeChecker.isDefEq.WF he₁ he₂

end PSKernelKA35

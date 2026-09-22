import Lean4Lean.Verify.TypeChecker.Basic
import Lean4Lean.Verify.TypeChecker.IsDefEq

namespace Lean4Lean.PSKernelKA69
open Lean
open Lean4Lean
open Lean4Lean.TypeChecker

/-- KA-69 bridge: projected application unfolding preserves free-variable and translated-expression evidence. -/
theorem translated_tryUnfoldProjApp_wf {c : VContext} {s : VState}
    {e : Expr} {e' : VExpr}
    (he : c.TrExprS e e') :
    (Lean4Lean.TypeChecker.Inner.tryUnfoldProjApp e).WF c s fun oe _ =>
      ∀ e₁, oe = some e₁ → c.FVarsBelow e e₁ ∧ c.TrExpr e₁ e' := by
  exact Lean4Lean.TypeChecker.Inner.tryUnfoldProjApp.WF he

/-- KA-69 bridge: one lazy-delta DefEq reduction step preserves reduction-status evidence. -/
theorem translated_lazyDeltaReductionStep_wf {c : VContext} {s : VState}
    {e₁ e₂ : Expr} {e₁' e₂' : VExpr}
    (he₁ : c.TrExprS e₁ e₁') (he₂ : c.TrExprS e₂ e₂') :
    (Lean4Lean.TypeChecker.Inner.lazyDeltaReductionStep e₁ e₂).WF c s fun r _ =>
      r.WF c e₁' e₂' true := by
  exact Lean4Lean.TypeChecker.Inner.lazyDeltaReductionStep.WF he₁ he₂

/-- KA-69 bridge: bounded lazy-delta loop preserves reduction-status evidence. -/
theorem translated_lazyDeltaReductionLoop_wf {c : VContext} {s : VState}
    {e₁ e₂ : Expr} {e₁' e₂' : VExpr} {n : Nat}
    (he₁ : c.TrExprS e₁ e₁') (he₂ : c.TrExprS e₂ e₂') :
    (Lean4Lean.TypeChecker.Inner.lazyDeltaReduction.loop e₁ e₂ n).WF c s fun r _ =>
      r.WF c e₁' e₂' := by
  exact Lean4Lean.TypeChecker.Inner.lazyDeltaReduction.loop.WF he₁ he₂

/-- KA-69 bridge: string literal DefEq expansion preserves translated equivalence on success. -/
theorem translated_tryStringLitExpansion_wf {c : VContext} {s : VState}
    {e₁ e₂ : Expr} {e₁' e₂' : VExpr}
    (he₁ : c.TrExprS e₁ e₁') (he₂ : c.TrExprS e₂ e₂') :
    RecM.WF c s (Lean4Lean.TypeChecker.Inner.tryStringLitExpansion e₁ e₂) fun b _ =>
      b = .true → c.IsDefEqU e₁' e₂' := by
  exact Lean4Lean.TypeChecker.Inner.tryStringLitExpansion.WF he₁ he₂

end Lean4Lean.PSKernelKA69

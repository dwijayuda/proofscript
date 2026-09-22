import Lean4Lean.Verify.TypeChecker.Basic
import Lean4Lean.Verify.TypeChecker.IsDefEq

namespace Lean4Lean.PSKernelKA66
open Lean
open Lean4Lean
open Lean4Lean.TypeChecker

/-- KA-66 bridge: top-level definitional equality preserves translated equivalence on success. -/
theorem translated_isDefEqCore_wf {c : VContext} {s : VState}
    {e₁ e₂ : Expr} {e₁' e₂' : VExpr}
    (he₁ : c.TrExprS e₁ e₁') (he₂ : c.TrExprS e₂ e₂') :
    RecM.WF c s (Lean4Lean.TypeChecker.Inner.isDefEqCore e₁ e₂) fun b _ =>
      b → c.IsDefEqU e₁' e₂' := by
  exact Lean4Lean.TypeChecker.Inner.isDefEqCore.WF he₁ he₂

/-- KA-66 bridge: recursive definitional equality preserves translated equivalence on true. -/
theorem translated_isDefEqCore_prime_wf {c : VContext} {s : VState}
    {e₁ e₂ : Expr} {e₁' e₂' : VExpr}
    (he₁ : c.TrExprS e₁ e₁') (he₂ : c.TrExprS e₂ e₂') :
    RecM.WF c s (Lean4Lean.TypeChecker.Inner.isDefEqCore' e₁ e₂) fun b _ =>
      b = true → c.IsDefEqU e₁' e₂' := by
  exact Lean4Lean.TypeChecker.Inner.isDefEqCore'.WF he₁ he₂

/-- KA-66 bridge: quick DefEq preserves translated equivalence whenever it returns true. -/
theorem translated_quickIsDefEq_wf {c : VContext} {s : VState}
    {e₁ e₂ : Expr} {e₁' e₂' : VExpr} {useHash : Bool}
    (he₁ : c.TrExprS e₁ e₁') (he₂ : c.TrExprS e₂ e₂') :
    RecM.WF c s (Lean4Lean.TypeChecker.Inner.quickIsDefEq e₁ e₂ useHash) fun b _ =>
      b = .true → c.IsDefEqU e₁' e₂' := by
  exact Lean4Lean.TypeChecker.Inner.quickIsDefEq.WF he₁ he₂

/-- KA-66 bridge: argument DefEq preserves translated equivalence under equivalent application heads. -/
theorem translated_isDefEqArgs_wf {c : VContext} {s : VState}
    {e₁ e₂ : Expr} {e₁' e₂' : VExpr}
    (H : ∃ e₁'', c.TrExprS e₁.getAppFn e₁'' ∧
      ∃ e₂'', c.TrExprS e₂.getAppFn e₂'' ∧ c.IsDefEqU e₁'' e₂'')
    (he₁ : c.TrExprS e₁ e₁') (he₂ : c.TrExprS e₂ e₂') :
    RecM.WF c s (Lean4Lean.TypeChecker.Inner.isDefEqArgs e₁ e₂) fun b _ =>
      b → c.IsDefEqU e₁' e₂' := by
  exact Lean4Lean.TypeChecker.Inner.isDefEqArgs.WF H he₁ he₂

end Lean4Lean.PSKernelKA66

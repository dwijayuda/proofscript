import Lean4Lean.Verify.TypeChecker.Basic
import Lean4Lean.Verify.TypeChecker.IsDefEq

namespace Lean4Lean.PSKernelKA70
open Lean
open Lean4Lean
open Lean4Lean.TypeChecker

/-- KA-70 bridge: string literal core expansion preserves translated DefEq evidence on success. -/
theorem translated_tryStringLitExpansionCore_wf {c : VContext} {s : VState}
    {e₁ e₂ : Expr} {e₁' e₂' : VExpr}
    (he₁ : c.TrExprS e₁ e₁') (he₂ : c.TrExprS e₂ e₂') :
    RecM.WF c s (Lean4Lean.TypeChecker.Inner.tryStringLitExpansionCore e₁ e₂) fun b _ =>
      b = .true → c.IsDefEqU e₁' e₂' := by
  exact Lean4Lean.TypeChecker.Inner.tryStringLitExpansionCore.WF he₁ he₂

/-- KA-70 bridge: unit-like DefEq shortcut preserves translated DefEq evidence on success. -/
theorem translated_isDefEqUnitLike_wf {c : VContext} {s : VState}
    {e₁ e₂ : Expr} {e₁' e₂' : VExpr}
    (he₁ : c.TrExprS e₁ e₁') (he₂ : c.TrExprS e₂ e₂') :
    RecM.WF c s (Lean4Lean.TypeChecker.Inner.isDefEqUnitLike e₁ e₂) fun b _ =>
      b = .true → c.IsDefEqU e₁' e₂' := by
  exact Lean4Lean.TypeChecker.Inner.isDefEqUnitLike.WF he₁ he₂

/-- KA-70 bridge: projected lazy-delta finish preserves translated DefEq evidence on success. -/
theorem translated_lazyDeltaProjReduction_finish_wf {c : VContext} {s : VState}
    {n₁ n₂ : Name} {i : Nat} {e₁ e₂ : Expr} {e₁' e₂' : VExpr}
    (he₁ : c.TrExprS (.proj n₁ i e₁) e₁') (he₂ : c.TrExprS (.proj n₂ i e₂) e₂') :
    (Lean4Lean.TypeChecker.Inner.lazyDeltaProjReduction.finish i e₁ e₂).WF c s fun r _ =>
      r → c.IsDefEqU e₁' e₂' := by
  exact Lean4Lean.TypeChecker.Inner.lazyDeltaProjReduction.finish.WF he₁ he₂

/-- KA-70 bridge: projected lazy-delta loop preserves translated DefEq evidence on success. -/
theorem translated_lazyDeltaProjReduction_loop_wf {c : VContext} {s : VState}
    {n₁ n₂ : Name} {i n : Nat} {e₁ e₂ : Expr} {e₁' e₂' : VExpr}
    (he₁ : c.TrExprS (.proj n₁ i e₁) e₁') (he₂ : c.TrExprS (.proj n₂ i e₂) e₂') :
    (Lean4Lean.TypeChecker.Inner.lazyDeltaProjReduction.loop i e₁ e₂ n).WF c s fun r _ =>
      r → c.IsDefEqU e₁' e₂' := by
  exact Lean4Lean.TypeChecker.Inner.lazyDeltaProjReduction.loop.WF he₁ he₂

end Lean4Lean.PSKernelKA70

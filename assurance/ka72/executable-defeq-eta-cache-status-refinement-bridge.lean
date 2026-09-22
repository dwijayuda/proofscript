import Lean4Lean.Verify.TypeChecker.Basic
import Lean4Lean.Verify.TypeChecker.IsDefEq

namespace Lean4Lean.PSKernelKA72
open Lean
open Lean4Lean
open Lean4Lean.TypeChecker

/-- KA-72 bridge: eta-expansion core preserves translated DefEq evidence on success. -/
theorem translated_tryEtaExpansionCore_wf {c : VContext} {s : VState}
    {e₁ e₂ : Expr} {e₁' e₂' : VExpr}
    (he₁ : c.TrExprS e₁ e₁') (he₂ : c.TrExprS e₂ e₂') :
    RecM.WF c s (Lean4Lean.TypeChecker.Inner.tryEtaExpansionCore e₁ e₂) fun b _ =>
      b → c.IsDefEqU e₁' e₂' := by
  exact Lean4Lean.TypeChecker.Inner.tryEtaExpansionCore.WF he₁ he₂

/-- KA-72 bridge: cache-failure mutation is well-formed and produces no semantic proof claim. -/
theorem translated_cacheFailure_wf {c : VContext} {s : VState}
    {e₁ e₂ : Expr} :
    (Lean4Lean.TypeChecker.Inner.cacheFailure e₁ e₂).WF c s fun _ _ => True := by
  exact Lean4Lean.TypeChecker.Inner.cacheFailure.WF

/-- KA-72 bridge: boolean reduction status preserves translated reduction evidence. -/
theorem translated_reductionStatus_bool_wf {c : VContext} {e₁ e₂ : Expr} {e₁' e₂' : VExpr}
    {allowContinue b : Bool}
    (h₁ : c.TrExpr e₁ e₁') (h₂ : c.TrExpr e₂ e₂')
    (h : b = true → c.IsDefEqU e₁' e₂') :
    Lean4Lean.TypeChecker.ReductionStatus.WF c e₁' e₂' allowContinue
      (Lean4Lean.TypeChecker.ReductionStatus.bool e₁ e₂ b) := by
  exact Lean4Lean.TypeChecker.ReductionStatus.WF.bool h₁ h₂ h

/-- KA-72 bridge: reduction status evidence transports across translated DefEq endpoints. -/
theorem translated_reductionStatus_defeq_wf {c : VContext}
    {e₁' e₂' e₁'' e₂'' : VExpr} {ac : Bool} {r : Lean4Lean.TypeChecker.ReductionStatus}
    (h₁ : c.IsDefEqU e₁' e₁'') (h₂ : c.IsDefEqU e₂' e₂'')
    (H : Lean4Lean.TypeChecker.ReductionStatus.WF c e₁' e₂' ac r) :
    Lean4Lean.TypeChecker.ReductionStatus.WF c e₁'' e₂'' ac r := by
  exact Lean4Lean.TypeChecker.ReductionStatus.WF.defeq h₁ h₂ H

end Lean4Lean.PSKernelKA72

import Lean4Lean.Verify.TypeChecker.Basic
import Lean4Lean.Verify.TypeChecker.IsDefEq

namespace Lean4Lean.PSKernelKA67
open Lean
open Lean4Lean
open Lean4Lean.TypeChecker

/-- KA-67 bridge: lambda DefEq recursive binder path preserves translated equivalence. -/
theorem translated_isDefEqLambda_wf {c : VContext} {s : VState}
    {m} [mwf : c.MLCWF m]
    {e₁ e₂ : Expr} {subst : Array Expr} {fvs : List Expr}
    {ei₁' ei₂' : VExpr}
    (hsubst : subst.toList.reverse = fvs)
    (he₁ : (c.withMLC m).TrExprS (e₁.instantiateList fvs) ei₁')
    (he₂ : (c.withMLC m).TrExprS (e₂.instantiateList fvs) ei₂') :
    RecM.WF (c.withMLC m) s (Lean4Lean.TypeChecker.Inner.isDefEqLambda e₁ e₂ subst) fun b _ =>
      b → (c.withMLC m).IsDefEqU ei₁' ei₂' := by
  exact Lean4Lean.TypeChecker.Inner.isDefEqLambda.WF hsubst he₁ he₂

/-- KA-67 bridge: forall DefEq recursive binder path preserves translated equivalence. -/
theorem translated_isDefEqForall_wf {c : VContext} {s : VState}
    {m} [mwf : c.MLCWF m]
    {e₁ e₂ : Expr} {subst : Array Expr} {fvs : List Expr}
    {ei₁' ei₂' : VExpr}
    (hsubst : subst.toList.reverse = fvs)
    (he₁ : (c.withMLC m).TrExprS (e₁.instantiateList fvs) ei₁')
    (he₂ : (c.withMLC m).TrExprS (e₂.instantiateList fvs) ei₂') :
    RecM.WF (c.withMLC m) s (Lean4Lean.TypeChecker.Inner.isDefEqForall e₁ e₂ subst) fun b _ =>
      b → (c.withMLC m).IsDefEqU ei₁' ei₂' := by
  exact Lean4Lean.TypeChecker.Inner.isDefEqForall.WF hsubst he₁ he₂

/-- KA-67 bridge: application DefEq path preserves translated equivalence. -/
theorem translated_isDefEqApp_wf {c : VContext} {s : VState}
    {e₁ e₂ : Expr} {e₁' e₂' : VExpr}
    (he₁ : c.TrExprS e₁ e₁') (he₂ : c.TrExprS e₂ e₂') :
    RecM.WF c s (Lean4Lean.TypeChecker.Inner.isDefEqApp e₁ e₂) fun b _ =>
      b → c.IsDefEqU e₁' e₂' := by
  exact Lean4Lean.TypeChecker.Inner.isDefEqApp.WF he₁ he₂

/-- KA-67 bridge: eta-expansion DefEq path preserves translated equivalence. -/
theorem translated_tryEtaExpansion_wf {c : VContext} {s : VState}
    {e₁ e₂ : Expr} {e₁' e₂' : VExpr}
    (he₁ : c.TrExprS e₁ e₁') (he₂ : c.TrExprS e₂ e₂') :
    RecM.WF c s (Lean4Lean.TypeChecker.Inner.tryEtaExpansion e₁ e₂) fun b _ =>
      b → c.IsDefEqU e₁' e₂' := by
  exact Lean4Lean.TypeChecker.Inner.tryEtaExpansion.WF he₁ he₂

end Lean4Lean.PSKernelKA67

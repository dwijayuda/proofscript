import Lean4Lean.Verify.TypeChecker.Basic
import Lean4Lean.Verify.TypeChecker.IsDefEq

namespace Lean4Lean.PSKernelKA68
open Lean
open Lean4Lean
open Lean4Lean.TypeChecker

/-- KA-68 bridge: sort-level extraction preserves translated sort typing evidence. -/
theorem translated_getSortLevel_wf {c : VContext} {s : VState}
    {e : Expr} {e' : VExpr}
    (he : c.TrExprS e e') :
    (Lean4Lean.TypeChecker.Inner.getSortLevel e).WF c s fun l _ =>
      ∃ u', VLevel.ofLevel c.lparams l = some u' ∧ c.HasType e' (.sort u') := by
  exact Lean4Lean.TypeChecker.Inner.getSortLevel.WF he

/-- KA-68 bridge: proposition recognition produces sort-zero typing evidence. -/
theorem translated_isProp_wf {c : VContext} {s : VState}
    {e : Expr} {e' : VExpr}
    (he : c.TrExprS e e') :
    (Lean4Lean.TypeChecker.Inner.isProp e).WF c s fun b _ =>
      b → c.HasType e' (.sort .zero) := by
  exact Lean4Lean.TypeChecker.Inner.isProp.WF he

/-- KA-68 bridge: proof-irrelevance DefEq path preserves translated equivalence on success. -/
theorem translated_isDefEqProofIrrel_wf {c : VContext} {s : VState}
    {e₁ e₂ : Expr} {e₁' e₂' : VExpr}
    (he₁ : c.TrExprS e₁ e₁') (he₂ : c.TrExprS e₂ e₂') :
    RecM.WF c s (Lean4Lean.TypeChecker.Inner.isDefEqProofIrrel e₁ e₂) fun b _ =>
      b = .true → c.IsDefEqU e₁' e₂' := by
  exact Lean4Lean.TypeChecker.Inner.isDefEqProofIrrel.WF he₁ he₂

/-- KA-68 bridge: Nat-offset DefEq path preserves translated equivalence on success. -/
theorem translated_isDefEqOffset_wf {c : VContext} {s : VState}
    {e₁ e₂ : Expr} {e₁' e₂' : VExpr}
    (he₁ : c.TrExprS e₁ e₁') (he₂ : c.TrExprS e₂ e₂') :
    (Lean4Lean.TypeChecker.Inner.isDefEqOffset e₁ e₂).WF c s fun b _ =>
      b = .true → c.IsDefEqU e₁' e₂' := by
  exact Lean4Lean.TypeChecker.Inner.isDefEqOffset.WF he₁ he₂

end Lean4Lean.PSKernelKA68

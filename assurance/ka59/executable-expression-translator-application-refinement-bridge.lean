import Lean4Lean.Verify.Typing.Lemmas

namespace Lean4Lean.PSKernelKA59
open Lean
open Lean4Lean

/-- KA-59 bridge: free-variable membership through reversed application lists. -/
theorem translated_fvarsIn_mkAppRevList_wf
    {P : FVarId → Prop} {e : Expr} {es : List Expr} :
    FVarsIn P (e.mkAppRevList es) ↔ FVarsIn P e ∧ ∀ a ∈ es, FVarsIn P a := by
  exact FVarsIn.mkAppRevList

/-- KA-59 bridge: free-variable membership through forward application lists. -/
theorem translated_fvarsIn_mkAppList_wf
    {P : FVarId → Prop} {e : Expr} {es : List Expr} :
    FVarsIn P (e.mkAppList es) ↔ FVarsIn P e ∧ ∀ a ∈ es, FVarsIn P a := by
  exact FVarsIn.mkAppList

/-- KA-59 bridge: free-variable-below preservation through forward application lists. -/
theorem translated_fvarsBelow_mkAppList_wf
    {Δ : VLCtx} {e₁ e₂ : Expr} {es : List Expr}
    (H : FVarsBelow Δ e₁ e₂) :
    FVarsBelow Δ (e₁.mkAppList es) (e₂.mkAppList es) := by
  exact FVarsBelow.mkAppList H

/-- KA-59 bridge: free-variable-below preservation through reversed application lists. -/
theorem translated_fvarsBelow_mkAppRevList_wf
    {Δ : VLCtx} {e₁ e₂ : Expr} {es : List Expr}
    (H : FVarsBelow Δ e₁ e₂) :
    FVarsBelow Δ (e₁.mkAppRevList es) (e₂.mkAppRevList es) := by
  exact FVarsBelow.mkAppRevList H

end Lean4Lean.PSKernelKA59

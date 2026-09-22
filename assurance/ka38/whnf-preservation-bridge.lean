import Lean4Lean.Theory.Typing.HeadReduction

/-
KA-38 direct Lean4Lean WHNF preservation bridge.

KA-37 exposed the real Lean4Lean head-reduction constructors and basic
WHRedS determinism. KA-38 extends that proof surface to the preservation facts
needed before an executable PSKernel WHNF/refiner correspondence can be stated:
single-step determinism, WHRed/WHRedS definitional-equality preservation,
WHRed/WHRedS type preservation, and WHNF fixed points under WHRedS.

This is still a theory-level bridge. It does not prove PSKernel's executable
WHNF algorithm refines Lean4Lean, and it does not cover recursor/projection/iota
or quotient computation behavior end-to-end.
-/

namespace PSKernelKA38
open Lean4Lean
open Lean4Lean.VEnv
open Lean4Lean.VEnv.Params
open Lean4Lean.VExpr
variable [Lean4Lean.VEnv.Params]

/-- Lean4Lean single-step weak-head reduction is deterministic. -/
theorem translated_whred_single_step_deterministic {Γ : List VExpr} {e e₁ e₂ : VExpr}
    (h1 : WHRed Γ e e₁) (h2 : WHRed Γ e e₂) : e₁ = e₂ := by
  exact WHRed.determ h1 h2

/-- Lean4Lean single-step weak-head reduction preserves definitional equality. -/
theorem translated_whred_defeq_preservation {Γ : List VExpr} {e₁ e₂ A : VExpr}
    (hΓ : OnCtx Γ (IsType env univs))
    (h : WHRed Γ e₁ e₂) (he : HasType env univs Γ e₁ A) :
    IsDefEq env univs Γ e₁ e₂ A := by
  exact h.defeq hΓ he

/-- Lean4Lean single-step weak-head reduction preserves typing. -/
theorem translated_whred_type_preservation {Γ : List VExpr} {e₁ e₂ A : VExpr}
    (hΓ : OnCtx Γ (IsType env univs))
    (h : WHRed Γ e₁ e₂) (he : HasType env univs Γ e₁ A) :
    HasType env univs Γ e₂ A := by
  exact h.hasType hΓ he

/-- Lean4Lean multi-step weak-head reduction preserves definitional equality. -/
theorem translated_whreds_defeq_preservation {Γ : List VExpr} {e₁ e₂ A : VExpr}
    (hΓ : OnCtx Γ (IsType env univs))
    (h : WHRedS Γ e₁ e₂) (he : HasType env univs Γ e₁ A) :
    IsDefEq env univs Γ e₁ e₂ A := by
  exact h.defeq hΓ he

/-- Lean4Lean multi-step weak-head reduction preserves typing. -/
theorem translated_whreds_type_preservation {Γ : List VExpr} {e₁ e₂ A : VExpr}
    (hΓ : OnCtx Γ (IsType env univs))
    (h : WHRedS Γ e₁ e₂) (he : HasType env univs Γ e₁ A) :
    HasType env univs Γ e₂ A := by
  exact h.hasType hΓ he

/-- A Lean4Lean WHNF expression is fixed by multi-step weak-head reduction. -/
theorem translated_whnf_whreds_fixed_point {Γ : List VExpr} {e e' : VExpr}
    (h : WHNF Γ e) (hs : WHRedS Γ e e') : e = e' := by
  exact h.whRedS hs

end PSKernelKA38

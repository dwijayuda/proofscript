import Lean4Lean.Theory.Typing.HeadReduction

/-
KA-37 direct Lean4Lean WHNF/head-reduction bridge.

This imports the real Lean4Lean theory-level head-reduction surface and
re-exposes a small conditional bridge for the WHNF constructors and head
reduction/WHRedS facts that PSKernel must eventually refine. This is not an
end-to-end executable PSKernel WHNF/refinement proof and it does not yet cover
recursor/projection/iota reduction behavior.
-/

namespace PSKernelKA37
open Lean4Lean
open Lean4Lean.VEnv
open Lean4Lean.VExpr
variable [Lean4Lean.VEnv.Params]

/-- Lean4Lean marks bound variables as head-normal forms. -/
theorem translated_whnf_bvar_head_normal {Γ : List VExpr} {i : Nat} : WHNF Γ (.bvar i) := by
  exact WHNF.bvar

/-- Lean4Lean marks lambdas as head-normal forms. -/
theorem translated_whnf_lam_head_normal {Γ : List VExpr} {A e : VExpr} : WHNF Γ (.lam A e) := by
  exact WHNF.lam

/-- Lean4Lean marks sorts as head-normal forms. -/
theorem translated_whnf_sort_head_normal {Γ : List VExpr} {u : VLevel} : WHNF Γ (.sort u) := by
  exact WHNF.sort

/-- Lean4Lean marks dependent function types as head-normal forms. -/
theorem translated_whnf_forall_head_normal {Γ : List VExpr} {A B : VExpr} : WHNF Γ (.forallE A B) := by
  exact WHNF.forallE

/-- Lean4Lean has the β head-reduction step. -/
theorem translated_whred_beta_step {Γ : List VExpr} {A e a : VExpr} : WHRed Γ (.app (.lam A e) a) (e.inst a) := by
  exact WHRed.beta

/-- Lean4Lean has head-reduction congruence on application heads. -/
theorem translated_whred_app_congruence {Γ : List VExpr} {f f' a : VExpr}
    (h : WHRed Γ f f') : WHRed Γ (.app f a) (.app f' a) := by
  exact WHRed.app h

/-- Lean4Lean lifts multi-step weak-head reduction through application heads. -/
theorem translated_whreds_app_congruence {Γ : List VExpr} {f f' a : VExpr}
    (h : WHRedS Γ f f') : WHRedS Γ (.app f a) (.app f' a) := by
  exact WHRedS.app h

/-- Lean4Lean proves determinism of WHRedS endpoints when both endpoints are WHNF. -/
theorem translated_whreds_deterministic {Γ : List VExpr} {e e₁ e₂ : VExpr}
    (h1 : WHRedS Γ e e₁) (w1 : WHNF Γ e₁)
    (h2 : WHRedS Γ e e₂) (w2 : WHNF Γ e₂) : e₁ = e₂ := by
  exact WHRedS.determ h1 w1 h2 w2

end PSKernelKA37

import Lean4Lean.Verify.Environment.Primitive.Basic

namespace Lean4Lean.PSKernelKA101
open Lean
open Lean4Lean
open Lean4Lean.Primitive
open Lean4Lean.TypeChecker
open Kernel

/-- KA-101 bridge: Forall₂ is preserved by reversing both related lists. -/
theorem translated_forall2_rev_wf {α β} {R : α → β → Prop}
    {l₁ : List α} {l₂ : List β} (h : List.Forall₂ R l₁ l₂) :
    List.Forall₂ R l₁.reverse l₂.reverse := by
  exact List.Forall₂.rev h

/-- KA-101 bridge: translating the same free variable is unique. -/
theorem translated_trExpr_fvar_uniq_wf {env : VEnv} {Us Δ} {fv : FVarId} {e₁ e₂ : VExpr}
    (h₁ : TrExprS env Us Δ (.fvar fv) e₁) (h₂ : TrExprS env Us Δ (.fvar fv) e₂) :
    e₁ = e₂ := by
  exact TrExprS.fvar_uniq h₁ h₂

/-- KA-101 bridge: lists of translated free variables have unique target lists. -/
theorem translated_forall2_fvars_uniq_wf {env : VEnv} {Us Δ}
    {l : List Expr} {xs ys : List VExpr}
    (h₁ : l.Forall₂ (TrExprS env Us Δ) xs)
    (h₂ : l.Forall₂ (TrExprS env Us Δ) ys)
    (hfv : ∀ e ∈ l, ∃ fv, e = .fvar fv) :
    xs = ys := by
  exact List.Forall₂.fvars_uniq h₁ h₂ hfv

/-- KA-101 bridge: extending a substitution by a whole telescope leaves later indices unchanged. -/
theorem translated_subst_consN_add_wf (vs : List VExpr) (σ : VExpr.Subst) (j : Nat) :
    σ.consN vs (vs.length + j) = σ j := by
  exact VExpr.Subst.consN_add vs σ j

/-- KA-101 bridge: lifting over a telescope and then closing at that telescope cancels the lift. -/
theorem translated_liftN_subst_consN_wf {vs : List VExpr} {e : VExpr} {γ : VExpr.Subst} :
    (VExpr.liftN vs.length e 0).subst (γ.consN vs) = e.subst γ := by
  exact VExpr.liftN_subst_consN

end Lean4Lean.PSKernelKA101

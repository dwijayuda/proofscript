import Lean4Lean.Verify.Environment.Primitive.Basic

namespace Lean4Lean.PSKernelKA100
open Lean
open Lean4Lean
open Lean4Lean.Primitive
open Lean4Lean.TypeChecker
open Kernel

/-- KA-100 bridge: source translation may be moved under one more bound-variable binder. -/
theorem translated_trExpr_underBV_wf {env : VEnv} {Us : List Name} {Δ : VLCtx}
    {A : VExpr} {e : Expr} {e' : VExpr}
    (henv : env.Ordered) (hbv : Δ.NoBV) (H : TrExprS env Us Δ e e') :
    TrExprS env Us ((none, .vlam A) :: Δ) e e'.lift := by
  exact TrExprS.underBV henv hbv H

/-- KA-100 bridge: Forall₂ over an appended left list can be split into matching pieces. -/
theorem translated_forall2_append_inv_wf {α β} {R : α → β → Prop}
    {l₁ l₂ : List α} {m : List β}
    (h : List.Forall₂ R (l₁ ++ l₂) m) :
    ∃ m₁ m₂, m = m₁ ++ m₂ ∧ List.Forall₂ R l₁ m₁ ∧ List.Forall₂ R l₂ m₂ := by
  exact List.Forall₂.append_inv h

/-- KA-100 bridge: target application spines reassociate across appended argument lists. -/
theorem translated_vexpr_appN_append_wf (e : VExpr) (as bs : List VExpr) :
    e.appN (as ++ bs) = (e.appN as).appN bs := by
  exact VExpr.appN_append e as bs

/-- KA-100 bridge: a property known for both members of a pair holds for every list member. -/
theorem translated_forall_mem_pair_wf {α} {P : α → Prop} {a b : α}
    (ha : P a) (hb : P b) : ∀ t ∈ [a, b], P t := by
  exact List.forall_mem_pair ha hb

/-- KA-100 bridge: Forall₂ can be extended by matching singleton tails. -/
theorem translated_forall2_snoc_wf {α β} {R : α → β → Prop} {a : α} {b : β}
    (hab : R a b) {l₁ : List α} {l₂ : List β} (h : List.Forall₂ R l₁ l₂) :
    List.Forall₂ R (l₁ ++ [a]) (l₂ ++ [b]) := by
  exact List.Forall₂.snoc hab h

end Lean4Lean.PSKernelKA100

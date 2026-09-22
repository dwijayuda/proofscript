import Lean4Lean.Verify.Environment.Primitive.Basic

namespace Lean4Lean.PSKernelKA99
open Lean
open Lean4Lean
open Lean4Lean.Primitive
open Lean4Lean.TypeChecker
open Kernel

/-- KA-99 bridge: closed free-variable evidence propagates through source application spines. -/
theorem translated_fvarsIn_appN_wf {P : FVarId → Prop} {as : List Expr} {f : Expr}
    (hf : FVarsIn P f) (has : ∀ a ∈ as, FVarsIn P a) :
    FVarsIn P (f.appN as) := by
  exact FVarsIn.appN hf has

/-- KA-99 bridge: translation of a source application spine can be inverted into translated pieces. -/
theorem translated_trExpr_appN_inv_wf {env : VEnv} {Us : List Name} {Δ : VLCtx}
    {as : List Expr} {f : Expr} {X : VExpr}
    (H : TrExprS env Us Δ (f.appN as) X) :
    ∃ X₀ xs, X = X₀.appN xs ∧ TrExprS env Us Δ f X₀ ∧
      as.Forall₂ (TrExprS env Us Δ) xs := by
  exact TrExprS.appN_inv H

/-- KA-99 bridge: binary source applications invert into translated head and two arguments. -/
theorem translated_trExpr_app2_inv_wf {env : VEnv} {Us : List Name} {Δ : VLCtx}
    {f a b : Expr} {r : VExpr} (H : TrExprS env Us Δ (mkApp2 f a b) r) :
    ∃ f' a' b', TrExprS env Us Δ f f' ∧ TrExprS env Us Δ a a' ∧
      TrExprS env Us Δ b b' ∧ r = (f'.app a').app b' := by
  exact TrExprS.app2_inv H

/-- KA-99 bridge: translation at the empty local context produces closed target expressions. -/
theorem translated_trExpr_closedN_nil_wf {env : VEnv} {Us : List Name}
    {e : Expr} {e' : VExpr} (henv : env.Ordered)
    (H : TrExprS env Us [] e e') : e'.ClosedN := by
  exact TrExprS.closedN_nil henv H

/-- KA-99 bridge: translating an fvar one vlam deeper uniquely lifts the prior target. -/
theorem translated_trExpr_fvar_lift_uniq_wf {env : VEnv} {Us : List Name} {Δ : VLCtx}
    {fv : FVarId} {A t e : VExpr}
    (h₁ : TrExprS env Us Δ (.fvar fv) t)
    (h₂ : TrExprS env Us ((none, .vlam A) :: Δ) (.fvar fv) e) : e = t.lift := by
  exact TrExprS.fvar_lift_uniq h₁ h₂

end Lean4Lean.PSKernelKA99

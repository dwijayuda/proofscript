import Lean4Lean.Verify.Environment.Primitive.Basic

namespace Lean4Lean.PSKernelKA103
open Lean
open Lean4Lean
open Lean4Lean.Primitive
open Lean4Lean.TypeChecker
open Kernel

/-- KA-103 bridge: a context suffix remains valid after peeling outer appended binders. -/
theorem translated_onctx_of_append_wf {P : List VExpr → VExpr → Prop} {l Γ : List VExpr} :
    OnCtx (l ++ Γ) P → OnCtx Γ P := by
  exact OnCtx.of_append

/-- KA-103 bridge: a well-formed application has well-formed function and argument halves. -/
theorem translated_vexpr_wf_app_inv2_wf {env : VEnv} {U Γ} (henv : VEnv.Ordered env)
    (hΓ : OnCtx Γ (env.IsType U)) {f a : VExpr}
    (H : VExpr.WF env U Γ (f.app a)) : VExpr.WF env U Γ f ∧ VExpr.WF env U Γ a := by
  exact VExpr.WF.app_inv₂ henv hΓ H

/-- KA-103 bridge: a well-formed application spine has a well-formed head. -/
theorem translated_vexpr_wf_appN_inv_wf {env : VEnv} {U Γ} (henv : VEnv.Ordered env)
    (hΓ : OnCtx Γ (env.IsType U)) {vs : List VExpr} {e : VExpr}
    (H : VExpr.WF env U Γ (e.appN vs)) : VExpr.WF env U Γ e := by
  exact VExpr.WF.appN_inv henv hΓ H

/-- KA-103 bridge: definitional equality of heads lifts through a well-formed application spine. -/
theorem translated_isDefEqU_appN_wf {env : VEnv} {U Γ} (henv : VEnv.WF env)
    (hΓ : OnCtx Γ (env.IsType U)) {vs : List VExpr} {f g : VExpr}
    (hfg : env.IsDefEqU U Γ f g) (hwf : VExpr.WF env U Γ (f.appN vs)) :
    env.IsDefEqU U Γ (f.appN vs) (g.appN vs) := by
  exact VEnv.IsDefEqU.appN henv hΓ hfg hwf

/-- KA-103 bridge: Nat-typed arguments fit the all-`Nat` telescope. -/
theorem translated_argsTyped_natTelescope_wf {env : VEnv} {U Γ₀} {τ : List VExpr} {σ : VExpr.Subst}
    (h : ∀ t ∈ τ, env.HasType U Γ₀ t VExpr.nat) :
    VExpr.ArgsTyped env U Γ₀ (List.replicate τ.length VExpr.nat) σ τ := by
  exact VExpr.ArgsTyped.natTelescope h

end Lean4Lean.PSKernelKA103

import Lean4Lean.Verify.Environment.Primitive.Basic

namespace Lean4Lean.PSKernelKA105
open Lean
open Lean4Lean
open Lean4Lean.Primitive
open Lean4Lean.TypeChecker
open Kernel

/-- KA-105 bridge: whole-spine definitional equality congruence, including arguments. -/
theorem translated_isDefEqU_appN_prime_wf {env : VEnv} {U Γ} (henv : VEnv.WF env)
    (hΓ : OnCtx Γ (env.IsType U)) {xs ys : List VExpr} {f f' : VExpr}
    (hf : env.IsDefEqU U Γ f f')
    (hxs : List.Forall₂ (env.IsDefEqU U Γ) xs ys)
    (hwf : VExpr.WF env U Γ (f.appN xs)) :
    env.IsDefEqU U Γ (f.appN xs) (f'.appN ys) := by
  exact VEnv.IsDefEqU.appN' henv hΓ hf hxs hwf

/-- KA-105 bridge: expression translation preserves an application spine when the result is well formed. -/
theorem translated_trExprS_appN_wf {env : VEnv} {Us Δ} (henv : VEnv.Ordered env)
    (hΔ : OnCtx Δ.toCtx (env.IsType Us.length)) {as : List Expr} {xs : List VExpr}
    {f : Expr} {f' : VExpr}
    (hf : TrExprS env Us Δ f f')
    (hxs : as.Forall₂ (TrExprS env Us Δ) xs)
    (hwf : VExpr.WF env Us.length Δ.toCtx (f'.appN xs)) :
    TrExprS env Us Δ (f.appN as) (f'.appN xs) := by
  exact TrExprS.appN henv hΔ hf hxs hwf

/-- KA-105 bridge: definitional equality congruence in an application argument. -/
theorem translated_isDefEqU_app_arg_wf {env : VEnv} {U Γ} (henv : VEnv.WF env)
    (hΓ : OnCtx Γ (env.IsType U)) {f a a' A B : VExpr}
    (hf : env.HasType U Γ f (.forallE A B)) (ha : env.HasType U Γ a A)
    (h : env.IsDefEqU U Γ a a') :
    env.IsDefEqU U Γ (f.app a) (f.app a') := by
  exact VEnv.IsDefEqU.app_arg henv hΓ hf ha h

/-- KA-105 bridge: recover the context opened by a well-formed lambda telescope. -/
theorem translated_vexpr_lams_ctx_wf {env : VEnv} {U Γ} (henv : VEnv.Ordered env)
    {As : List VExpr} {e : VExpr}
    (hΓ : OnCtx Γ (env.IsType U))
    (hwf : VExpr.WF env U Γ (VExpr.lams As e)) :
    OnCtx (As.reverse ++ Γ) (env.IsType U) := by
  exact VExpr.lams_ctx henv hΓ hwf

/-- KA-105 bridge: recover telescope closing, beta equality, and argument typing for lambda-spine application. -/
theorem translated_vexpr_lams_appN_wf {env : VEnv} {U} {Γ₀ : List VExpr} (henv : VEnv.WF env)
    (hΓ₀ : OnCtx Γ₀ (env.IsType U)) {As : List VExpr} {Γ : List VExpr}
    (hctx : OnCtx (As.reverse ++ Γ) (env.IsType U)) {σ : VExpr.Subst}
    (hσ : VEnv.Ctx.SubstEq env U Γ₀ σ σ Γ) {vs : List VExpr} {e : VExpr}
    (hlen : vs.length = As.length)
    (hwf : VExpr.WF env U Γ₀ (((VExpr.lams As e).subst σ).appN vs)) :
    VEnv.Ctx.SubstEq env U Γ₀ (σ.consN vs) (σ.consN vs) (As.reverse ++ Γ) ∧
    env.IsDefEqU U Γ₀ (((VExpr.lams As e).subst σ).appN vs) (e.subst (σ.consN vs)) ∧
    VExpr.ArgsTyped env U Γ₀ As σ vs := by
  exact VExpr.lams_appN henv hΓ₀ hctx hσ hlen hwf

end Lean4Lean.PSKernelKA105

import Lean4Lean.Verify.Environment.Primitive.Basic

namespace Lean4Lean.PSKernelKA108
open Lean
open Lean4Lean
open Lean4Lean.Primitive
open Lean4Lean.TypeChecker
open Kernel

/-- KA-108 bridge: lams/application beta equation under prebuilt argument typing. -/
theorem translated_vexpr_lams_appN_prime_wf {env : VEnv} {U} {Γ₀ : List VExpr} (henv : VEnv.WF env)
    (hΓ₀ : OnCtx Γ₀ (env.IsType U))
    {As : List VExpr} {Γ} (hctx : OnCtx (As.reverse ++ Γ) (env.IsType U))
    {σ} (hσ : VEnv.Ctx.SubstEq env U Γ₀ σ σ Γ)
    {vs e} (hargs : VExpr.ArgsTyped env U Γ₀ As σ vs)
    (hwf : VExpr.WF env U (As.reverse ++ Γ) e) :
    VExpr.WF env U Γ₀ (((VExpr.lams As e).subst σ).appN vs) ∧
    env.IsDefEqU U Γ₀ (((VExpr.lams As e).subst σ).appN vs) (e.subst (σ.consN vs)) := by
  exact VExpr.lams_appN' henv hΓ₀ hctx hσ hargs hwf

/-- KA-108 bridge: lambda telescope well-formedness wrapper. -/
theorem translated_lambdaTelescope_wf {c : VContext} {α} {k : Array Expr → Expr → M α}
    {Q : α → VState → Prop} {m : MLCtx} [c.MLCWF m] {s : VState} {e : Expr} {e' : VExpr}
    (he : (c.withMLC m).TrExprS e e')
    (H : ∀ (fvs : Array Expr) {m'} [c.MLCWF m'] {s' body} body' {n} (hn : n ≤ m'.length) {As},
      s ≤ s' → m'.dropN n hn = m → fvs.toList.reverse = (m'.fvarRevList n hn).map .fvar →
      e = m'.mkLambda n hn body → lambdaTelescope.Inv c m m' fvs n hn As e' body' →
      e.lambdaArity = n →
      (c.withMLC m').TrExprS body body' → (k fvs body).WF (c.withMLC m') s' Q) :
    (lambdaTelescope e k).WF (c.withMLC m) s Q := by
  exact lambdaTelescope.WF he H

/-- KA-108 bridge: well-formed application inverse helper. -/
theorem translated_vexpr_wf_app_inv_prime_wf {env : VEnv} {U Γ} (henv : env.WF)
    (hΓ : OnCtx Γ (env.IsType U)) {f a A B : VExpr}
    (hf : env.HasType U Γ f (.forallE A B)) (H : VExpr.WF env U Γ (.app f a)) :
    env.HasType U Γ a A ∧ env.HasType U Γ (.app f a) (B.inst a) := by
  exact VExpr.WF.app_inv' henv hΓ hf H

/-- KA-108 bridge: well-formed lambda inverse helper. -/
theorem translated_vexpr_wf_lam_inv_prime_wf {env : VEnv} (henv : env.Ordered)
    (hΓ : OnCtx Γ (env.IsType U)) (H : VExpr.WF env U Γ (.lam A body)) :
    OnCtx (A :: Γ) (env.IsType U) ∧ VExpr.WF env U (A :: Γ) body := by
  exact VExpr.WF.lam_inv' henv hΓ H

/-- KA-108 bridge: beta helper from redex well-formedness. -/
theorem translated_vexpr_wf_betaU_wf {env : VEnv} (henv : env.WF)
    (hΓ : OnCtx Γ (env.IsType U)) {A body v : VExpr}
    (H : VExpr.WF env U Γ ((VExpr.lam A body).app v)) :
    env.HasType U Γ v A ∧ env.IsDefEqU U Γ ((VExpr.lam A body).app v) (body.inst v) := by
  exact VExpr.WF.betaU henv hΓ H

end Lean4Lean.PSKernelKA108

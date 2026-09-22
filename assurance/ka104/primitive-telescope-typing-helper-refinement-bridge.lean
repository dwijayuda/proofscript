import Lean4Lean.Verify.Environment.Primitive.Basic

namespace Lean4Lean.PSKernelKA104
open Lean
open Lean4Lean
open Lean4Lean.Primitive
open Lean4Lean.TypeChecker
open Kernel

/-- KA-104 bridge: appending already-well-formed context suffixes preserves context well-formedness. -/
theorem translated_onctx_append_right_wf {env : VEnv} {U} (henv : env.Ordered)
    {Γ₁ Γ₂ : List VExpr}
    (h1 : OnCtx Γ₁ (env.IsType U)) (h2 : OnCtx Γ₂ (env.IsType U)) :
    OnCtx (Γ₁ ++ Γ₂) (env.IsType U) := by
  exact OnCtx.append_right henv h1 h2

/-- KA-104 bridge: typed telescope arguments close a substitution equality under that telescope. -/
theorem translated_argsTyped_substEq_wf {env : VEnv} {U} {Γ₀ : List VExpr}
    {As Γ : List VExpr} {σ : VExpr.Subst} {vs : List VExpr}
    (hctx : OnCtx (As.reverse ++ Γ) (env.IsType U))
    (hσ : VEnv.Ctx.SubstEq env U Γ₀ σ σ Γ)
    (hargs : VExpr.ArgsTyped env U Γ₀ As σ vs) :
    VEnv.Ctx.SubstEq env U Γ₀ (σ.consN vs) (σ.consN vs) (As.reverse ++ Γ) := by
  exact VExpr.ArgsTyped.substEq hctx hσ hargs

/-- KA-104 bridge: lambda telescopes are well formed when their body is well formed under binders. -/
theorem translated_vexpr_wf_lams_wf {env : VEnv} {U} (henv : VEnv.WF env)
    {As Γ : List VExpr} {e : VExpr}
    (hctx : OnCtx (As.reverse ++ Γ) (env.IsType U))
    (hwf : VExpr.WF env U (As.reverse ++ Γ) e) :
    VExpr.WF env U Γ (VExpr.lams As e) := by
  exact VExpr.wf_lams henv hctx hwf

/-- KA-104 bridge: a typed body under a telescope gives a typed lambda telescope. -/
theorem translated_hasType_lams_wf {env : VEnv} {U} (henv : VEnv.WF env)
    {As Γ : List VExpr} {e T : VExpr}
    (hctx : OnCtx (As.reverse ++ Γ) (env.IsType U))
    (h : env.HasType U (As.reverse ++ Γ) e T) :
    env.HasType U Γ (VExpr.lams As e) (VExpr.forallEs As T) := by
  exact VEnv.HasType.lams henv hctx h

/-- KA-104 bridge: a term of a pi telescope type remains typed after applying typed arguments. -/
theorem translated_hasType_appN_forallEs_wf {env : VEnv} {U} {Γ : List VExpr}
    {As : List VExpr} {T f : VExpr} {vs : List VExpr} {σ : VExpr.Subst}
    (hargs : VExpr.ArgsTyped env U Γ As σ vs)
    (hf : env.HasType U Γ f ((VExpr.forallEs As T).subst σ)) :
    env.HasType U Γ (f.appN vs) (T.subst (σ.consN vs)) := by
  exact VEnv.HasType.appN_forallEs hargs hf

end Lean4Lean.PSKernelKA104

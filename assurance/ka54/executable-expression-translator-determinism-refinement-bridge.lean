import Lean4Lean.Verify.Typing.Expr
import Lean4Lean.Verify.Typing.Lemmas
import Lean4Lean.Verify.TypeChecker.Basic

namespace Lean4Lean.PSKernelKA54
open Lean
open Lean4Lean

/-- KA-54 bridge: deterministic translation in the same verified local context. -/
theorem translated_trExprS_unique_wf
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {e : Expr} {e₁ e₂ : VExpr}
    (hu : TrExprS.IsUnique e)
    (h₁ : TrExprS env Us Δ e e₁)
    (h₂ : TrExprS env Us Δ e e₂) :
    e₁ = e₂ := by
  exact TrExprS.unique hu h₁ h₂

/-- KA-54 bridge: deterministic translation across related verified local contexts. -/
theorem translated_trExprS_unique_context_wf
    {env : VEnv} {Us : List Name} {Δ₁ Δ₂ : VLCtx} {e : Expr} {e₁ e₂ : VExpr}
    (hΔ : TrExprS.IsUniqueCtx Δ₁ Δ₂)
    (hu : TrExprS.IsUnique e)
    (h₁ : TrExprS env Us Δ₁ e e₁)
    (h₂ : TrExprS env Us Δ₂ e e₂) :
    e₁ = e₂ := by
  exact TrExprS.unique' hΔ hu h₁ h₂

/-- KA-54 bridge: source-expression `Expr.eqv` transport for strict translation. -/
theorem translated_trExprS_eqv_transport_wf
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {e₁ e₂ : Expr} {e' : VExpr}
    (h : TrExprS env Us Δ e₁ e')
    (heq : e₁ == e₂) :
    TrExprS env Us Δ e₂ e' := by
  exact TrExprS.eqv h heq

/-- KA-54 bridge: source-expression `Expr.eqv` transport for defeq-closed translation. -/
theorem translated_trExpr_eqv_transport_wf
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {e₁ e₂ : Expr} {e' : VExpr}
    (h : TrExpr env Us Δ e₁ e')
    (heq : e₁ == e₂) :
    TrExpr env Us Δ e₂ e' := by
  exact TrExpr.eqv h heq

end Lean4Lean.PSKernelKA54

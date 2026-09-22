import Lean4Lean.Verify.Typing.Expr
import Lean4Lean.Verify.Typing.Lemmas
import Lean4Lean.Verify.TypeChecker.Basic

namespace Lean4Lean.PSKernelKA51
open Lean
open Lean4Lean

/-- KA-51 bridge: raw bvar translation is exactly the Lean4Lean `TrExprS.bvar` constructor. -/
theorem translated_trExprS_bvar_constructor_wf
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {i : Nat} {e A : VExpr}
    (h : Δ.find? (.inl i) = some (e, A)) :
    TrExprS env Us Δ (.bvar i) e := by
  exact TrExprS.bvar h

/-- KA-51 bridge: sort translation is exactly the Lean4Lean `TrExprS.sort` constructor. -/
theorem translated_trExprS_sort_constructor_wf
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {u : Level} {u' : VLevel}
    (h : VLevel.ofLevel Us u = some u') :
    TrExprS env Us Δ (.sort u) (.sort u') := by
  exact TrExprS.sort h

/-- KA-51 bridge: constant translation is exactly the Lean4Lean `TrExprS.const` constructor. -/
theorem translated_trExprS_const_constructor_wf
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {c : Name} {us : List Level}
    {ci : VConstant} {us' : List VLevel}
    (hc : env.constants c = some ci)
    (hus : us.mapM (VLevel.ofLevel Us) = some us')
    (hlen : us.length = ci.uvars) :
    TrExprS env Us Δ (.const c us) (.const c us') := by
  exact TrExprS.const hc hus hlen

/-- KA-51 bridge: application translation is exactly the Lean4Lean `TrExprS.app` constructor. -/
theorem translated_trExprS_app_constructor_wf
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {f a : Expr} {f' a' A B : VExpr}
    (hfTy : env.HasType Us.length Δ.toCtx f' (.forallE A B))
    (haTy : env.HasType Us.length Δ.toCtx a' A)
    (hf : TrExprS env Us Δ f f')
    (ha : TrExprS env Us Δ a a') :
    TrExprS env Us Δ (.app f a) (.app f' a') := by
  exact TrExprS.app hfTy haTy hf ha

/-- KA-51 bridge: unique Lean expressions translate to a unique verified expression. -/
theorem translated_trExprS_unique_surface_wf
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {e : Expr} {e₁ e₂ : VExpr}
    (hu : TrExprS.IsUnique e)
    (h₁ : TrExprS env Us Δ e e₁)
    (h₂ : TrExprS env Us Δ e e₂) :
    e₁ = e₂ := by
  exact TrExprS.unique hu h₁ h₂

end Lean4Lean.PSKernelKA51

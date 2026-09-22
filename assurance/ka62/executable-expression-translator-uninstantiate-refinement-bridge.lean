import Lean4Lean.Verify.Typing.Lemmas

namespace Lean4Lean.PSKernelKA62
open Lean
open Lean4Lean

/-- KA-62 bridge: abstracted source expressions can be uninstantiated for TrExprS. -/
theorem translated_trExprS_uninstantiateN_wf {env : VEnv} {Us : List Name}
    {Δ₀ Δ₁ Δ : VLCtx} {v₀ : FVarId} {d₀ : VLocalDecl} {dk k : Nat}
    {e : Expr} {e' : VExpr}
    (W : VLCtx.Abstract Δ₀ v₀ d₀ dk k Δ₁ Δ)
    (H : TrExprS env Us Δ₁ (Expr.instantiate1' e (.fvar v₀) dk) e')
    (sc : FVarsIn (· ≠ v₀) e) :
    TrExprS env Us Δ e e' := by
  exact TrExprS.uninstantiateN W H sc

/-- KA-62 bridge: abstracted source expressions can be uninstantiated for TrExpr. -/
theorem translated_trExpr_uninstantiateN_wf {env : VEnv} {Us : List Name}
    {Δ₀ Δ₁ Δ : VLCtx} {v₀ : FVarId} {d₀ : VLocalDecl} {dk k : Nat}
    {e : Expr} {e' : VExpr}
    (W : VLCtx.Abstract Δ₀ v₀ d₀ dk k Δ₁ Δ)
    (H : TrExpr env Us Δ₁ (Expr.instantiate1' e (.fvar v₀) dk) e')
    (sc : FVarsIn (· ≠ v₀) e) :
    TrExpr env Us Δ e e' := by
  exact TrExpr.uninstantiateN W H sc

/-- KA-62 bridge: one-step fvar uninstantiation for TrExprS. -/
theorem translated_trExprS_uninstantiate_wf {env : VEnv} {Us : List Name}
    {Δ : VLCtx} {v : FVarId} {deps : List FVarId} {d : VLocalDecl}
    {e : Expr} {e' : VExpr}
    (H : TrExprS env Us ((some (v, deps), d) :: Δ) (e.instantiate1' (.fvar v)) e')
    (sc : FVarsIn (· ≠ v) e) :
    TrExprS env Us ((none, d) :: Δ) e e' := by
  exact TrExprS.uninstantiate H sc

/-- KA-62 bridge: one-step fvar uninstantiation for TrExpr. -/
theorem translated_trExpr_uninstantiate_wf {env : VEnv} {Us : List Name}
    {Δ : VLCtx} {v : FVarId} {deps : List FVarId} {d : VLocalDecl}
    {e : Expr} {e' : VExpr}
    (H : TrExpr env Us ((some (v, deps), d) :: Δ) (e.instantiate1' (.fvar v)) e')
    (sc : FVarsIn (· ≠ v) e) :
    TrExpr env Us ((none, d) :: Δ) e e' := by
  exact TrExpr.uninstantiate H sc

/-- KA-62 bridge: instantiating a source expression with a tracked free variable preserves TrExprS. -/
theorem translated_trExprS_inst_fvar_wf {env : VEnv} {Us : List Name}
    {Δ : VLCtx} {a : FVarId} {deps : List FVarId} {d : VLocalDecl}
    {e : Expr} {e' : VExpr}
    (henv : VEnv.Ordered env)
    (hΔ : VLCtx.WF env Us.length ((some (a, deps), d) :: Δ))
    (H : TrExprS env Us ((none, d) :: Δ) e e') :
    TrExprS env Us ((some (a, deps), d) :: Δ) (e.instantiate1' (.fvar a)) e' := by
  exact TrExprS.inst_fvar henv hΔ H

end Lean4Lean.PSKernelKA62

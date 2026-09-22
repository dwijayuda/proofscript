import Lean4Lean.Verify.Typing.Expr
import Lean4Lean.Verify.Typing.Lemmas

namespace Lean4Lean.PSKernelKA58
open Lean
open Lean4Lean

/-- KA-58 bridge: source expression translation preserves source closedness. -/
theorem translated_trExprS_closed_wf
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {e : Expr} {e' : VExpr}
    (H : TrExprS env Us Δ e e') :
    Closed e Δ.bvars := by
  exact TrExprS.closed H

/-- KA-58 bridge: source expression translation preserves free-variable context membership. -/
theorem translated_trExprS_fvarsIn_wf
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {e : Expr} {e' : VExpr}
    (H : TrExprS env Us Δ e e') :
    FVarsIn (· ∈ Δ.fvars) e := by
  exact TrExprS.fvarsIn H

/-- KA-58 bridge: public expression translation preserves source closedness. -/
theorem translated_trExpr_closed_wf
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {e : Expr} {e' : VExpr}
    (H : TrExpr env Us Δ e e') :
    Closed e Δ.bvars := by
  exact TrExpr.closed H

/-- KA-58 bridge: public expression translation preserves free-variable context membership. -/
theorem translated_trExpr_fvarsIn_wf
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {e : Expr} {e' : VExpr}
    (H : TrExpr env Us Δ e e') :
    FVarsIn (· ∈ Δ.fvars) e := by
  exact TrExpr.fvarsIn H

end Lean4Lean.PSKernelKA58

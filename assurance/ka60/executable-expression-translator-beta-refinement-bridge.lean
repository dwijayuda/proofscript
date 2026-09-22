import Lean4Lean.Verify.Typing.Lemmas

namespace Lean4Lean.PSKernelKA60
open Lean
open Lean4Lean

/-- KA-60 bridge: beta-reduction only moves free variables downward in the active context. -/
theorem translated_fvarsBelow_betaReduce_wf {Δ : VLCtx} {e e' : Expr} (H : BetaReduce e e') :
    FVarsBelow Δ e e' := by
  exact FVarsBelow.betaReduce H

/-- KA-60 bridge: Lean4Lean cheap beta reduction is represented by BetaReduce for closed expressions. -/
theorem translated_betaReduce_cheapBetaReduce_wf {e : Expr} (hc : e.Closed) :
    BetaReduce e e.cheapBetaReduce := by
  exact BetaReduce.cheapBetaReduce hc

/-- KA-60 bridge: cheap beta reduction preserves the free-variable-below relation for closed expressions. -/
theorem translated_fvarsBelow_cheapBetaReduce_wf {Δ : VLCtx} {e : Expr} (he : e.Closed) :
    FVarsBelow Δ e e.cheapBetaReduce := by
  exact FVarsBelow.cheapBetaReduce he

/-- KA-60 bridge: translated expressions survive cheap beta reduction at the Lean4Lean TrExpr layer. -/
theorem translated_trExpr_cheapBetaReduce_wf {env : VEnv} {Us : List Name} {Δ : VLCtx} {e : Expr} {e' : VExpr}
    (H : TrExpr env Us Δ e e') (henv : VEnv.WF env) (hΓ : VLCtx.WF env Us.length Δ) (noBV : Δ.NoBV) :
    TrExpr env Us Δ e.cheapBetaReduce e' := by
  exact H.cheapBetaReduce henv hΓ noBV

end Lean4Lean.PSKernelKA60

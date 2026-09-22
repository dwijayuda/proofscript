import Lean4Lean.Verify.Environment.Primitive.Basic

namespace Lean4Lean.PSKernelKA97
open Lean
open Lean4Lean
open Lean4Lean.Primitive
open Lean4Lean.TypeChecker
open Kernel

/-- KA-97 bridge: indexed lifting through lambda telescopes preserves the telescope shape. -/
theorem translated_vexpr_liftN_lams_indexed_wf (As : List VExpr) (e : VExpr) (n k : Nat) :
    (VExpr.lams As e).liftN n k =
      VExpr.lams (As.mapIdx fun i A => A.liftN n (k + i)) (e.liftN n (k + As.length)) := by
  exact VExpr.liftN_lams' As e n k

/-- KA-97 bridge: indexed maps over replicated `Nat` telescope domains are stable. -/
theorem translated_list_mapIdx_replicate_nat_wf (f : Nat → VExpr → VExpr)
    (hf : ∀ i, f i VExpr.nat = VExpr.nat) (len : Nat) :
    (List.replicate len VExpr.nat).mapIdx f = List.replicate len VExpr.nat := by
  exact List.mapIdx_replicate_nat f hf len

/-- KA-97 bridge: substitutions do not change closed primitive terms at the recognizer depth. -/
theorem translated_vexpr_closedN_subst_eq_wf {e : VExpr} {σ : VExpr.Subst}
    (h : e.ClosedN) : e.subst σ = e := by
  exact VExpr.ClosedN.subst_eq' h

/-- KA-97 bridge: all-`Nat` telescopes extend well-formed contexts. -/
theorem translated_onctx_nat_telescope_wf {env : VEnv} {U : Nat} {Γ : List VExpr}
    (hnat : ∀ Γ', OnCtx Γ' (env.IsType U) → env.IsType U Γ' VExpr.nat)
    (hΓ : OnCtx Γ (env.IsType U)) (len : Nat) :
    OnCtx (List.replicate len VExpr.nat ++ Γ) (env.IsType U) := by
  exact OnCtx.natTelescope hnat hΓ len

/-- KA-97 bridge: lifting commutes with all-`Nat` telescope extension. -/
theorem translated_ctx_liftN_nat_telescope_wf {n k : Nat} {Γ Γ' : List VExpr}
    (W : Ctx.LiftN n k Γ Γ') (len : Nat) :
    Ctx.LiftN n (k + len) (List.replicate len VExpr.nat ++ Γ)
      (List.replicate len VExpr.nat ++ Γ') := by
  exact Ctx.LiftN.natTelescope W len

end Lean4Lean.PSKernelKA97

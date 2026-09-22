import Lean4Lean.Verify.Typing.Lemmas

namespace Lean4Lean.PSKernelKA64
open Lean
open Lean4Lean

/-- KA-64 bridge: source expression equivalence preserves computed free-variable lists. -/
theorem translated_fvarsList_eqv_wf {e₁ e₂ : Expr} :
    e₁ == e₂ → e₁.fvarsList = e₂.fvarsList := by
  exact fvarsList_eqv

/-- KA-64 bridge: source expression equivalence transports free-variable predicates. -/
theorem translated_fvarsIn_eqv_wf {P : FVarId → Prop} {e₁ e₂ : Expr} :
    e₁ == e₂ → FVarsIn P e₁ → FVarsIn P e₂ := by
  exact FVarsIn.eqv

/-- KA-64 bridge: source expression equivalence transports below-free-variable preservation. -/
theorem translated_fvarsBelow_eqv_wf {Δ : VLCtx} {e₁ e₂ ty₁ ty₂ : Expr}
    (H : FVarsBelow Δ e₁ ty₁) :
    e₁ == e₂ → ty₁ == ty₂ → FVarsBelow Δ e₂ ty₂ := by
  intro he hty
  exact FVarsBelow.eqv H he hty

/-- KA-64 bridge: source expression equivalence transports typed executable translation packets. -/
theorem translated_trTyping_eqv_wf {env : VEnv} {Us : List Name} {Δ : VLCtx}
    {e₁ e₂ ty₁ ty₂ : Expr} {e' ty' : VExpr}
    (H : TrTyping env Us Δ e₁ ty₁ e' ty') :
    e₁ == e₂ → ty₁ == ty₂ → TrTyping env Us Δ e₂ ty₂ e' ty' := by
  intro he hty
  exact TrTyping.eqv H he hty

end Lean4Lean.PSKernelKA64

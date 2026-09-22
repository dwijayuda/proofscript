import Lean4Lean.Verify.Typing.Lemmas

namespace Lean4Lean.PSKernelKA63
open Lean
open Lean4Lean

/-- KA-63 bridge: executable translation of the source `false` literal. -/
theorem translated_trExprS_boolFalse_wf {env : VEnv} {Us : List Name} {Δ : VLCtx}
    (henv : env.HasPrimitives) (H : env.contains ``Bool) :
    TrExprS env Us Δ (toExpr false) .boolFalse ∧
    env.HasType Us.length Δ.toCtx .boolFalse .bool := by
  exact TrExprS.boolFalse henv H

/-- KA-63 bridge: executable translation of the source `true` literal. -/
theorem translated_trExprS_boolTrue_wf {env : VEnv} {Us : List Name} {Δ : VLCtx}
    (henv : env.HasPrimitives) (H : env.contains ``Bool) :
    TrExprS env Us Δ (toExpr true) .boolTrue ∧
    env.HasType Us.length Δ.toCtx .boolTrue .bool := by
  exact TrExprS.boolTrue henv H

/-- KA-63 bridge: executable translation of arbitrary Boolean literals. -/
theorem translated_trExprS_boolLit_wf {env : VEnv} {Us : List Name} {Δ : VLCtx}
    (henv : env.HasPrimitives) (H : env.contains ``Bool) (b : Bool) :
    TrExprS env Us Δ (toExpr b) (.boolLit b) ∧
    env.HasType Us.length Δ.toCtx (.boolLit b) .bool := by
  exact TrExprS.boolLit henv H b

/-- KA-63 bridge: Boolean literals are closed with respect to source free variables. -/
theorem translated_fvarsIn_boolLit_wf {P : FVarId → Prop} {b : Bool} :
    FVarsIn P (toExpr b) := by
  exact FVarsIn.boolLit

end Lean4Lean.PSKernelKA63

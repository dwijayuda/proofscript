import Lean4Lean.Verify.Primitive

namespace Lean4Lean.PSKernelKA81
open Lean4Lean
open Lean

/-- KA-81 bridge: primitive Nat.zero reflection typing is exposed under the PSKernel audit namespace. -/
theorem translated_natZeroT_wf {env : VEnv} (henv : env.Ordered)
    (hprim : env.HasPrimitives) (hnat : env.contains ``Nat) (Γ) :
    env.HasType 0 Γ .natZero .nat := by
  exact Lean4Lean.VEnv.HasPrimitives.natZeroT henv hprim hnat Γ

/-- KA-81 bridge: primitive Nat.succ reflection typing is exposed under the PSKernel audit namespace. -/
theorem translated_natSuccT_wf {env : VEnv} (henv : env.Ordered)
    (hprim : env.HasPrimitives) (hnat : env.contains ``Nat) (Γ) :
    env.HasType 0 Γ .natSucc (.forallE .nat .nat) := by
  exact Lean4Lean.VEnv.HasPrimitives.natSuccT henv hprim hnat Γ

/-- KA-81 bridge: primitive Nat.pred reflection typing is exposed under the PSKernel audit namespace. -/
theorem translated_natPredT_wf {env : VEnv} (henv : env.Ordered)
    (hprim : env.HasPrimitives) (hpred : env.contains ``Nat.pred) (Γ) :
    env.HasType 0 Γ (.const ``Nat.pred []) (.forallE .nat .nat) := by
  exact Lean4Lean.VEnv.HasPrimitives.natPredT henv hprim hpred Γ

/-- KA-81 bridge: primitive Nat literal reflection typing is exposed under the PSKernel audit namespace. -/
theorem translated_natLitT_wf {env : VEnv} (henv : env.Ordered)
    (hprim : env.HasPrimitives) (hnat : env.contains ``Nat) (n : Nat) (Γ) :
    env.HasType 0 Γ (.natLit n) .nat := by
  exact Lean4Lean.VEnv.HasPrimitives.natLitT henv hprim hnat n Γ

/-- KA-81 bridge: primitive Bool literal reflection typing is exposed under the PSKernel audit namespace. -/
theorem translated_boolLitT_wf {env : VEnv} (henv : env.Ordered)
    (hprim : env.HasPrimitives) (hbool : env.contains ``Bool) (b : Bool) (Γ) :
    env.HasType 0 Γ (.boolLit b) .bool := by
  exact Lean4Lean.VEnv.HasPrimitives.boolLitT henv hprim hbool b Γ

end Lean4Lean.PSKernelKA81

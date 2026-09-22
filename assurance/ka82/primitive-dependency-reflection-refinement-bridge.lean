import Lean4Lean.Verify.Primitive

namespace Lean4Lean.PSKernelKA82
open Lean4Lean
open Lean

/-- KA-82 bridge: a term typed as a function from Nat implies Nat is present. -/
theorem translated_containsNatOfHasType_wf {env : VEnv} (henv : env.Ordered) {e A : VExpr}
    (h : env.HasType 0 [] e (.forallE .nat A)) : env.contains ``Nat := by
  exact Lean4Lean.VEnv.contains_nat_of_hasType henv h

/-- KA-82 bridge: Nat.pred reflection implies Nat is present. -/
theorem translated_natOfPred_wf {env : VEnv} (henv : env.Ordered)
    (hprim : env.HasPrimitives) (hpred : env.contains ``Nat.pred) : env.contains ``Nat := by
  exact Lean4Lean.VEnv.HasPrimitives.natOfPred henv hprim hpred

/-- KA-82 bridge: Nat.add reflection implies Nat is present. -/
theorem translated_natOfAdd_wf {env : VEnv} (henv : env.Ordered)
    (hprim : env.HasPrimitives) (hadd : env.contains ``Nat.add) : env.contains ``Nat := by
  exact Lean4Lean.VEnv.HasPrimitives.natOfAdd henv hprim hadd

/-- KA-82 bridge: Nat.mul reflection implies Nat is present. -/
theorem translated_natOfMul_wf {env : VEnv} (henv : env.Ordered)
    (hprim : env.HasPrimitives) (hmul : env.contains ``Nat.mul) : env.contains ``Nat := by
  exact Lean4Lean.VEnv.HasPrimitives.natOfMul henv hprim hmul

/-- KA-82 bridge: Nat.div reflection implies Nat is present. -/
theorem translated_natOfDiv_wf {env : VEnv} (henv : env.Ordered)
    (hprim : env.HasPrimitives) (hdiv : env.contains ``Nat.div) : env.contains ``Nat := by
  exact Lean4Lean.VEnv.HasPrimitives.natOfDiv henv hprim hdiv

/-- KA-82 bridge: Nat.mod reflection implies Nat is present. -/
theorem translated_natOfMod_wf {env : VEnv} (henv : env.Ordered)
    (hprim : env.HasPrimitives) (hmod : env.contains ``Nat.mod) : env.contains ``Nat := by
  exact Lean4Lean.VEnv.HasPrimitives.natOfMod henv hprim hmod

/-- KA-82 bridge: Nat.bitwise reflection implies Bool is present. -/
theorem translated_boolOfBitwise_wf {env : VEnv} (henv : env.Ordered)
    (hprim : env.HasPrimitives) (hbw : env.contains ``Nat.bitwise) : env.contains ``Bool := by
  exact Lean4Lean.VEnv.HasPrimitives.boolOfBitwise henv hprim hbw

end Lean4Lean.PSKernelKA82

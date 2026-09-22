import Lean4Lean.Verify.Environment.Primitive.Basic

namespace Lean4Lean.PSKernelKA94
open Lean
open Lean4Lean
open Lean4Lean.Primitive
open Lean4Lean.TypeChecker
open Kernel

/-- KA-94 bridge: a checked binary Nat primitive result preserves primitive reflection. -/
theorem translated_mkResult_wf {v : DefinitionVal} {ci' : VDefVal} {c : VContext}
    (P : Data v ci' c) {F : Nat → Nat → Nat}
    (hok' : v.safety = .safe ∧ v.levelParams = [])
    (hnat : c.venv.contains ``Nat)
    (hmem : (v.name, .reflectsNatNatNat F) ∈ primSpecs)
    (tyeq : ci'.type = vexpr(Nat → Nat → Nat))
    (href : c.venv.HasType c.lparams.length [] ci'.value vexpr(Nat → Nat → Nat) →
      c.venv.ReflectsNatNatNat' ci'.value F) :
    PrimitiveResult c.venv v ci' := by
  exact Data.mkResult P hok' hnat hmem tyeq href

/-- KA-94 bridge: a checked unary Nat primitive result preserves primitive reflection. -/
theorem translated_mkResult1_wf {v : DefinitionVal} {ci' : VDefVal} {c : VContext}
    (P : Data v ci' c) {F : Nat → Nat}
    (hok' : v.safety = .safe ∧ v.levelParams = [])
    (hnat : c.venv.contains ``Nat)
    (hmem : (v.name, .reflectsNatNat F) ∈ primSpecs)
    (tyeq : ci'.type = vexpr(Nat → Nat))
    (href : c.venv.HasType c.lparams.length [] ci'.value vexpr(Nat → Nat) →
      c.venv.ReflectsNatNat' ci'.value F) :
    PrimitiveResult c.venv v ci' := by
  exact Data.mkResult1 P hok' hnat hmem tyeq href

/-- KA-94 bridge: a checked Bool-valued binary Nat primitive result preserves reflection. -/
theorem translated_mkResultBool_wf {v : DefinitionVal} {ci' : VDefVal} {c : VContext}
    (P : Data v ci' c) {F : Nat → Nat → Bool}
    (hok' : v.safety = .safe ∧ v.levelParams = [])
    (hnat : c.venv.contains ``Nat)
    (hmem : (v.name, .reflectsNatNatBool F) ∈ primSpecs)
    (tyeq : ci'.type = vexpr(Nat → Nat → Bool))
    (href : c.venv.HasType c.lparams.length [] ci'.value vexpr(Nat → Nat → Bool) →
      c.venv.ReflectsNatNatBool' ci'.value F) :
    PrimitiveResult c.venv v ci' := by
  exact Data.mkResultBool P hok' hnat hmem tyeq href

/-- KA-94 bridge: the checked `Nat.bitwise` result preserves bitwise reflection. -/
theorem translated_mkResultBitwise_wf {v : DefinitionVal} {ci' : VDefVal} {c : VContext}
    (P : Data v ci' c) (hok' : v.safety = .safe ∧ v.levelParams = [])
    (hnat : c.venv.contains ``Nat)
    (hmem : (v.name, PrimSpec.reflectsBitwise) ∈ primSpecs)
    (tyeq : ci'.type = .forallE .boolOp2 .natOp2)
    (href : ∀ env' : VEnv, c.venv ≤ env' → env'.WF →
      ∀ f g, env'.ReflectsBoolBoolBool' f g →
        env'.ReflectsNatNatNat' (ci'.value.app f) (Nat.bitwise g)) :
    PrimitiveResult c.venv v ci' := by
  exact Data.mkResultBitwise P hok' hnat hmem tyeq href

/-- KA-94 bridge: a primitive whose specification only pins its type preserves that type equation. -/
theorem translated_mkResultTypeEq_wf {v : DefinitionVal} {ci' : VDefVal} {c : VContext}
    (P : Data v ci' c) {T : VExpr}
    (hok' : v.safety = .safe ∧ v.levelParams = [])
    (hmem : (v.name, .typeEq T) ∈ primSpecs) (tyeq : ci'.type = T) :
    PrimitiveResult c.venv v ci' := by
  exact Data.mkResultTypeEq P hok' hmem tyeq

end Lean4Lean.PSKernelKA94

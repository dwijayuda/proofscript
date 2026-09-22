import Lean4Lean.Verify.Environment.Primitive.Clauses

namespace Lean4Lean.PSKernelKA89
open Lean4Lean
open Lean4Lean.TypeChecker
open Lean4Lean.Primitive
open Lean hiding Environment Exception
open Kernel

/-- KA-89 bridge: generic Nat-to-Nat-to-Bool constructor-case recognizer preserves PrimitiveResult. -/
theorem translated_checkNatBoolCases_wf {ves : VEnvs} {env : Environment} {v : DefinitionVal}
    {ci' : VDefVal} {state : TypeChecker.VState} {F : Nat → Nat → Bool} {b0s : Bool}
    (wf : ves.WF env) (hmem : (v.name, .reflectsNatNatBool F) ∈ primSpecs)
    (hF00 : F 0 0 = true) (hF0s : ∀ b, F 0 (b + 1) = b0s)
    (hFs0 : ∀ a, F (a + 1) 0 = false)
    (hFss : ∀ a b, F (a + 1) (b + 1) = F a b) :
    let c := TypeChecker.VContext.mk' wf .safe v.levelParams
    Lean4Lean.Primitive.Data v ci' c →
    (Lean4Lean.Primitive.checkNatBoolCases v (Lean.toExpr b0s)).WF c state fun _ _ =>
      Lean4Lean.Primitive.PrimitiveResult (ves.venv .safe) v ci' := by
  exact Lean4Lean.Primitive.checkNatBoolCases.WF wf b0s hmem hF00 hF0s hFs0 hFss

/-- KA-89 bridge: `Nat.beq` primitive recognizer preserves PrimitiveResult. -/
theorem translated_checkNatBEq_wf {ves : VEnvs} {env : Environment} {v : DefinitionVal}
    {ci' : VDefVal} {state : TypeChecker.VState}
    (wf : ves.WF env) (hname : v.name = ``Nat.beq) :
    let c := TypeChecker.VContext.mk' wf .safe v.levelParams
    Lean4Lean.Primitive.Data v ci' c →
    (Lean4Lean.Primitive.checkNatBEq v).WF c state fun _ _ =>
      Lean4Lean.Primitive.PrimitiveResult (ves.venv .safe) v ci' := by
  exact Lean4Lean.Primitive.checkNatBEq.WF wf hname

/-- KA-89 bridge: `Nat.ble` primitive recognizer preserves PrimitiveResult. -/
theorem translated_checkNatBLE_wf {ves : VEnvs} {env : Environment} {v : DefinitionVal}
    {ci' : VDefVal} {state : TypeChecker.VState}
    (wf : ves.WF env) (hname : v.name = ``Nat.ble) :
    let c := TypeChecker.VContext.mk' wf .safe v.levelParams
    Lean4Lean.Primitive.Data v ci' c →
    (Lean4Lean.Primitive.checkNatBLE v).WF c state fun _ _ =>
      Lean4Lean.Primitive.PrimitiveResult (ves.venv .safe) v ci' := by
  exact Lean4Lean.Primitive.checkNatBLE.WF wf hname

end Lean4Lean.PSKernelKA89

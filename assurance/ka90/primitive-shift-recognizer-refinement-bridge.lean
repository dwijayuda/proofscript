import Lean4Lean.Verify.Environment.Primitive.Clauses

namespace Lean4Lean.PSKernelKA90
open Lean4Lean
open Lean4Lean.TypeChecker
open Lean4Lean.Primitive
open Lean hiding Environment Exception
open Kernel

/-- KA-90 bridge: `Nat.shiftLeft` primitive recognizer preserves PrimitiveResult. -/
theorem translated_checkNatShiftLeft_wf {ves : VEnvs} {env : Environment} {v : DefinitionVal}
    {ci' : VDefVal} {state : TypeChecker.VState}
    (wf : ves.WF env) (hname : v.name = ``Nat.shiftLeft) :
    let c := TypeChecker.VContext.mk' wf .safe v.levelParams
    Lean4Lean.Primitive.Data v ci' c →
    (Lean4Lean.Primitive.checkNatShiftLeft v).WF c state fun _ _ =>
      Lean4Lean.Primitive.PrimitiveResult (ves.venv .safe) v ci' := by
  exact Lean4Lean.Primitive.checkNatShiftLeft.WF wf hname

/-- KA-90 bridge: `Nat.shiftRight` primitive recognizer preserves PrimitiveResult. -/
theorem translated_checkNatShiftRight_wf {ves : VEnvs} {env : Environment} {v : DefinitionVal}
    {ci' : VDefVal} {state : TypeChecker.VState}
    (wf : ves.WF env) (hname : v.name = ``Nat.shiftRight) :
    let c := TypeChecker.VContext.mk' wf .safe v.levelParams
    Lean4Lean.Primitive.Data v ci' c →
    (Lean4Lean.Primitive.checkNatShiftRight v).WF c state fun _ _ =>
      Lean4Lean.Primitive.PrimitiveResult (ves.venv .safe) v ci' := by
  exact Lean4Lean.Primitive.checkNatShiftRight.WF wf hname

end Lean4Lean.PSKernelKA90

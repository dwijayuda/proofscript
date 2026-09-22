import Lean4Lean.Verify.Environment.Primitive.DivMod

namespace Lean4Lean.PSKernelKA86
open Lean4Lean
open Lean4Lean.TypeChecker
open Lean4Lean.Primitive
open Lean hiding Environment Exception
open Kernel

/-- KA-86 bridge: `Nat.mod` primitive recognizer preserves PrimitiveResult. -/
theorem translated_checkNatMod_wf {ves : VEnvs} {env : Environment} {v : DefinitionVal}
    {ci' : VDefVal} {state : TypeChecker.VState}
    (wf : ves.WF env) (hname : v.name = ``Nat.mod) :
    let c := TypeChecker.VContext.mk' wf .safe v.levelParams
    Lean4Lean.Primitive.Data v ci' c →
    (Lean4Lean.Primitive.checkNatMod v).WF c state fun _ _ =>
      Lean4Lean.Primitive.PrimitiveResult (ves.venv .safe) v ci' := by
  exact Lean4Lean.Primitive.checkNatMod.WF wf hname

/-- KA-86 bridge: `Nat.div` primitive recognizer preserves PrimitiveResult. -/
theorem translated_checkNatDiv_wf {ves : VEnvs} {env : Environment} {v : DefinitionVal}
    {ci' : VDefVal} {state : TypeChecker.VState}
    (wf : ves.WF env) (hname : v.name = ``Nat.div) :
    let c := TypeChecker.VContext.mk' wf .safe v.levelParams
    Lean4Lean.Primitive.Data v ci' c →
    (Lean4Lean.Primitive.checkNatDiv v).WF c state fun _ _ =>
      Lean4Lean.Primitive.PrimitiveResult (ves.venv .safe) v ci' := by
  exact Lean4Lean.Primitive.checkNatDiv.WF wf hname

end Lean4Lean.PSKernelKA86

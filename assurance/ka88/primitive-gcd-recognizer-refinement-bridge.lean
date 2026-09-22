import Lean4Lean.Verify.Environment.Primitive.Gcd

namespace Lean4Lean.PSKernelKA88
open Lean4Lean
open Lean4Lean.TypeChecker
open Lean4Lean.Primitive
open Lean hiding Environment Exception
open Kernel

/-- KA-88 bridge: `Nat.gcd` primitive recognizer preserves PrimitiveResult. -/
theorem translated_checkNatGcd_wf {ves : VEnvs} {env : Environment} {v : DefinitionVal}
    {ci' : VDefVal} {state : TypeChecker.VState}
    (wf : ves.WF env) (hname : v.name = ``Nat.gcd) :
    let c := TypeChecker.VContext.mk' wf .safe v.levelParams
    Lean4Lean.Primitive.Data v ci' c →
    (Lean4Lean.Primitive.checkNatGcd v).WF c state fun _ _ =>
      Lean4Lean.Primitive.PrimitiveResult (ves.venv .safe) v ci' := by
  exact Lean4Lean.Primitive.checkNatGcd.WF wf hname

end Lean4Lean.PSKernelKA88

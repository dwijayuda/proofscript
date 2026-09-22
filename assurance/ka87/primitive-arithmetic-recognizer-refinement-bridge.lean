import Lean4Lean.Verify.Environment.Primitive.Clauses

namespace Lean4Lean.PSKernelKA87
open Lean4Lean
open Lean4Lean.TypeChecker
open Lean4Lean.Primitive
open Lean hiding Environment Exception
open Kernel

/-- KA-87 bridge: `Nat.add` primitive recognizer preserves PrimitiveResult. -/
theorem translated_checkNatAdd_wf {ves : VEnvs} {env : Environment} {v : DefinitionVal}
    {ci' : VDefVal} {state : TypeChecker.VState}
    (wf : ves.WF env) (hname : v.name = ``Nat.add) :
    let c := TypeChecker.VContext.mk' wf .safe v.levelParams
    Lean4Lean.Primitive.Data v ci' c →
    (Lean4Lean.Primitive.checkNatAdd v).WF c state fun _ _ =>
      Lean4Lean.Primitive.PrimitiveResult (ves.venv .safe) v ci' := by
  exact Lean4Lean.Primitive.checkNatAdd.WF wf hname

/-- KA-87 bridge: `Nat.pred` primitive recognizer preserves PrimitiveResult. -/
theorem translated_checkNatPred_wf {ves : VEnvs} {env : Environment} {v : DefinitionVal}
    {ci' : VDefVal} {state : TypeChecker.VState}
    (wf : ves.WF env) (hname : v.name = ``Nat.pred) :
    let c := TypeChecker.VContext.mk' wf .safe v.levelParams
    Lean4Lean.Primitive.Data v ci' c →
    (Lean4Lean.Primitive.checkNatPred v).WF c state fun _ _ =>
      Lean4Lean.Primitive.PrimitiveResult (ves.venv .safe) v ci' := by
  exact Lean4Lean.Primitive.checkNatPred.WF wf hname

/-- KA-87 bridge: `Nat.sub` primitive recognizer preserves PrimitiveResult. -/
theorem translated_checkNatSub_wf {ves : VEnvs} {env : Environment} {v : DefinitionVal}
    {ci' : VDefVal} {state : TypeChecker.VState}
    (wf : ves.WF env) (hname : v.name = ``Nat.sub) :
    let c := TypeChecker.VContext.mk' wf .safe v.levelParams
    Lean4Lean.Primitive.Data v ci' c →
    (Lean4Lean.Primitive.checkNatSub v).WF c state fun _ _ =>
      Lean4Lean.Primitive.PrimitiveResult (ves.venv .safe) v ci' := by
  exact Lean4Lean.Primitive.checkNatSub.WF wf hname

/-- KA-87 bridge: `Nat.mul` primitive recognizer preserves PrimitiveResult. -/
theorem translated_checkNatMul_wf {ves : VEnvs} {env : Environment} {v : DefinitionVal}
    {ci' : VDefVal} {state : TypeChecker.VState}
    (wf : ves.WF env) (hname : v.name = ``Nat.mul) :
    let c := TypeChecker.VContext.mk' wf .safe v.levelParams
    Lean4Lean.Primitive.Data v ci' c →
    (Lean4Lean.Primitive.checkNatMul v).WF c state fun _ _ =>
      Lean4Lean.Primitive.PrimitiveResult (ves.venv .safe) v ci' := by
  exact Lean4Lean.Primitive.checkNatMul.WF wf hname

/-- KA-87 bridge: `Nat.pow` primitive recognizer preserves PrimitiveResult. -/
theorem translated_checkNatPow_wf {ves : VEnvs} {env : Environment} {v : DefinitionVal}
    {ci' : VDefVal} {state : TypeChecker.VState}
    (wf : ves.WF env) (hname : v.name = ``Nat.pow) :
    let c := TypeChecker.VContext.mk' wf .safe v.levelParams
    Lean4Lean.Primitive.Data v ci' c →
    (Lean4Lean.Primitive.checkNatPow v).WF c state fun _ _ =>
      Lean4Lean.Primitive.PrimitiveResult (ves.venv .safe) v ci' := by
  exact Lean4Lean.Primitive.checkNatPow.WF wf hname

end Lean4Lean.PSKernelKA87

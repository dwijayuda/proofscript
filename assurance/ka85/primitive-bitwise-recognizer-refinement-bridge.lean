import Lean4Lean.Verify.Environment.Primitive.Bitwise

namespace Lean4Lean.PSKernelKA85
open Lean4Lean
open Lean4Lean.TypeChecker
open Lean4Lean.Primitive
open Lean hiding Environment Exception
open Kernel

/-- KA-85 bridge: Boolean binary operators compute on reflected literal decisions. -/
theorem translated_boolOp2_apply_wf {env : VEnv} {U : Nat} {f a b : VExpr}
    {ba bb : Bool} {g : Bool → Bool → Bool}
    (henv : env.WF)
    (hfT : env.HasType U [] f .boolOp2)
    (hfg : ∀ p q, env.IsDefEqU U [] ((f.app (.boolLit p)).app (.boolLit q)) (.boolLit (g p q)))
    (ha : env.IsDefEqU U [] a (.boolLit ba))
    (hb : env.IsDefEqU U [] b (.boolLit bb))
    (hwf : VExpr.WF env U [] ((f.app a).app b)) :
    env.HasType U [] ((f.app a).app b) .bool ∧
    env.IsDefEqU U [] ((f.app a).app b) (.boolLit (g ba bb)) := by
  exact Lean4Lean.Primitive.boolOp2_apply henv hfT hfg ha hb hwf

/-- KA-85 bridge: the `Nat.bitwise` primitive recognizer preserves PrimitiveResult. -/
theorem translated_checkNatBitwise_wf {ves : VEnvs} {env : Environment} {v : DefinitionVal}
    {ci' : VDefVal} {state : TypeChecker.VState}
    (wf : ves.WF env) (hname : v.name = ``Nat.bitwise) :
    let c := TypeChecker.VContext.mk' wf .safe v.levelParams
    Lean4Lean.Primitive.Data v ci' c →
    (Lean4Lean.Primitive.checkNatBitwise v).WF c state fun _ _ =>
      Lean4Lean.Primitive.PrimitiveResult (ves.venv .safe) v ci' := by
  exact Lean4Lean.Primitive.checkNatBitwise.WF wf hname

end Lean4Lean.PSKernelKA85

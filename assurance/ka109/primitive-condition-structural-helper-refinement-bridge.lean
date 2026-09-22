import Lean4Lean.Verify.Environment.Primitive.Condition

namespace Lean4Lean.PSKernelKA109
open Lean
open Lean4Lean
open Lean4Lean.Primitive
open Lean4Lean.TypeChecker
open Kernel

/-- KA-109 bridge: condition proposition translation at empty local context. -/
theorem translated_condition_wf_hprop0_wf {c : VContext} {cnd : Condition} (w : Condition.WF c cnd) :
    TrExprS c.venv c.lparams [] cnd.prop w.prop' := by
  exact Condition.WF.hprop0 w

/-- KA-109 bridge: condition decision translation at empty local context. -/
theorem translated_condition_wf_hdec0_wf {c : VContext} {cnd : Condition} (w : Condition.WF c cnd) :
    TrExprS c.venv c.lparams [] cnd.dec w.dec' := by
  exact Condition.WF.hdec0 w

/-- KA-109 bridge: condition proposition target is closed. -/
theorem translated_condition_wf_prop_closed_wf {c : VContext} {cnd : Condition} (w : Condition.WF c cnd) :
    w.prop'.ClosedN := by
  exact Condition.WF.propC w

/-- KA-109 bridge: condition decision target is closed. -/
theorem translated_condition_wf_dec_closed_wf {c : VContext} {cnd : Condition} (w : Condition.WF c cnd) :
    w.dec'.ClosedN := by
  exact Condition.WF.decC w

/-- KA-109 bridge: reflected condition OK bundle decomposition. -/
theorem translated_condition_impl_ok_reflect_wf {asBool proof : Expr} {reflect : Reflection}
    (h : (ConditionImpl.reflectNatNat asBool reflect proof).OK) :
    CondOK asBool ∧ CondOK proof ∧ CondOK reflect.type ∧ CondOK reflect.toDec ∧
    CondOK reflect.ofTrue ∧ CondOK reflect.ofFalse ∧ CondOK reflect.ite ∧
    CondOK reflect.natDITE := by
  exact ConditionImpl.OK.reflect h

end Lean4Lean.PSKernelKA109

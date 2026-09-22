import Lean4Lean.Verify.Environment.Primitive.Basic

namespace Lean4Lean.PSKernelKA102
open Lean
open Lean4Lean
open Lean4Lean.Primitive
open Lean4Lean.TypeChecker
open Kernel

/-- KA-102 bridge: closing a telescope of bound variables by `consN` recovers the telescope values. -/
theorem translated_subst_consN_bvars_wf (vs : List VExpr) (σ : VExpr.Subst) :
    ((List.range vs.length).map VExpr.bvar).reverse.map (VExpr.subst · (σ.consN vs)) = vs := by
  exact VExpr.subst_consN_bvars vs σ

/-- KA-102 bridge: substituting under a binder and instantiating the binder cancels to substitution. -/
theorem translated_subst_lift_tail_inst_wf (e : VExpr) (σ : VExpr.Subst) (v : VExpr) :
    (e.subst σ.lift.tail).inst v = e.subst σ := by
  exact VExpr.subst_lift_tail_inst e σ v

/-- KA-102 bridge: composing telescope substitutions by append agrees with nested `consN`. -/
theorem translated_subst_consN_append_wf (σ : VExpr.Subst) (l1 l2 : List VExpr) :
    (σ.consN l1).consN l2 = σ.consN (l1 ++ l2) := by
  exact VExpr.Subst.consN_append σ l1 l2

/-- KA-102 bridge: appending one telescope element agrees with a final `cons`. -/
theorem translated_subst_consN_append_singleton_wf (σ : VExpr.Subst) (l : List VExpr) (v : VExpr) :
    σ.consN (l ++ [v]) = (σ.consN l).cons v := by
  exact VExpr.Subst.consN_append_singleton σ l v

/-- KA-102 bridge: lifting a substitution and composing with one binder-instantiation equals `cons`. -/
theorem translated_subst_lift_comp_one_wf {σ : VExpr.Subst} {v : VExpr} :
    σ.lift.comp (.one v) = σ.cons v := by
  exact VExpr.Subst.lift_comp_one

end Lean4Lean.PSKernelKA102

import Lean4Lean.Verify.Environment.Primitive.Basic

namespace Lean4Lean.PSKernelKA96
open Lean
open Lean4Lean
open Lean4Lean.Primitive
open Lean4Lean.TypeChecker
open Kernel

/-- KA-96 bridge: model application lists commute with simultaneous instantiation. -/
theorem translated_vexpr_insts_appN_wf (g : List VExpr) (e : VExpr) (as : List VExpr) :
    (e.appN as).insts g = (e.insts g).appN (as.map (·.insts g)) := by
  exact VExpr.insts_appN g e as

/-- KA-96 bridge: model application lists commute with substitution. -/
theorem translated_vexpr_subst_appN_wf (γ : VExpr.Subst) (e : VExpr) (as : List VExpr) :
    (e.appN as).subst γ = (e.subst γ).appN (as.map (·.subst γ)) := by
  exact VExpr.subst_appN γ e as

/-- KA-96 bridge: model lambda telescopes reassociate over append. -/
theorem translated_vexpr_lams_append_wf (As Bs : List VExpr) (e : VExpr) :
    VExpr.lams (As ++ Bs) e = VExpr.lams As (VExpr.lams Bs e) := by
  exact VExpr.lams_append As Bs e

/-- KA-96 bridge: Lean source application-list sugar matches `mkAppList`. -/
theorem translated_expr_appN_eq_mkAppList_wf (e : Expr) (as : List Expr) :
    e.appN as = e.mkAppList as := by
  exact Expr.appN_eq_mkAppList e as

/-- KA-96 bridge: Lean source array application sugar is the same application-list order. -/
theorem translated_expr_mkAppN_eq_wf (f : Expr) (as : Array Expr) :
    mkAppN f as = f.appN as.toList := by
  exact Expr.mkAppN_eq f as

end Lean4Lean.PSKernelKA96

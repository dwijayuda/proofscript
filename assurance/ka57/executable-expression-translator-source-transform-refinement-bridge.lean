import Lean4Lean.Verify.Typing.Expr
import Lean4Lean.Verify.Typing.Lemmas

namespace Lean4Lean.PSKernelKA57
open Lean
open Lean4Lean

/-- KA-57 bridge: source free-variable well-formedness survives abstraction. -/
theorem translated_fvars_abstract1_wf
    {P : FVarId → Prop} {e : Expr} {a : FVarId} {k : Nat}
    (h : Expr.FVarsIn P e) :
    Expr.FVarsIn P (Expr.abstract1 a e k) := by
  exact FVarsIn.abstract1 h

/-- KA-57 bridge: source free-variable well-formedness survives single instantiation. -/
theorem translated_fvars_instantiate1_wf
    {P : FVarId → Prop} {e a : Expr} {k : Nat}
    (he : Expr.FVarsIn P e) (ha : Expr.FVarsIn P a) :
    Expr.FVarsIn P (Expr.instantiate1' e a k) := by
  exact FVarsIn.instantiate1_go he ha

/-- KA-57 bridge: source free-variable well-formedness survives list instantiation. -/
theorem translated_fvars_instantiateList_wf
    {P : FVarId → Prop} {e : Expr} {as : List Expr} {k : Nat}
    (he : Expr.FVarsIn P e) (has : ∀ a ∈ as, Expr.FVarsIn P a) :
    Expr.FVarsIn P (Expr.instantiateList e as k) := by
  exact FVarsIn.instantiateList he has (k := k)

/-- KA-57 bridge: source closedness is preserved when closing one free variable by abstraction. -/
theorem translated_closed_abstract1_wf
    {e : Expr} {a : FVarId} {k : Nat}
    (h : Expr.Closed e k) :
    Expr.Closed (Expr.abstract1 a e k) (k + 1) := by
  exact Closed.abstract1 h

end Lean4Lean.PSKernelKA57

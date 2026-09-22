import Lean4Lean.Verify.Typing.Expr
import Lean4Lean.Verify.Typing.Lemmas

namespace Lean4Lean.PSKernelKA56
open Lean
open Lean4Lean

/-- KA-56 bridge: source free-variable predicates are monotone under weakening. -/
theorem translated_expr_fvars_mono_wf
    {P Q : FVarId → Prop} {e : Expr}
    (hPQ : ∀ fv, P fv → Q fv)
    (h : Expr.FVarsIn P e) :
    Expr.FVarsIn Q e := by
  exact FVarsIn.mono hPQ h

/-- KA-56 bridge: source closedness is monotone in the loose-bvar bound. -/
theorem translated_expr_closed_mono_wf
    {e : Expr} {k k' : Nat}
    (hkk : k ≤ k')
    (h : Expr.Closed e k) :
    Expr.Closed e k' := by
  exact Closed.mono hkk h

/-- KA-56 bridge: unrestricted source free-variable well-formedness is equivalent to no metavariables. -/
theorem translated_expr_fvars_no_mvar_equiv_wf
    {e : Expr} :
    Expr.FVarsIn (fun _ => True) e ↔ e.hasMVar = false := by
  exact fvarsIn_iff_hasMVar

/-- KA-56 bridge: literal constructor expansion is source-closed at any loose-bvar bound. -/
theorem translated_expr_literal_constructor_closed_wf
    {l : Literal} {k : Nat} :
    Expr.Closed l.toConstructor k := by
  exact Closed.toConstructor

end Lean4Lean.PSKernelKA56

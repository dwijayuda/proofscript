import Lean4Lean.Verify.TypeChecker.IsDefEq

namespace Lean4Lean.PSKernelKA74
open Lean
open Lean4Lean
open Lean4Lean.TypeChecker

/-- KA-74 bridge: Nat-zero recognizer transports source zero evidence to the translated VExpr form. -/
theorem translated_isNatZero_wf {c : VContext}
    {e : Expr} {e' : VExpr}
    (H : Lean4Lean.TypeChecker.Inner.isNatZero e)
    (he : c.TrExprS e e') :
    e' = .natZero := by
  exact Lean4Lean.TypeChecker.Inner.isNatZero_wf H he

/-- KA-74 bridge: Nat-succ recognizer exposes translated predecessor evidence. -/
theorem translated_isNatSuccOf_wf {c : VContext}
    {e e₁ : Expr} {e' : VExpr}
    (H : Lean4Lean.TypeChecker.Inner.isNatSuccOf? e = some e₁)
    (he : c.TrExprS e e') :
    ∃ x, c.TrExprS e₁ x ∧ e' = .app .natSucc x := by
  exact Lean4Lean.TypeChecker.Inner.isNatSuccOf?_wf H he

end Lean4Lean.PSKernelKA74

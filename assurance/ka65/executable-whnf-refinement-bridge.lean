import Lean4Lean.Verify.TypeChecker.Basic
import Lean4Lean.Verify.TypeChecker.WHNF

namespace Lean4Lean.PSKernelKA65
open Lean
open Lean4Lean
open Lean4Lean.TypeChecker

/-- KA-65 bridge: top-level WHNF preserves the translated expression and free-variable boundary. -/
theorem translated_whnf_wf {c : VContext} {s : VState} {e : Expr} {e' : VExpr}
    (he : c.TrExprS e e') :
    RecM.WF c s (Lean4Lean.TypeChecker.Inner.whnf e) fun e₁ _ => c.FVarsBelow e e₁ ∧ c.TrExpr e₁ e' := by
  exact Lean4Lean.TypeChecker.Inner.whnf.WF he

/-- KA-65 bridge: WHNF core preserves the translated expression and free-variable boundary. -/
theorem translated_whnfCore_wf {c : VContext} {s : VState} {e : Expr} {e' : VExpr} {cheapProj : Bool}
    (he : c.TrExprS e e') :
    RecM.WF c s (Lean4Lean.TypeChecker.Inner.whnfCore e cheapProj) fun e₁ _ => c.FVarsBelow e e₁ ∧ c.TrExpr e₁ e' := by
  exact Lean4Lean.TypeChecker.Inner.whnfCore.WF he

/-- KA-65 bridge: recursive WHNF core preserves the translated expression and free-variable boundary. -/
theorem translated_whnfCore_prime_wf {c : VContext} {s : VState} {e : Expr} {e' : VExpr} {cheapProj : Bool}
    (he : c.TrExprS e e') :
    RecM.WF c s (Lean4Lean.TypeChecker.Inner.whnfCore' e cheapProj) fun e₁ _ => c.FVarsBelow e e₁ ∧ c.TrExpr e₁ e' := by
  exact Lean4Lean.TypeChecker.Inner.whnfCore'.WF he

/-- KA-65 bridge: recursive WHNF preserves the translated expression and free-variable boundary. -/
theorem translated_whnf_prime_wf {c : VContext} {s : VState} {e : Expr} {e' : VExpr}
    (he : c.TrExprS e e') :
    RecM.WF c s (Lean4Lean.TypeChecker.Inner.whnf' e) fun e₁ _ => c.FVarsBelow e e₁ ∧ c.TrExpr e₁ e' := by
  exact Lean4Lean.TypeChecker.Inner.whnf'.WF he

end Lean4Lean.PSKernelKA65

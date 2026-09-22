import Lean4Lean.Verify.TypeChecker.InferType

namespace Lean4Lean.PSKernelKA77
open Lean hiding Environment Exception
open Kernel
open Lean4Lean
open Lean4Lean.TypeChecker
open Lean4Lean.TypeChecker.Inner

/-- KA-77 bridge: ensure-forall core transports WHNF forall shape for app inference. -/
theorem translated_ensureForallCore_wf {c : VContext} {s : VState} {e e₀ : Expr} {e' : VExpr}
    (he : c.TrExprS e e') :
    RecM.WF c s (ensureForallCore e e₀) fun e1 _ => c.FVarsBelow e e1 ∧
      c.TrExpr e1 e' ∧ ∃ name ty body bi, e1 = .forallE name ty body bi := by
  exact Lean4Lean.TypeChecker.Inner.ensureForallCore.WF he

/-- KA-77 bridge: lambda inference preserves translated typing. -/
theorem translated_inferLambda_wf {c : VContext} {s : VState} {e : Expr} {inferOnly : Bool}
    (h1 : e.FVarsIn (· ∈ c.vlctx.fvars))
    (hinf : inferOnly = true → ∃ e', c.TrExprS e e') :
    (inferLambda e inferOnly).WF c s fun ty _ => ∃ e' ty', c.TrTyping e ty e' ty' := by
  exact Lean4Lean.TypeChecker.Inner.inferLambda.WF h1 hinf

/-- KA-77 bridge: forall inference preserves translated sort typing. -/
theorem translated_inferForall_wf {c : VContext} {s : VState} {e : Expr} {inferOnly : Bool}
    (hr : e.FVarsIn (· ∈ c.vlctx.fvars))
    (hinf : inferOnly = true → ∃ e', c.TrExprS e e') :
    (inferForall e inferOnly).WF c s fun ty _ => ∃ e' u, c.TrTyping e ty e' (.sort u) := by
  exact Lean4Lean.TypeChecker.Inner.inferForall.WF hr hinf

/-- KA-77 bridge: application inference preserves translated typing through ensure-forall and DefEq. -/
theorem translated_inferApp_wf {c : VContext} {s : VState} {e : Expr} {e' : VExpr}
    (he : c.TrExprS e e') :
    RecM.WF c s (inferApp e) fun ty _ => ∃ ty', c.TrTyping e ty e' ty' := by
  exact Lean4Lean.TypeChecker.Inner.inferApp.WF he

/-- KA-77 bridge: let inference preserves translated typing. -/
theorem translated_inferLet_wf {c : VContext} {s : VState} {e : Expr} {inferOnly : Bool}
    (hr : e.FVarsIn (· ∈ c.vlctx.fvars))
    (hinf : inferOnly = true → ∃ e', c.TrExprS e e') :
    (inferLet e inferOnly).WF c s fun ty _ => ∃ e' ty', c.TrTyping e ty e' ty' := by
  exact Lean4Lean.TypeChecker.Inner.inferLet.WF hr hinf

end Lean4Lean.PSKernelKA77

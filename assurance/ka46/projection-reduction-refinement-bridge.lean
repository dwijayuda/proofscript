import Lean4Lean.Verify.TypeChecker.Reduce
import Lean4Lean.Verify.TypeChecker.WHNF
import Lean4Lean.Verify.TypeChecker.InferType

namespace Lean4Lean
namespace PSKernelKA46

open Lean hiding Environment Exception
open Kernel
open TypeChecker

/-- KA-46: direct bridge to Lean4Lean's verified projection-core reducer. -/
theorem translated_reduceProjCore_wf {c : TypeChecker.VContext} {s : TypeChecker.VState}
    {n : Name} {i : Nat} {e : Expr} {e' : VExpr}
    (he : c.TrExprS (.proj n i e) e') :
    TypeChecker.RecM.WF c s (TypeChecker.Inner.reduceProjCore i e) fun oe _ =>
      ∀ e₁, oe = some e₁ → c.FVarsBelow (.proj n i e) e₁ ∧ c.TrExpr e₁ e' :=
  TypeChecker.Inner.reduceProjCore.WF he

/-- KA-46: direct bridge to Lean4Lean's verified projection reducer. -/
theorem translated_reduceProj_wf {c : TypeChecker.VContext} {s : TypeChecker.VState}
    {n : Name} {i : Nat} {e : Expr} {e' : VExpr}
    (he : c.TrExprS (.proj n i e) e') :
    TypeChecker.RecM.WF c s (TypeChecker.Inner.reduceProj i e cheapProj) fun oe _ =>
      ∀ e₁, oe = some e₁ → c.FVarsBelow (.proj n i e) e₁ ∧ c.TrExpr e₁ e' :=
  TypeChecker.Inner.reduceProj.WF he

/-- KA-46: WHNF-core verification includes the projection-reduction path. -/
theorem translated_whnfCore_projection_path_wf {c : TypeChecker.VContext} {s : TypeChecker.VState}
    {e : Expr} {e' : VExpr}
    (he : c.TrExprS e e') :
    TypeChecker.RecM.WF c s (TypeChecker.Inner.whnfCore' e cheapProj) fun e₁ _ =>
      c.FVarsBelow e e₁ ∧ c.TrExpr e₁ e' :=
  TypeChecker.Inner.whnfCore'.WF he

/-- KA-46: direct bridge to Lean4Lean's verified projection type inference. -/
theorem translated_inferProj_wf {c : TypeChecker.VContext} {s : TypeChecker.VState}
    {st : Name} {i : Nat} {e ety : Expr} {e' ety' ty' : VExpr}
    (he : c.TrExprS e e') (hty : c.TrExprS ety ety') (hasty : c.HasType e' ty') :
    (TypeChecker.Inner.inferProj st i e ety).WF c s fun ty _ =>
      ∃ ty', c.TrTyping (.proj st i e) ty e' ty' :=
  TypeChecker.Inner.inferProj.WF he hty hasty

end PSKernelKA46
end Lean4Lean

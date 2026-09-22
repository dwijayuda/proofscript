import Lean4Lean.Verify.Typing.Expr
import Lean4Lean.Verify.Typing.Lemmas
import Lean4Lean.Verify.TypeChecker.Basic

namespace Lean4Lean.PSKernelKA53
open Lean
open Lean4Lean

/-- KA-53 bridge: free-variable translation is exactly the Lean4Lean `TrExprS.fvar` constructor. -/
theorem translated_trExprS_fvar_constructor_wf
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {fv : FVarId} {e A : VExpr}
    (h : Δ.find? (.inr fv) = some (e, A)) :
    TrExprS env Us Δ (.fvar fv) e := by
  exact TrExprS.fvar h

/-- KA-53 bridge: literal translation is exactly the Lean4Lean `TrExprS.lit` constructor. -/
theorem translated_trExprS_lit_constructor_wf
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {l : Literal} {e : VExpr}
    (hc : env.ContainsLits l)
    (h : TrExprS env Us Δ l.toConstructor e) :
    TrExprS env Us Δ (.lit l) e := by
  exact TrExprS.lit hc h

/-- KA-53 bridge: metadata erasure during translation is exactly the Lean4Lean `TrExprS.mdata` constructor. -/
theorem translated_trExprS_mdata_constructor_wf
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {m : MData} {e : Expr} {e' : VExpr}
    (h : TrExprS env Us Δ e e') :
    TrExprS env Us Δ (.mdata m e) e' := by
  exact TrExprS.mdata h

/-- KA-53 bridge: projection translation is exactly the Lean4Lean `TrExprS.proj` constructor. -/
theorem translated_trExprS_proj_constructor_wf
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {s : Name} {i : Nat} {e : Expr}
    {e' e'' : VExpr}
    (h : TrExprS env Us Δ e e')
    (hp : TrProj Δ.toCtx s i e' e'') :
    TrExprS env Us Δ (.proj s i e) e'' := by
  exact TrExprS.proj h hp

end Lean4Lean.PSKernelKA53

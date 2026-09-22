import Lean4Lean.Verify.Typing.Expr
import Lean4Lean.Verify.Typing.Lemmas
import Lean4Lean.Verify.TypeChecker.Basic

namespace Lean4Lean.PSKernelKA52
open Lean
open Lean4Lean

/-- KA-52 bridge: lambda translation is exactly the Lean4Lean `TrExprS.lam` constructor. -/
theorem translated_trExprS_lam_binder_constructor_wf
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {name : Name} {ty body : Expr}
    {bi : BinderInfo} {ty' body' : VExpr}
    (hTy : env.IsType Us.length Δ.toCtx ty')
    (hTyTr : TrExprS env Us Δ ty ty')
    (hBody : TrExprS env Us ((none, .vlam ty') :: Δ) body body') :
    TrExprS env Us Δ (.lam name ty body bi) (.lam ty' body') := by
  exact TrExprS.lam hTy hTyTr hBody

/-- KA-52 bridge: dependent function translation is exactly the Lean4Lean `TrExprS.forallE` constructor. -/
theorem translated_trExprS_forall_binder_constructor_wf
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {name : Name} {ty body : Expr}
    {bi : BinderInfo} {ty' body' : VExpr}
    (hTy : env.IsType Us.length Δ.toCtx ty')
    (hBodyTy : env.IsType Us.length (ty' :: Δ.toCtx) body')
    (hTyTr : TrExprS env Us Δ ty ty')
    (hBody : TrExprS env Us ((none, .vlam ty') :: Δ) body body') :
    TrExprS env Us Δ (.forallE name ty body bi) (.forallE ty' body') := by
  exact TrExprS.forallE hTy hBodyTy hTyTr hBody

/-- KA-52 bridge: let translation is exactly the Lean4Lean `TrExprS.letE` constructor. -/
theorem translated_trExprS_let_binder_constructor_wf
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {name : Name} {ty val body : Expr}
    {nonDep : Bool} {ty' val' body' : VExpr}
    (hValTy : env.HasType Us.length Δ.toCtx val' ty')
    (hTyTr : TrExprS env Us Δ ty ty')
    (hValTr : TrExprS env Us Δ val val')
    (hBodyTr : TrExprS env Us ((none, .vlet ty' val') :: Δ) body body') :
    TrExprS env Us Δ (.letE name ty val body nonDep) body' := by
  exact TrExprS.letE hValTy hTyTr hValTr hBodyTr

end Lean4Lean.PSKernelKA52

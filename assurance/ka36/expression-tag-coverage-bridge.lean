import Lean4Lean.Verify.Typing.Expr

/-
KA-36 direct Lean4Lean expression tag coverage bridge.

This file imports the real Lean4Lean expression-translation relation and
re-exposes one conditional wrapper lemma for every constructor of
Lean4Lean.TrExprS: bvar, fvar, sort, const, app, lam, forallE, letE, lit,
mdata, and proj.

This is proof-surface coverage for Lean4Lean's translation relation, not a
claim that PSKernel now has executable end-to-end raw Lean.Expr coverage. In
particular, raw expression metavariables are still outside this bridge.
-/

namespace PSKernelKA36

open Lean4Lean
open Lean hiding Environment Exception

/-- Lean4Lean expression translation covers bound variables. -/
theorem translated_bvar_expr_tag_covered
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {i : Nat} {e A : VExpr}
    (h : Δ.find? (.inl i) = some (e, A)) :
    Lean4Lean.TrExprS env Us Δ (.bvar i) e := by
  exact Lean4Lean.TrExprS.bvar h

/-- Lean4Lean expression translation covers free variables. -/
theorem translated_fvar_expr_tag_covered
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {fv : FVarId} {e A : VExpr}
    (h : Δ.find? (.inr fv) = some (e, A)) :
    Lean4Lean.TrExprS env Us Δ (.fvar fv) e := by
  exact Lean4Lean.TrExprS.fvar h

/-- Lean4Lean expression translation covers sorts. -/
theorem translated_sort_expr_tag_covered
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {u : Level} {u' : VLevel}
    (h : VLevel.ofLevel Us u = some u') :
    Lean4Lean.TrExprS env Us Δ (.sort u) (.sort u') := by
  exact Lean4Lean.TrExprS.sort h

/-- Lean4Lean expression translation covers constants. -/
theorem translated_const_expr_tag_covered
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {c : Name} {us : List Level} {us' : List VLevel} {ci : VConstant}
    (hconst : env.constants c = some ci)
    (hlevels : us.mapM (VLevel.ofLevel Us) = some us')
    (hlen : us.length = ci.uvars) :
    Lean4Lean.TrExprS env Us Δ (.const c us) (.const c us') := by
  exact Lean4Lean.TrExprS.const hconst hlevels hlen

/-- Lean4Lean expression translation covers applications. -/
theorem translated_app_expr_tag_covered
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {f a : Expr} {f' a' A B : VExpr}
    (hfTy : env.HasType Us.length Δ.toCtx f' (.forallE A B))
    (haTy : env.HasType Us.length Δ.toCtx a' A)
    (hf : Lean4Lean.TrExprS env Us Δ f f')
    (ha : Lean4Lean.TrExprS env Us Δ a a') :
    Lean4Lean.TrExprS env Us Δ (.app f a) (.app f' a') := by
  exact Lean4Lean.TrExprS.app hfTy haTy hf ha

/-- Lean4Lean expression translation covers lambdas. -/
theorem translated_lam_expr_tag_covered
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {name : Name} {ty body : Expr} {bi : BinderInfo} {ty' body' : VExpr}
    (hTy : env.IsType Us.length Δ.toCtx ty')
    (hTyTr : Lean4Lean.TrExprS env Us Δ ty ty')
    (hBody : Lean4Lean.TrExprS env Us ((none, .vlam ty') :: Δ) body body') :
    Lean4Lean.TrExprS env Us Δ (.lam name ty body bi) (.lam ty' body') := by
  exact Lean4Lean.TrExprS.lam hTy hTyTr hBody

/-- Lean4Lean expression translation covers dependent function types. -/
theorem translated_forall_expr_tag_covered
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {name : Name} {ty body : Expr} {bi : BinderInfo} {ty' body' : VExpr}
    (hTy : env.IsType Us.length Δ.toCtx ty')
    (hBodyTy : env.IsType Us.length (ty' :: Δ.toCtx) body')
    (hTyTr : Lean4Lean.TrExprS env Us Δ ty ty')
    (hBody : Lean4Lean.TrExprS env Us ((none, .vlam ty') :: Δ) body body') :
    Lean4Lean.TrExprS env Us Δ (.forallE name ty body bi) (.forallE ty' body') := by
  exact Lean4Lean.TrExprS.forallE hTy hBodyTy hTyTr hBody

/-- Lean4Lean expression translation covers let expressions by translating them away to the translated body. -/
theorem translated_let_expr_tag_covered
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {name : Name} {ty val body : Expr} {nonDep : Bool} {ty' val' body' : VExpr}
    (hValTy : env.HasType Us.length Δ.toCtx val' ty')
    (hTyTr : Lean4Lean.TrExprS env Us Δ ty ty')
    (hValTr : Lean4Lean.TrExprS env Us Δ val val')
    (hBodyTr : Lean4Lean.TrExprS env Us ((none, .vlet ty' val') :: Δ) body body') :
    Lean4Lean.TrExprS env Us Δ (.letE name ty val body nonDep) body' := by
  exact Lean4Lean.TrExprS.letE hValTy hTyTr hValTr hBodyTr

/-- Lean4Lean expression translation covers literals through their constructor encoding. -/
theorem translated_lit_expr_tag_covered
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {l : Literal} {e : VExpr}
    (hLit : env.ContainsLits l)
    (hCtor : Lean4Lean.TrExprS env Us Δ l.toConstructor e) :
    Lean4Lean.TrExprS env Us Δ (.lit l) e := by
  exact Lean4Lean.TrExprS.lit hLit hCtor

/-- Lean4Lean expression translation covers metadata by erasing it. -/
theorem translated_mdata_expr_tag_covered
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {d : MData} {e : Expr} {e' : VExpr}
    (h : Lean4Lean.TrExprS env Us Δ e e') :
    Lean4Lean.TrExprS env Us Δ (.mdata d e) e' := by
  exact Lean4Lean.TrExprS.mdata h

/-- Lean4Lean expression translation covers projections through TrProj. -/
theorem translated_proj_expr_tag_covered
    {env : VEnv} {Us : List Name} {Δ : VLCtx} {s : Name} {i : Nat} {e : Expr} {e' e'' : VExpr}
    (hExpr : Lean4Lean.TrExprS env Us Δ e e')
    (hProj : Lean4Lean.TrProj Δ.toCtx s i e' e'') :
    Lean4Lean.TrExprS env Us Δ (.proj s i e) e'' := by
  exact Lean4Lean.TrExprS.proj hExpr hProj

end PSKernelKA36

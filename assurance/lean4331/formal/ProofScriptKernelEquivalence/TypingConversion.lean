import ProofScriptKernelEquivalence.DefEqOrdinary

namespace ProofScriptKernelEquivalence
namespace ConversionTyping

/--
Basic ProofScript typing with an explicit conversion layer backed only by the
already-established ordinary definitional-equality relation.

This avoids circularity: OrdinaryDefEq's eta/proof-irrelevance premises use the
conversion-free DirectTyping relation, while this relation consumes OrdinaryDefEq.
-/
inductive PSTyping (env : PSOrdinaryEqEnv) : List PSExpr → PSExpr → PSExpr → Prop where
  | sort (ctx : List PSExpr) (u : PSLevel) :
      PSTyping env ctx (.sort u) (.sort (.succ u))
  | bvar {ctx : List PSExpr} {i : Nat} {ty : PSExpr} :
      ctx[i]? = some ty → PSTyping env ctx (.bvar i) ty
  | const {ctx : List PSExpr} {n : Lean.Name} {us : List PSLevel} {ty : PSExpr} :
      env.typing.lookup n us = some ty → PSTyping env ctx (.const n us) ty
  | app {ctx : List PSExpr} {f a fTy aTy d b : PSExpr} {bi : PSBinderInfo} :
      PSTyping env ctx f fTy →
      OrdinaryDefEq.PSEq env ctx fTy (.pi d b bi) →
      PSTyping env ctx a aTy →
      OrdinaryDefEq.PSEq env ctx aTy d →
      PSTyping env ctx (.app f a) (PSExpr.instantiate1 b a)
  | lam {ctx : List PSExpr} {d dTy body bodyTy : PSExpr} {u : PSLevel} {bi : PSBinderInfo} :
      PSTyping env ctx d dTy →
      OrdinaryDefEq.PSEq env ctx dTy (.sort u) →
      PSTyping env (d :: ctx) body bodyTy →
      PSTyping env ctx (.lam d body bi) (.pi d bodyTy bi)
  | pi {ctx : List PSExpr} {d dTy body bodyTy : PSExpr} {u v : PSLevel} {bi : PSBinderInfo} :
      PSTyping env ctx d dTy →
      OrdinaryDefEq.PSEq env ctx dTy (.sort u) →
      PSTyping env (d :: ctx) body bodyTy →
      OrdinaryDefEq.PSEq env (d :: ctx) bodyTy (.sort v) →
      PSTyping env ctx (.pi d body bi) (.sort (.imax u v))
  | letE {ctx : List PSExpr} {t tTy value valueTy body bodyTy : PSExpr}
      {u : PSLevel} {nondep : Bool} :
      PSTyping env ctx t tTy →
      OrdinaryDefEq.PSEq env ctx tTy (.sort u) →
      PSTyping env ctx value valueTy →
      OrdinaryDefEq.PSEq env ctx valueTy t →
      PSTyping env (t :: ctx) body bodyTy →
      PSTyping env ctx (.letE t value body nondep) (PSExpr.instantiate1 bodyTy value)
  | conv {ctx : List PSExpr} {e actual expected : PSExpr} :
      PSTyping env ctx e actual →
      OrdinaryDefEq.PSEq env ctx actual expected →
      PSTyping env ctx e expected

/-- Lean-expression image of the same explicit-conversion typing rules. -/
inductive LeanTyping (env : LeanOrdinaryEqEnv) : List Lean.Expr → Lean.Expr → Lean.Expr → Prop where
  | sort (ctx : List Lean.Expr) (u : Lean.Level) :
      LeanTyping env ctx (.sort u) (.sort (.succ u))
  | bvar {ctx : List Lean.Expr} {i : Nat} {ty : Lean.Expr} :
      ctx[i]? = some ty → LeanTyping env ctx (.bvar i) ty
  | const {ctx : List Lean.Expr} {n : Lean.Name} {us : List Lean.Level} {ty : Lean.Expr} :
      env.typing.lookup n us = some ty → LeanTyping env ctx (.const n us) ty
  | app {ctx : List Lean.Expr} {f a fTy aTy d b : Lean.Expr} {bi : Lean.BinderInfo} :
      LeanTyping env ctx f fTy →
      OrdinaryDefEq.LeanEq env ctx fTy (.forallE .anonymous d b bi) →
      LeanTyping env ctx a aTy →
      OrdinaryDefEq.LeanEq env ctx aTy d →
      LeanTyping env ctx (.app f a) (LeanExprSpec.instantiate1 b a)
  | lam {ctx : List Lean.Expr} {d dTy body bodyTy : Lean.Expr} {u : Lean.Level}
      {bi : Lean.BinderInfo} :
      LeanTyping env ctx d dTy →
      OrdinaryDefEq.LeanEq env ctx dTy (.sort u) →
      LeanTyping env (d :: ctx) body bodyTy →
      LeanTyping env ctx (.lam .anonymous d body bi) (.forallE .anonymous d bodyTy bi)
  | forallE {ctx : List Lean.Expr} {d dTy body bodyTy : Lean.Expr} {u v : Lean.Level}
      {bi : Lean.BinderInfo} :
      LeanTyping env ctx d dTy →
      OrdinaryDefEq.LeanEq env ctx dTy (.sort u) →
      LeanTyping env (d :: ctx) body bodyTy →
      OrdinaryDefEq.LeanEq env (d :: ctx) bodyTy (.sort v) →
      LeanTyping env ctx (.forallE .anonymous d body bi) (.sort (.imax u v))
  | letE {ctx : List Lean.Expr} {t tTy value valueTy body bodyTy : Lean.Expr}
      {u : Lean.Level} {nondep : Bool} :
      LeanTyping env ctx t tTy →
      OrdinaryDefEq.LeanEq env ctx tTy (.sort u) →
      LeanTyping env ctx value valueTy →
      OrdinaryDefEq.LeanEq env ctx valueTy t →
      LeanTyping env (t :: ctx) body bodyTy →
      LeanTyping env ctx (.letE .anonymous t value body nondep)
        (LeanExprSpec.instantiate1 bodyTy value)
  | conv {ctx : List Lean.Expr} {e actual expected : Lean.Expr} :
      LeanTyping env ctx e actual →
      OrdinaryDefEq.LeanEq env ctx actual expected →
      LeanTyping env ctx e expected

private theorem ctx_lookup_sound (ctx : List PSExpr) (i : Nat) (ty : PSExpr)
    (h : ctx[i]? = some ty) :
    (ctx.map PSExpr.toLean)[i]? = some (PSExpr.toLean ty) := by
  rw [List.getElem?_map]
  simpa [h]

/--
PS→Lean typing refinement for the basic shared Core with ordinary conversion.
This closes the non-circular typing layer for Sort/BVar/Const/App/Lam/Pi/Let
relative to the current ordinary equality fragment.
-/
theorem typing_sound
    (psEnv : PSOrdinaryEqEnv) (leanEnv : LeanOrdinaryEqEnv)
    (hEnv : OrdinaryEqEnvSound psEnv leanEnv)
    {ctx : List PSExpr} {e ty : PSExpr}
    (h : PSTyping psEnv ctx e ty) :
    LeanTyping leanEnv (ctx.map PSExpr.toLean) (PSExpr.toLean e) (PSExpr.toLean ty) := by
  have hTyping := hEnv.2
  induction h with
  | sort ctx u => exact .sort _ _
  | bvar hLookup => exact .bvar (ctx_lookup_sound _ _ _ hLookup)
  | const hLookup => exact .const (hTyping _ _ _ hLookup)
  | app hf hFnEq ha hArgEq ihf iha =>
      have hFnEqLean := OrdinaryDefEq.sound psEnv leanEnv hEnv hFnEq
      have hArgEqLean := OrdinaryDefEq.sound psEnv leanEnv hEnv hArgEq
      simpa [PSExpr.toLean, PSExpr.instantiate1_toLean] using
        LeanTyping.app ihf hFnEqLean iha hArgEqLean
  | lam hd hSort hBody ihd ihBody =>
      have hSortLean := OrdinaryDefEq.sound psEnv leanEnv hEnv hSort
      simpa [PSExpr.toLean] using LeanTyping.lam ihd hSortLean ihBody
  | pi hd hDSort hBody hBSort ihd ihBody =>
      have hDSortLean := OrdinaryDefEq.sound psEnv leanEnv hEnv hDSort
      have hBSortLean := OrdinaryDefEq.sound psEnv leanEnv hEnv hBSort
      simpa [PSExpr.toLean, PSLevel.toLean] using
        LeanTyping.forallE ihd hDSortLean ihBody hBSortLean
  | letE ht hTSort hv hValue hBody iht ihv ihBody =>
      have hTSortLean := OrdinaryDefEq.sound psEnv leanEnv hEnv hTSort
      have hValueLean := OrdinaryDefEq.sound psEnv leanEnv hEnv hValue
      simpa [PSExpr.toLean, PSExpr.instantiate1_toLean] using
        LeanTyping.letE iht hTSortLean ihv hValueLean ihBody
  | conv hTerm hEq ih =>
      exact .conv ih (OrdinaryDefEq.sound psEnv leanEnv hEnv hEq)

end ConversionTyping
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.ConversionTyping.typing_sound

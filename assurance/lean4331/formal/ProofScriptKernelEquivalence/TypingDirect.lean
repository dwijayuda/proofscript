import ProofScriptKernelEquivalence.ExprOperations

namespace ProofScriptKernelEquivalence

/--
Environment interface for the conversion-free typing slice.  Universe
instantiation is abstracted into lookup so declaration/environment correspondence
can be proved independently.
-/
structure PSDirectEnv where
  lookup : Lean.Name → List PSLevel → Option PSExpr

structure LeanDirectEnv where
  lookup : Lean.Name → List Lean.Level → Option Lean.Expr

/-- One-way environment relation required by the PS→Lean refinement theorem. -/
def DirectEnvSound (ps : PSDirectEnv) (lean : LeanDirectEnv) : Prop :=
  ∀ n us ty,
    ps.lookup n us = some ty →
      lean.lookup n (us.map PSLevel.toLean) = some (PSExpr.toLean ty)

namespace DirectTyping

/--
Conversion-free ProofScript typing rules for the shared Core.

There is deliberately no conversion rule here.  The real v69 checker allows
argument/type agreement by definitional equality; that remaining bridge belongs
to O-DEF and is not smuggled into this theorem as an assumption.
-/
inductive PSTyping (env : PSDirectEnv) : List PSExpr → PSExpr → PSExpr → Prop where
  | sort (ctx : List PSExpr) (u : PSLevel) :
      PSTyping env ctx (.sort u) (.sort (.succ u))
  | bvar {ctx : List PSExpr} {i : Nat} {ty : PSExpr} :
      ctx[i]? = some ty → PSTyping env ctx (.bvar i) ty
  | const {ctx : List PSExpr} {n : Lean.Name} {us : List PSLevel} {ty : PSExpr} :
      env.lookup n us = some ty → PSTyping env ctx (.const n us) ty
  | app {ctx : List PSExpr} {f a d b : PSExpr} {bi : PSBinderInfo} :
      PSTyping env ctx f (.pi d b bi) →
      PSTyping env ctx a d →
      PSTyping env ctx (.app f a) (PSExpr.instantiate1 b a)
  | lam {ctx : List PSExpr} {d b bTy : PSExpr} {u : PSLevel} {bi : PSBinderInfo} :
      PSTyping env ctx d (.sort u) →
      PSTyping env (d :: ctx) b bTy →
      PSTyping env ctx (.lam d b bi) (.pi d bTy bi)
  | pi {ctx : List PSExpr} {d b : PSExpr} {u v : PSLevel} {bi : PSBinderInfo} :
      PSTyping env ctx d (.sort u) →
      PSTyping env (d :: ctx) b (.sort v) →
      PSTyping env ctx (.pi d b bi) (.sort (.imax u v))
  | letE {ctx : List PSExpr} {t value body bodyTy : PSExpr} {u : PSLevel} {nondep : Bool} :
      PSTyping env ctx t (.sort u) →
      PSTyping env ctx value t →
      PSTyping env (t :: ctx) body bodyTy →
      PSTyping env ctx (.letE t value body nondep) (PSExpr.instantiate1 bodyTy value)

/-- Lean-expression image of exactly the same conversion-free rules. -/
inductive LeanTyping (env : LeanDirectEnv) : List Lean.Expr → Lean.Expr → Lean.Expr → Prop where
  | sort (ctx : List Lean.Expr) (u : Lean.Level) :
      LeanTyping env ctx (.sort u) (.sort (.succ u))
  | bvar {ctx : List Lean.Expr} {i : Nat} {ty : Lean.Expr} :
      ctx[i]? = some ty → LeanTyping env ctx (.bvar i) ty
  | const {ctx : List Lean.Expr} {n : Lean.Name} {us : List Lean.Level} {ty : Lean.Expr} :
      env.lookup n us = some ty → LeanTyping env ctx (.const n us) ty
  | app {ctx : List Lean.Expr} {f a d b : Lean.Expr} {n : Lean.Name} {bi : Lean.BinderInfo} :
      LeanTyping env ctx f (.forallE n d b bi) →
      LeanTyping env ctx a d →
      LeanTyping env ctx (.app f a) (LeanExprSpec.instantiate1 b a)
  | lam {ctx : List Lean.Expr} {d b bTy : Lean.Expr} {u : Lean.Level} {bi : Lean.BinderInfo} :
      LeanTyping env ctx d (.sort u) →
      LeanTyping env (d :: ctx) b bTy →
      LeanTyping env ctx (.lam .anonymous d b bi) (.forallE .anonymous d bTy bi)
  | forallE {ctx : List Lean.Expr} {d b : Lean.Expr} {u v : Lean.Level} {bi : Lean.BinderInfo} :
      LeanTyping env ctx d (.sort u) →
      LeanTyping env (d :: ctx) b (.sort v) →
      LeanTyping env ctx (.forallE .anonymous d b bi) (.sort (.imax u v))
  | letE {ctx : List Lean.Expr} {t value body bodyTy : Lean.Expr} {u : Lean.Level} {nondep : Bool} :
      LeanTyping env ctx t (.sort u) →
      LeanTyping env ctx value t →
      LeanTyping env (t :: ctx) body bodyTy →
      LeanTyping env ctx (.letE .anonymous t value body nondep)
        (LeanExprSpec.instantiate1 bodyTy value)

private theorem ctx_lookup_sound (ctx : List PSExpr) (i : Nat) (ty : PSExpr)
    (h : ctx[i]? = some ty) :
    (ctx.map PSExpr.toLean)[i]? = some (PSExpr.toLean ty) := by
  rw [List.getElem?_map]
  simpa [h]

/--
Machine-checked PS→Lean typing refinement for the conversion-free shared Core.
This covers Sort, bvar, constant lookup, application, lambda, dependent Pi and
let, with the already-proved de Bruijn-instantiation bridge.
-/
theorem typing_sound
    (psEnv : PSDirectEnv) (leanEnv : LeanDirectEnv)
    (hEnv : DirectEnvSound psEnv leanEnv)
    {ctx : List PSExpr} {e ty : PSExpr}
    (h : PSTyping psEnv ctx e ty) :
    LeanTyping leanEnv (ctx.map PSExpr.toLean) (PSExpr.toLean e) (PSExpr.toLean ty) := by
  induction h with
  | sort ctx u =>
      exact .sort _ _
  | bvar hLookup =>
      exact .bvar (ctx_lookup_sound _ _ _ hLookup)
  | const hLookup =>
      exact .const (hEnv _ _ _ hLookup)
  | app hf ha ihf iha =>
      simpa [PSExpr.toLean, PSExpr.instantiate1_toLean] using LeanTyping.app ihf iha
  | lam hd hb ihd ihb =>
      simpa [PSExpr.toLean] using LeanTyping.lam ihd ihb
  | pi hd hb ihd ihb =>
      simpa [PSExpr.toLean, PSLevel.toLean] using LeanTyping.forallE ihd ihb
  | letE ht hv hb iht ihv ihb =>
      simpa [PSExpr.toLean, PSExpr.instantiate1_toLean] using LeanTyping.letE iht ihv ihb

end DirectTyping
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.DirectTyping.typing_sound

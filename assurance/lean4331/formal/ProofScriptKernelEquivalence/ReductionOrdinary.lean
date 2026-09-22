import ProofScriptKernelEquivalence.ReductionBetaZeta
import ProofScriptKernelEquivalence.DeltaTransparency

namespace ProofScriptKernelEquivalence
namespace OrdinaryReduction

/--
Ordinary weak-head computation fragment before inductive/projection/quotient
rules: beta, zeta, transparent delta, and reduction of an application head.
-/
inductive PSStep (env : PSDeltaEnv) : PSExpr → PSExpr → Prop where
  | beta (domain body arg : PSExpr) (bi : PSBinderInfo) :
      PSStep env (.app (.lam domain body bi) arg) (PSExpr.instantiate1 body arg)
  | zeta (type value body : PSExpr) (nondep : Bool) :
      PSStep env (.letE type value body nondep) (PSExpr.instantiate1 body value)
  | delta {n : Lean.Name} {us : List PSLevel} {body : PSExpr} :
      env.unfold? n us = some body →
      PSStep env (.const n us) body
  | appHead {f f' a : PSExpr} :
      PSStep env f f' →
      PSStep env (.app f a) (.app f' a)

inductive LeanStep (env : LeanDeltaEnv) : Lean.Expr → Lean.Expr → Prop where
  | beta (domain body arg : Lean.Expr) (bi : Lean.BinderInfo) :
      LeanStep env (.app (.lam .anonymous domain body bi) arg)
        (LeanExprSpec.instantiate1 body arg)
  | zeta (type value body : Lean.Expr) (nondep : Bool) :
      LeanStep env (.letE .anonymous type value body nondep)
        (LeanExprSpec.instantiate1 body value)
  | delta {n : Lean.Name} {us : List Lean.Level} {body : Lean.Expr} :
      env.unfold? n us = some body →
      LeanStep env (.const n us) body
  | appHead {f f' a : Lean.Expr} :
      LeanStep env f f' →
      LeanStep env (.app f a) (.app f' a)

inductive Steps {α : Type} (r : α → α → Prop) : α → α → Prop where
  | refl (a : α) : Steps r a a
  | tail {a b c : α} : r a b → Steps r b c → Steps r a c

/-- Every ordinary PS weak-head step translates to the corresponding Lean step. -/
theorem step_sound
    (psEnv : PSDeltaEnv) (leanEnv : LeanDeltaEnv)
    (hEnv : DeltaEnvExact psEnv leanEnv)
    {a b : PSExpr} (h : PSStep psEnv a b) :
    LeanStep leanEnv (PSExpr.toLean a) (PSExpr.toLean b) := by
  induction h with
  | beta domain body arg bi =>
      simpa [PSExpr.toLean, PSExpr.instantiate1_toLean] using
        LeanStep.beta (env := leanEnv) (PSExpr.toLean domain) (PSExpr.toLean body)
          (PSExpr.toLean arg) bi.toLean
  | zeta type value body nondep =>
      simpa [PSExpr.toLean, PSExpr.instantiate1_toLean] using
        LeanStep.zeta (env := leanEnv) (PSExpr.toLean type) (PSExpr.toLean value)
          (PSExpr.toLean body) nondep
  | @delta n us body hLookup =>
      have hMapped := hEnv n us
      rw [hLookup] at hMapped
      simp only [Option.map_some] at hMapped
      exact .delta hMapped.symm
  | appHead hStep ih =>
      exact .appHead ih

/-- Translation preserves every finite ordinary weak-head reduction chain. -/
theorem steps_sound
    (psEnv : PSDeltaEnv) (leanEnv : LeanDeltaEnv)
    (hEnv : DeltaEnvExact psEnv leanEnv)
    {a b : PSExpr} (h : Steps (PSStep psEnv) a b) :
    Steps (LeanStep leanEnv) (PSExpr.toLean a) (PSExpr.toLean b) := by
  induction h with
  | refl a => exact .refl _
  | tail hab hbc ih => exact .tail (step_sound psEnv leanEnv hEnv hab) ih

end OrdinaryReduction
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.OrdinaryReduction.step_sound
#print axioms ProofScriptKernelEquivalence.OrdinaryReduction.steps_sound

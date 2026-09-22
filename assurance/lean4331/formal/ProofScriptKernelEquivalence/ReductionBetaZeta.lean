import ProofScriptKernelEquivalence.ExprOperations

namespace ProofScriptKernelEquivalence

namespace BetaZeta

/-- Primitive beta/zeta weak-head steps in the trusted ProofScript shared Core. -/
inductive PSStep : PSExpr → PSExpr → Prop where
  | beta (domain body arg : PSExpr) (bi : PSBinderInfo) :
      PSStep (.app (.lam domain body bi) arg) (PSExpr.instantiate1 body arg)
  | zeta (type value body : PSExpr) (nondep : Bool) :
      PSStep (.letE type value body nondep) (PSExpr.instantiate1 body value)

/-- Pure Lean-expression image of the same primitive beta/zeta steps. -/
inductive LeanStep : Lean.Expr → Lean.Expr → Prop where
  | beta (domain body arg : Lean.Expr) (bi : Lean.BinderInfo) :
      LeanStep (.app (.lam .anonymous domain body bi) arg)
        (LeanExprSpec.instantiate1 body arg)
  | zeta (type value body : Lean.Expr) (nondep : Bool) :
      LeanStep (.letE .anonymous type value body nondep)
        (LeanExprSpec.instantiate1 body value)

/-- Finite zero-or-more primitive steps, kept local to avoid extra library dependencies. -/
inductive Steps {α : Type} (r : α → α → Prop) : α → α → Prop where
  | refl (a : α) : Steps r a a
  | tail {a b c : α} : r a b → Steps r b c → Steps r a c

/-- Every primitive ProofScript beta/zeta step translates to the corresponding Lean step. -/
theorem step_sound {a b : PSExpr} (h : PSStep a b) :
    LeanStep (PSExpr.toLean a) (PSExpr.toLean b) := by
  cases h with
  | beta domain body arg bi =>
      simpa [PSExpr.toLean, PSExpr.instantiate1_toLean] using
        LeanStep.beta (PSExpr.toLean domain) (PSExpr.toLean body) (PSExpr.toLean arg) bi.toLean
  | zeta type value body nondep =>
      simpa [PSExpr.toLean, PSExpr.instantiate1_toLean] using
        LeanStep.zeta (PSExpr.toLean type) (PSExpr.toLean value) (PSExpr.toLean body) nondep

/-- Translation preserves every finite beta/zeta reduction chain. -/
theorem steps_sound {a b : PSExpr} (h : Steps PSStep a b) :
    Steps LeanStep (PSExpr.toLean a) (PSExpr.toLean b) := by
  induction h with
  | refl a => exact .refl _
  | tail hab hbc ih => exact .tail (step_sound hab) ih

end BetaZeta
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.BetaZeta.step_sound
#print axioms ProofScriptKernelEquivalence.BetaZeta.steps_sound

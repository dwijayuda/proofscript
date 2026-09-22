import ProofScriptKernelEquivalence.ExprTranslation

namespace ProofScriptKernelEquivalence
namespace InductiveDirectAdmission

/-- Syntactic constant-occurrence classifier on normalized ProofScript Core expressions. -/
def psContainsConst (target : Lean.Name) : PSExpr → Bool
  | .sort _ | .bvar _ => false
  | .const n _ => n == target
  | .app f a => psContainsConst target f || psContainsConst target a
  | .lam d b _ | .pi d b _ => psContainsConst target d || psContainsConst target b
  | .letE t v b _ => psContainsConst target t || psContainsConst target v || psContainsConst target b
  | .proj n _ e => (n == target) || psContainsConst target e

/-- Lean-side image of the same syntactic occurrence classifier. -/
def leanContainsConst (target : Lean.Name) : Lean.Expr → Bool
  | .bvar _ | .fvar _ | .mvar _ | .sort _ | .lit _ => false
  | .const n _ => n == target
  | .app f a => leanContainsConst target f || leanContainsConst target a
  | .lam _ d b _ | .forallE _ d b _ => leanContainsConst target d || leanContainsConst target b
  | .letE _ t v b _ => leanContainsConst target t || leanContainsConst target v || leanContainsConst target b
  | .mdata _ e => leanContainsConst target e
  | .proj n _ e => (n == target) || leanContainsConst target e

/-- Core→Lean structural translation preserves constant occurrence exactly. -/
theorem containsConst_toLean (target : Lean.Name) (e : PSExpr) :
    leanContainsConst target (PSExpr.toLean e) = psContainsConst target e := by
  induction e with
  | sort u => rfl
  | bvar i => rfl
  | const n us => rfl
  | app f a ihf iha => simp [PSExpr.toLean, leanContainsConst, psContainsConst, ihf, iha]
  | lam d b bi ihd ihb => simp [PSExpr.toLean, leanContainsConst, psContainsConst, ihd, ihb]
  | pi d b bi ihd ihb => simp [PSExpr.toLean, leanContainsConst, psContainsConst, ihd, ihb]
  | letE t v b nondep iht ihv ihb =>
      simp [PSExpr.toLean, leanContainsConst, psContainsConst, iht, ihv, ihb]
  | proj n i e ihe => simp [PSExpr.toLean, leanContainsConst, psContainsConst, ihe]

/--
Strictly-positive recursive field shape after WHNF for the direct,
parameterless/indexless slice: the family may occur only at the terminal
codomain, never in a function domain.
-/
inductive PSPositiveField (self : Lean.Name) (levels : List PSLevel) : PSExpr → Prop where
  | direct : PSPositiveField self levels (.const self levels)
  | pi {domain body bi} :
      psContainsConst self domain = false →
      PSPositiveField self levels body →
      PSPositiveField self levels (.pi domain body bi)

inductive LeanPositiveField (self : Lean.Name) (levels : List Lean.Level) : Lean.Expr → Prop where
  | direct : LeanPositiveField self levels (.const self levels)
  | forallE {domain body bi} :
      leanContainsConst self domain = false →
      LeanPositiveField self levels body →
      LeanPositiveField self levels (.forallE .anonymous domain body bi)

/-- Translation preserves direct/higher-order strict positivity. -/
theorem positiveField_sound
    {self : Lean.Name} {levels : List PSLevel} {field : PSExpr}
    (h : PSPositiveField self levels field) :
    LeanPositiveField self (levels.map PSLevel.toLean) (PSExpr.toLean field) := by
  induction h with
  | direct => exact .direct
  | @pi domain body bi hNo hPos ih =>
      apply LeanPositiveField.forallE
      · simpa [containsConst_toLean] using hNo
      · exact ih

/--
Normalized constructor telescope shape for the direct slice. Every field is
classified either nonrecursive or strictly positive; the telescope terminates
at the exact family constant.
-/
inductive PSDirectCtorShape (self : Lean.Name) (levels : List PSLevel) : PSExpr → Prop where
  | result : PSDirectCtorShape self levels (.const self levels)
  | plain {domain body bi} :
      psContainsConst self domain = false →
      PSDirectCtorShape self levels body →
      PSDirectCtorShape self levels (.pi domain body bi)
  | recursive {domain body bi} :
      PSPositiveField self levels domain →
      PSDirectCtorShape self levels body →
      PSDirectCtorShape self levels (.pi domain body bi)

inductive LeanDirectCtorShape (self : Lean.Name) (levels : List Lean.Level) : Lean.Expr → Prop where
  | result : LeanDirectCtorShape self levels (.const self levels)
  | plain {domain body bi} :
      leanContainsConst self domain = false →
      LeanDirectCtorShape self levels body →
      LeanDirectCtorShape self levels (.forallE .anonymous domain body bi)
  | recursive {domain body bi} :
      LeanPositiveField self levels domain →
      LeanDirectCtorShape self levels body →
      LeanDirectCtorShape self levels (.forallE .anonymous domain body bi)

/-- Core→Lean translation preserves the normalized direct constructor positivity/result shape. -/
theorem ctorShape_sound
    {self : Lean.Name} {levels : List PSLevel} {ctorType : PSExpr}
    (h : PSDirectCtorShape self levels ctorType) :
    LeanDirectCtorShape self (levels.map PSLevel.toLean) (PSExpr.toLean ctorType) := by
  induction h with
  | result => exact .result
  | @plain domain body bi hNo hTail ih =>
      apply LeanDirectCtorShape.plain
      · simpa [containsConst_toLean] using hNo
      · exact ih
  | @recursive domain body bi hPos hTail ih =>
      exact LeanDirectCtorShape.recursive (positiveField_sound hPos) ih

/-- A translated nonrecursive field remains nonrecursive by the same classifier. -/
theorem nonrecursiveField_sound
    {self : Lean.Name} {field : PSExpr}
    (h : psContainsConst self field = false) :
    leanContainsConst self (PSExpr.toLean field) = false := by
  simpa [containsConst_toLean] using h

end InductiveDirectAdmission
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.InductiveDirectAdmission.containsConst_toLean
#print axioms ProofScriptKernelEquivalence.InductiveDirectAdmission.positiveField_sound
#print axioms ProofScriptKernelEquivalence.InductiveDirectAdmission.ctorShape_sound
#print axioms ProofScriptKernelEquivalence.InductiveDirectAdmission.nonrecursiveField_sound

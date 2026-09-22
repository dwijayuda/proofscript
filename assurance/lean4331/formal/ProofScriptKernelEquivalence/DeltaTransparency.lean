import ProofScriptKernelEquivalence.ExprTranslation

namespace ProofScriptKernelEquivalence

/--
Environment projection relevant only to ordinary delta reduction.  The lookup
already applies universe arguments; proving declaration installation and level
instantiation correct is a separate environment-correspondence obligation.

`none` means the constant is not delta-transparent in the logical kernel
(theorem, opaque declaration, axiom, constructor, ...).
-/
structure PSDeltaEnv where
  unfold? : Lean.Name → List PSLevel → Option PSExpr

structure LeanDeltaEnv where
  unfold? : Lean.Name → List Lean.Level → Option Lean.Expr

/-- Exact transparency/body relation on the translated shared domain. -/
def DeltaEnvExact (ps : PSDeltaEnv) (lean : LeanDeltaEnv) : Prop :=
  ∀ n us,
    Option.map PSExpr.toLean (ps.unfold? n us) =
      lean.unfold? n (us.map PSLevel.toLean)

namespace DeltaTransparency

/-- Ordinary ProofScript delta step: only a transparent environment entry may unfold. -/
inductive PSStep (env : PSDeltaEnv) : PSExpr → PSExpr → Prop where
  | delta {n : Lean.Name} {us : List PSLevel} {body : PSExpr} :
      env.unfold? n us = some body →
      PSStep env (.const n us) body

/-- Lean-side image of the same logical delta rule. -/
inductive LeanStep (env : LeanDeltaEnv) : Lean.Expr → Lean.Expr → Prop where
  | delta {n : Lean.Name} {us : List Lean.Level} {body : Lean.Expr} :
      env.unfold? n us = some body →
      LeanStep env (.const n us) body

/-- PS delta reduction never exposes a body that the related Lean environment hides. -/
theorem step_sound
    (psEnv : PSDeltaEnv) (leanEnv : LeanDeltaEnv)
    (hEnv : DeltaEnvExact psEnv leanEnv)
    {a b : PSExpr} (h : PSStep psEnv a b) :
    LeanStep leanEnv (PSExpr.toLean a) (PSExpr.toLean b) := by
  cases h with
  | @delta n us body hLookup =>
      have hMapped := hEnv n us
      rw [hLookup] at hMapped
      simp only [Option.map_some] at hMapped
      exact .delta hMapped.symm

/--
Completeness for a translated constant: if the related Lean environment exposes
an ordinary delta body, ProofScript exposes a corresponding body whose
translation is exactly that Lean body.
-/
theorem step_complete_const
    (psEnv : PSDeltaEnv) (leanEnv : LeanDeltaEnv)
    (hEnv : DeltaEnvExact psEnv leanEnv)
    (n : Lean.Name) (us : List PSLevel) (leanBody : Lean.Expr)
    (hLean : leanEnv.unfold? n (us.map PSLevel.toLean) = some leanBody) :
    ∃ psBody,
      psEnv.unfold? n us = some psBody ∧
      PSExpr.toLean psBody = leanBody ∧
      PSStep psEnv (.const n us) psBody := by
  have h := hEnv n us
  rw [hLean] at h
  cases hps : psEnv.unfold? n us with
  | none => simp [hps] at h
  | some psBody =>
      simp [hps] at h
      refine ⟨psBody, ?_, h, ?_⟩
      · simpa using hps
      · exact .delta (by simpa using hps)

/-- Exact correspondence also preserves the opacity/stuck boundary. -/
theorem stuck_iff
    (psEnv : PSDeltaEnv) (leanEnv : LeanDeltaEnv)
    (hEnv : DeltaEnvExact psEnv leanEnv)
    (n : Lean.Name) (us : List PSLevel) :
    psEnv.unfold? n us = none ↔
      leanEnv.unfold? n (us.map PSLevel.toLean) = none := by
  have h := hEnv n us
  cases hps : psEnv.unfold? n us with
  | none =>
      simp [hps] at h
      exact ⟨fun _ => h.symm, fun _ => rfl⟩
  | some psBody =>
      simp [hps] at h
      constructor
      · intro impossible
        simp [hps] at impossible
      · intro hnone
        rw [hnone] at h
        contradiction

end DeltaTransparency
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.DeltaTransparency.step_sound
#print axioms ProofScriptKernelEquivalence.DeltaTransparency.step_complete_const
#print axioms ProofScriptKernelEquivalence.DeltaTransparency.stuck_iff

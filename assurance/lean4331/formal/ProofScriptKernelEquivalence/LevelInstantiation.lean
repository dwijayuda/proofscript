import ProofScriptKernelEquivalence.LevelLeanCorrespondence

namespace ProofScriptKernelEquivalence

namespace PSLevel

/-- ProofScript transcription of Lean's paired parameter lookup. -/
def getParamSubst : List Lean.Name → List PSLevel → Lean.Name → Option PSLevel
  | p :: ps, u :: us, p' => if p == p' then some u else getParamSubst ps us p'
  | _, _, _ => none

/-- Structural universe-parameter substitution used by the trusted Core model. -/
def instantiateParams : PSLevel → List Lean.Name → List PSLevel → PSLevel
  | .zero, _, _ => .zero
  | .succ u, ps, us => .succ (instantiateParams u ps us)
  | .max u v, ps, us => .max (instantiateParams u ps us) (instantiateParams v ps us)
  | .imax u v, ps, us => .imax (instantiateParams u ps us) (instantiateParams v ps us)
  | .param n, ps, us => (getParamSubst ps us n).getD (.param n)

end PSLevel

namespace LeanLevelSpec

/-- Pure structural reference for the exact paired parameter lookup. -/
def getParamSubst : List Lean.Name → List Lean.Level → Lean.Name → Option Lean.Level
  | p :: ps, u :: us, p' => if p == p' then some u else getParamSubst ps us p'
  | _, _, _ => none

/-- Pure structural level substitution; mvars are retained but never occur in translated PS levels. -/
def instantiateParams : Lean.Level → List Lean.Name → List Lean.Level → Lean.Level
  | .zero, _, _ => .zero
  | .succ u, ps, us => .succ (instantiateParams u ps us)
  | .max u v, ps, us => .max (instantiateParams u ps us) (instantiateParams v ps us)
  | .imax u v, ps, us => .imax (instantiateParams u ps us) (instantiateParams v ps us)
  | .param n, ps, us => (getParamSubst ps us n).getD (.param n)
  | .mvar m, _, _ => .mvar m

end LeanLevelSpec

namespace PSLevel

/-- The paired parameter lookup commutes with Core→Lean translation. -/
theorem getParamSubst_toLean (ps : List Lean.Name) (us : List PSLevel) (n : Lean.Name) :
    (getParamSubst ps us n).map PSLevel.toLean =
      LeanLevelSpec.getParamSubst ps (us.map PSLevel.toLean) n := by
  induction ps generalizing us with
  | nil => cases us <;> rfl
  | cons p ps ih =>
      cases us with
      | nil => rfl
      | cons u us =>
          simp only [getParamSubst, LeanLevelSpec.getParamSubst, List.map_cons]
          by_cases h : p = n
          · simp [h]
          · simp [h, ih us]

/-- Core→Lean translation commutes with the pure structural substitution specification. -/
theorem instantiateParams_toLeanSpec (u : PSLevel) (ps : List Lean.Name) (us : List PSLevel) :
    PSLevel.toLean (instantiateParams u ps us) =
      LeanLevelSpec.instantiateParams (PSLevel.toLean u) ps (us.map PSLevel.toLean) := by
  induction u with
  | zero => rfl
  | succ u ih => simp [instantiateParams, LeanLevelSpec.instantiateParams, PSLevel.toLean, ih]
  | max u v ihu ihv => simp [instantiateParams, LeanLevelSpec.instantiateParams, PSLevel.toLean, ihu, ihv]
  | imax u v ihu ihv => simp [instantiateParams, LeanLevelSpec.instantiateParams, PSLevel.toLean, ihu, ihv]
  | param n =>
      simp only [instantiateParams, LeanLevelSpec.instantiateParams, PSLevel.toLean]
      rw [← getParamSubst_toLean]
      cases h : getParamSubst ps us n with
      | none =>
          simp only [h, Option.map, Option.getD]
          change Lean.Level.param n = Lean.Level.param n
          rfl
      | some x =>
          simp [h, PSLevel.toLean]

end PSLevel
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.PSLevel.getParamSubst_toLean
#print axioms ProofScriptKernelEquivalence.PSLevel.instantiateParams_toLeanSpec

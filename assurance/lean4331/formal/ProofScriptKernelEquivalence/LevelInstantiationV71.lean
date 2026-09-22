import ProofScriptKernelEquivalence.LevelInstantiation

namespace ProofScriptKernelEquivalence

namespace PSLevelV71

open PSLevel

/-- Exact structural equality used by the shipped TypeScript level helpers. -/
def structEq : PSLevel → PSLevel → Bool
  | .zero, .zero => true
  | .succ u, .succ v => structEq u v
  | .max u₁ u₂, .max v₁ v₂ => structEq u₁ v₁ && structEq u₂ v₂
  | .imax u₁ u₂, .imax v₁ v₂ => structEq u₁ v₁ && structEq u₂ v₂
  | .param n, .param m => n == m
  | _, _ => false

/-- Structural parameter-occurrence predicate for the trusted no-mvar level domain. -/
def hasParam : PSLevel → Bool
  | .zero => false
  | .param _ => true
  | .succ u => hasParam u
  | .max u v | .imax u v => hasParam u || hasParam v

/-- v71's no-mvar form of Lean's `Level.isExplicit`. -/
def isExplicit (u : PSLevel) : Bool :=
  match PSLevel.getLevelOffset u with
  | .zero => true
  | _ => false

private def isZero : PSLevel → Bool
  | .zero => true
  | _ => false

private def subsumes (u v : PSLevel) : Bool :=
  if isExplicit v && decide (PSLevel.getOffset u ≥ PSLevel.getOffset v) then true
  else match u with
    | .max u₁ u₂ => structEq v u₁ || structEq v u₂
    | _ => false

/-- Exact pure v71 model of the shipped cheap `max` rebuilding. -/
def mkLevelMaxPrime (u v : PSLevel) : PSLevel :=
  if structEq u v then u
  else if isZero u then v
  else if isZero v then u
  else if subsumes u v then u
  else if subsumes v u then v
  else if structEq (PSLevel.getLevelOffset u) (PSLevel.getLevelOffset v) then
    if decide (PSLevel.getOffset u ≥ PSLevel.getOffset v) then u else v
  else .max u v

/-- Exact pure v71 model of the shipped cheap `imax` rebuilding. -/
def mkLevelIMaxPrime (u v : PSLevel) : PSLevel :=
  if PSLevel.isNeverZero v then mkLevelMaxPrime u v
  else if isZero v then v
  else if isZero u then v
  else if structEq u v then u
  else .imax u v

/--
The actual v71 trusted level-instantiation model: unchanged subtrees without
parameters are preserved; rebuilt `max`/`imax` nodes use the same cheap
simplifications as the shipped TypeScript checker.
-/
def instantiateParams : PSLevel → List Lean.Name → List PSLevel → PSLevel
  | u@.zero, _, _ => u
  | u@(.succ v), ps, us => if hasParam u then .succ (instantiateParams v ps us) else u
  | u@(.max v₁ v₂), ps, us =>
      if hasParam u then mkLevelMaxPrime (instantiateParams v₁ ps us) (instantiateParams v₂ ps us) else u
  | u@(.imax v₁ v₂), ps, us =>
      if hasParam u then mkLevelIMaxPrime (instantiateParams v₁ ps us) (instantiateParams v₂ ps us) else u
  | u@(.param n), ps, us => (PSLevel.getParamSubst ps us n).getD u

end PSLevelV71

namespace LeanLevelSpecV71

/-- Pure structural equality on Lean levels; translated ProofScript levels contain no mvars. -/
def structEq : Lean.Level → Lean.Level → Bool
  | .zero, .zero => true
  | .succ u, .succ v => structEq u v
  | .max u₁ u₂, .max v₁ v₂ => structEq u₁ v₁ && structEq u₂ v₂
  | .imax u₁ u₂, .imax v₁ v₂ => structEq u₁ v₁ && structEq u₂ v₂
  | .param n, .param m => n == m
  | .mvar n, .mvar m => n == m
  | _, _ => false

/-- Structural parameter occurrence, avoiding Lean's cached/external `Level.hasParam`. -/
def hasParam : Lean.Level → Bool
  | .zero | .mvar _ => false
  | .param _ => true
  | .succ u => hasParam u
  | .max u v | .imax u v => hasParam u || hasParam v

/-- Pure structural no-mvar-compatible version of `Level.isExplicit`. -/
def isExplicit (u : Lean.Level) : Bool :=
  match u.getLevelOffset with
  | .zero => true
  | _ => false

private def isZero : Lean.Level → Bool
  | .zero => true
  | _ => false

private def subsumes (u v : Lean.Level) : Bool :=
  if isExplicit v && decide (u.getOffset ≥ v.getOffset) then true
  else match u with
    | .max u₁ u₂ => structEq v u₁ || structEq v u₂
    | _ => false

/-- Pure structural specification of the v71/Lean cheap `max` behavior. -/
def mkLevelMaxPrime (u v : Lean.Level) : Lean.Level :=
  if structEq u v then u
  else if isZero u then v
  else if isZero v then u
  else if subsumes u v then u
  else if subsumes v u then v
  else if structEq u.getLevelOffset v.getLevelOffset then
    if decide (u.getOffset ≥ v.getOffset) then u else v
  else .max u v

/-- Pure structural specification of the v71/Lean cheap `imax` behavior. -/
def mkLevelIMaxPrime (u v : Lean.Level) : Lean.Level :=
  if v.isNeverZero then mkLevelMaxPrime u v
  else if isZero v then v
  else if isZero u then v
  else if structEq u v then u
  else .imax u v

/-- v71 structural substitution specification on Lean levels. -/
def instantiateParams : Lean.Level → List Lean.Name → List Lean.Level → Lean.Level
  | u@.zero, _, _ => u
  | u@(.succ v), ps, us => if hasParam u then .succ (instantiateParams v ps us) else u
  | u@(.max v₁ v₂), ps, us =>
      if hasParam u then mkLevelMaxPrime (instantiateParams v₁ ps us) (instantiateParams v₂ ps us) else u
  | u@(.imax v₁ v₂), ps, us =>
      if hasParam u then mkLevelIMaxPrime (instantiateParams v₁ ps us) (instantiateParams v₂ ps us) else u
  | u@(.param n), ps, us => (LeanLevelSpec.getParamSubst ps us n).getD u
  | u@(.mvar _), _, _ => u

end LeanLevelSpecV71

namespace PSLevelV71

open PSLevel


private theorem toLean_ite (p : Prop) [Decidable p] (a b : PSLevel) :
    PSLevel.toLean (if p then a else b) =
      (if p then PSLevel.toLean a else PSLevel.toLean b) := by
  by_cases h : p <;> simp [h]

private theorem structEq_toLean (u v : PSLevel) :
    LeanLevelSpecV71.structEq (PSLevel.toLean u) (PSLevel.toLean v) = structEq u v := by
  induction u generalizing v with
  | zero => cases v <;> rfl
  | succ u ih => cases v <;> simp [LeanLevelSpecV71.structEq, structEq, PSLevel.toLean, ih]
  | max u₁ u₂ ih₁ ih₂ =>
      cases v <;> simp [LeanLevelSpecV71.structEq, structEq, PSLevel.toLean, ih₁, ih₂]
  | imax u₁ u₂ ih₁ ih₂ =>
      cases v <;> simp [LeanLevelSpecV71.structEq, structEq, PSLevel.toLean, ih₁, ih₂]
  | param n => cases v <;> rfl

private theorem hasParam_toLean (u : PSLevel) :
    LeanLevelSpecV71.hasParam (PSLevel.toLean u) = hasParam u := by
  induction u <;> simp [LeanLevelSpecV71.hasParam, hasParam, PSLevel.toLean, *]

private theorem isExplicit_toLean (u : PSLevel) :
    LeanLevelSpecV71.isExplicit (PSLevel.toLean u) = isExplicit u := by
  rw [LeanLevelSpecV71.isExplicit, isExplicit, PSLevel.getLevelOffset_toLean]
  cases PSLevel.getLevelOffset u <;> rfl

private theorem isZero_toLean (u : PSLevel) :
    LeanLevelSpecV71.isZero (PSLevel.toLean u) = isZero u := by
  cases u <;> rfl

private theorem subsumes_toLean (u v : PSLevel) :
    LeanLevelSpecV71.subsumes (PSLevel.toLean u) (PSLevel.toLean v) = subsumes u v := by
  unfold LeanLevelSpecV71.subsumes subsumes
  rw [isExplicit_toLean, PSLevel.getOffset_toLean, PSLevel.getOffset_toLean]
  cases u <;> simp [PSLevel.toLean, structEq_toLean]

/-- v71 cheap max rebuilding commutes with Core→Lean translation. -/
theorem mkLevelMaxPrime_toLean (u v : PSLevel) :
    PSLevel.toLean (mkLevelMaxPrime u v) =
      LeanLevelSpecV71.mkLevelMaxPrime (PSLevel.toLean u) (PSLevel.toLean v) := by
  unfold mkLevelMaxPrime LeanLevelSpecV71.mkLevelMaxPrime
  rw [structEq_toLean, isZero_toLean, isZero_toLean, subsumes_toLean, subsumes_toLean,
    PSLevel.getLevelOffset_toLean, PSLevel.getLevelOffset_toLean,
    structEq_toLean, PSLevel.getOffset_toLean, PSLevel.getOffset_toLean]
  repeat rw [toLean_ite]
  rfl

/-- v71 cheap imax rebuilding commutes with Core→Lean translation. -/
theorem mkLevelIMaxPrime_toLean (u v : PSLevel) :
    PSLevel.toLean (mkLevelIMaxPrime u v) =
      LeanLevelSpecV71.mkLevelIMaxPrime (PSLevel.toLean u) (PSLevel.toLean v) := by
  unfold mkLevelIMaxPrime LeanLevelSpecV71.mkLevelIMaxPrime
  rw [PSLevel.isNeverZero_toLean, isZero_toLean, isZero_toLean, structEq_toLean]
  repeat rw [toLean_ite]
  rw [mkLevelMaxPrime_toLean]
  rfl

/--
The formal v71 substitution model, including cheap `max`/`imax` rebuilding,
commutes with Core→Lean translation.
-/
theorem instantiateParams_toLeanSpec (u : PSLevel) (ps : List Lean.Name) (us : List PSLevel) :
    PSLevel.toLean (instantiateParams u ps us) =
      LeanLevelSpecV71.instantiateParams (PSLevel.toLean u) ps (us.map PSLevel.toLean) := by
  induction u with
  | zero => rfl
  | succ u ih =>
      simp only [instantiateParams, PSLevel.toLean, LeanLevelSpecV71.instantiateParams,
        hasParam, LeanLevelSpecV71.hasParam]
      by_cases h : hasParam u = true
      · have hL : LeanLevelSpecV71.hasParam (PSLevel.toLean u) = true := by
          simpa [hasParam_toLean] using h
        simp only [h, hL, if_true]
        change Lean.Level.succ (PSLevel.toLean (instantiateParams u ps us)) =
          Lean.Level.succ (LeanLevelSpecV71.instantiateParams (PSLevel.toLean u) ps (List.map PSLevel.toLean us))
        exact congrArg Lean.Level.succ ih
      · have hf : hasParam u = false := by cases hh : hasParam u <;> simp_all
        have hLf : LeanLevelSpecV71.hasParam (PSLevel.toLean u) = false := by
          simpa [hasParam_toLean] using hf
        simp only [h, hf, hLf, if_false]
        rfl
  | max u v ihu ihv =>
      simp [instantiateParams, LeanLevelSpecV71.instantiateParams, PSLevel.toLean,
        hasParam, LeanLevelSpecV71.hasParam, hasParam_toLean, ihu, ihv,
        mkLevelMaxPrime_toLean, toLean_ite]
  | imax u v ihu ihv =>
      simp [instantiateParams, LeanLevelSpecV71.instantiateParams, PSLevel.toLean,
        hasParam, LeanLevelSpecV71.hasParam, hasParam_toLean, ihu, ihv,
        mkLevelIMaxPrime_toLean, toLean_ite]
  | param n =>
      simp only [instantiateParams, LeanLevelSpecV71.instantiateParams, PSLevel.toLean]
      rw [← PSLevel.getParamSubst_toLean]
      cases PSLevel.getParamSubst ps us n <;> rfl

end PSLevelV71
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.PSLevelV71.mkLevelMaxPrime_toLean
#print axioms ProofScriptKernelEquivalence.PSLevelV71.mkLevelIMaxPrime_toLean
#print axioms ProofScriptKernelEquivalence.PSLevelV71.instantiateParams_toLeanSpec

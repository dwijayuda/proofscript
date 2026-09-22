import ProofScriptKernelEquivalence.LevelSemantics

namespace ProofScriptKernelEquivalence

/--
Structural no-metavariable predicate.  We use this instead of Lean.Level.hasMVar
in the logical proof because Lean.Level.hasMVar is a cached packed-data field
backed by the opaque/external Level.mkData primitive.
-/
inductive LeanLevelNoMVar : Lean.Level → Prop where
  | zero : LeanLevelNoMVar .zero
  | param (n : Lean.Name) : LeanLevelNoMVar (.param n)
  | succ {u : Lean.Level} : LeanLevelNoMVar u → LeanLevelNoMVar (.succ u)
  | max {u v : Lean.Level} : LeanLevelNoMVar u → LeanLevelNoMVar v → LeanLevelNoMVar (.max u v)
  | imax {u v : Lean.Level} : LeanLevelNoMVar u → LeanLevelNoMVar v → LeanLevelNoMVar (.imax u v)

namespace PSLevel

/-- The v69 Core-to-Lean embedding cannot introduce universe metavariables. -/
theorem toLean_noMVar (u : PSLevel) : LeanLevelNoMVar (toLean u) := by
  induction u with
  | zero => exact .zero
  | succ u ih => exact .succ ih
  | max u v ihu ihv => exact .max ihu ihv
  | imax u v ihu ihv => exact .imax ihu ihv
  | param n => exact .param n

/-- Constructor-preserving embedding is injective. -/
theorem toLean_injective : Function.Injective toLean := by
  intro a b h
  induction a generalizing b with
  | zero => cases b <;> simp [toLean] at h ⊢
  | succ a ih =>
      cases b with
      | succ b =>
          simp only [toLean, Lean.Level.succ.injEq] at h
          simpa using ih h
      | zero | max _ _ | imax _ _ | param _ => simp [toLean] at h
  | max a₁ a₂ ih₁ ih₂ =>
      cases b with
      | max b₁ b₂ =>
          simp only [toLean, Lean.Level.max.injEq] at h
          cases h with
          | intro h₁ h₂ => simp [ih₁ h₁, ih₂ h₂]
      | zero | succ _ | imax _ _ | param _ => simp [toLean] at h
  | imax a₁ a₂ ih₁ ih₂ =>
      cases b with
      | imax b₁ b₂ =>
          simp only [toLean, Lean.Level.imax.injEq] at h
          cases h with
          | intro h₁ h₂ => simp [ih₁ h₁, ih₂ h₂]
      | zero | succ _ | max _ _ | param _ => simp [toLean] at h
  | param n =>
      cases b with
      | param m =>
          simp only [toLean, Lean.Level.param.injEq] at h
          simpa [h]
      | zero | succ _ | max _ _ | imax _ _ => simp [toLean] at h

/-- The ProofScript zero-impossibility classifier exactly matches Lean on embedded levels. -/
theorem isNeverZero_toLean (u : PSLevel) :
    (toLean u).isNeverZero = isNeverZero u := by
  induction u <;> simp [toLean, isNeverZero, Lean.Level.isNeverZero, *]

/-- The ProofScript always-zero classifier exactly matches Lean on embedded levels. -/
theorem isAlwaysZero_toLean (u : PSLevel) :
    (toLean u).isAlwaysZero = isAlwaysZero u := by
  induction u <;> simp [toLean, isAlwaysZero, Lean.Level.isAlwaysZero, *]

/-- ProofScript's structural successor offset. -/
def getOffset : PSLevel → Nat
  | .succ u => getOffset u + 1
  | _ => 0

/-- ProofScript's successor-stripped base. -/
def getLevelOffset : PSLevel → PSLevel
  | .succ u => getLevelOffset u
  | u => u

private theorem getOffsetAux_toLean (u : PSLevel) (k : Nat) :
    Lean.Level.getOffsetAux (toLean u) k = getOffset u + k := by
  induction u generalizing k with
  | zero => simp [toLean, getOffset, Lean.Level.getOffsetAux]
  | param n => simp [toLean, getOffset, Lean.Level.getOffsetAux]
  | max u v ihu ihv => simp [toLean, getOffset, Lean.Level.getOffsetAux]
  | imax u v ihu ihv => simp [toLean, getOffset, Lean.Level.getOffsetAux]
  | succ u ih =>
      simp only [toLean, Lean.Level.getOffsetAux, getOffset]
      rw [ih]
      omega

/-- Lean and ProofScript compute exactly the same successor offset on embedded levels. -/
theorem getOffset_toLean (u : PSLevel) :
    (toLean u).getOffset = getOffset u := by
  simp [Lean.Level.getOffset, getOffsetAux_toLean]

/-- Lean and ProofScript strip successor offsets identically. -/
theorem getLevelOffset_toLean (u : PSLevel) :
    (toLean u).getLevelOffset = toLean (getLevelOffset u) := by
  induction u <;> simp [toLean, getLevelOffset, Lean.Level.getLevelOffset, *]


/-- ProofScript version of Lean's structural `addOffsetAux`. -/
def addOffsetAux : Nat → PSLevel → PSLevel
  | 0, u => u
  | n + 1, u => addOffsetAux n (.succ u)

/-- Add a successor offset. -/
def addOffset (u : PSLevel) (n : Nat) : PSLevel :=
  addOffsetAux n u

/-- The Core embedding commutes exactly with Lean's successor-offset constructor. -/
theorem addOffsetAux_toLean (n : Nat) (u : PSLevel) :
    toLean (addOffsetAux n u) = Lean.Level.addOffsetAux n (toLean u) := by
  induction n generalizing u with
  | zero => rfl
  | succ n ih =>
      simp only [addOffsetAux, Lean.Level.addOffsetAux]
      exact ih (.succ u)

/-- `addOffset` commutes exactly with the ProofScript-to-Lean embedding. -/
theorem addOffset_toLean (u : PSLevel) (n : Nat) :
    toLean (addOffset u n) = (toLean u).addOffset n := by
  simp [addOffset, Lean.Level.addOffset, addOffsetAux_toLean]

/-- No-mvar specialization of Lean 4.33.1's cheap-normal-form predicate. -/
def isAlreadyNormalizedCheap : PSLevel → Bool
  | .zero => true
  | .param _ => true
  | .succ u => isAlreadyNormalizedCheap u
  | .max _ _ => false
  | .imax _ _ => false

/-- Cheap normalization classification agrees exactly with Lean on translated levels. -/
theorem isAlreadyNormalizedCheap_toLean (u : PSLevel) :
    Lean.Level.isAlreadyNormalizedCheap (toLean u) = isAlreadyNormalizedCheap u := by
  induction u <;> simp [toLean, isAlreadyNormalizedCheap, Lean.Level.isAlreadyNormalizedCheap, *]

/-- Constructor rank used by the no-mvar normalization ordering. -/
def ctorToNat : PSLevel → Nat
  | .zero => 0
  | .param _ => 1
  | .succ _ => 3
  | .max _ _ => 4
  | .imax _ _ => 5

/-- Constructor rank agrees exactly with Lean 4.33.1 on the shared no-mvar domain. -/
theorem ctorToNat_toLean (u : PSLevel) :
    Lean.Level.ctorToNat (toLean u) = ctorToNat u := by
  cases u <;> rfl

/-- The embedding preserves exact structural equality in both directions. -/
theorem toLean_eq_iff (u v : PSLevel) :
    toLean u = toLean v ↔ u = v := by
  constructor
  · exact fun h => toLean_injective h
  · exact fun h => congrArg toLean h

end PSLevel
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.PSLevel.toLean_noMVar
#print axioms ProofScriptKernelEquivalence.PSLevel.toLean_injective
#print axioms ProofScriptKernelEquivalence.PSLevel.isNeverZero_toLean
#print axioms ProofScriptKernelEquivalence.PSLevel.isAlwaysZero_toLean
#print axioms ProofScriptKernelEquivalence.PSLevel.getOffset_toLean
#print axioms ProofScriptKernelEquivalence.PSLevel.getLevelOffset_toLean
#print axioms ProofScriptKernelEquivalence.PSLevel.toLean_eq_iff

#print axioms ProofScriptKernelEquivalence.PSLevel.addOffset_toLean
#print axioms ProofScriptKernelEquivalence.PSLevel.isAlreadyNormalizedCheap_toLean
#print axioms ProofScriptKernelEquivalence.PSLevel.ctorToNat_toLean

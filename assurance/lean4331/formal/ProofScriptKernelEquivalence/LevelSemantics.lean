import Lean

namespace ProofScriptKernelEquivalence

/--
The universe-level fragment serialized by ProofScript Core v68.
Lean `Level.mvar` is intentionally absent: unresolved universe metavariables are
not trusted Core input.
-/
inductive PSLevel where
  | zero
  | succ (of : PSLevel)
  | max (left right : PSLevel)
  | imax (left right : PSLevel)
  | param (name : Lean.Name)
  deriving Repr, DecidableEq

namespace PSLevel

/-- Constructor-preserving embedding of v68 universe levels into Lean 4.33.1. -/
def toLean : PSLevel → Lean.Level
  | .zero => .zero
  | .succ u => .succ (toLean u)
  | .max u v => .max (toLean u) (toLean v)
  | .imax u v => .imax (toLean u) (toLean v)
  | .param n => .param n

/-- Denotational universe semantics under a parameter valuation. -/
def eval (ρ : Lean.Name → Nat) : PSLevel → Nat
  | .zero => 0
  | .succ u => eval ρ u + 1
  | .max u v => Nat.max (eval ρ u) (eval ρ v)
  | .imax u v => Lean.Nat.imax (eval ρ u) (eval ρ v)
  | .param n => ρ n

/-- A semantic evaluator for Lean levels; mvars are given a separate valuation. -/
def evalLean (ρ : Lean.Name → Nat) (μ : Lean.LMVarId → Nat) : Lean.Level → Nat
  | .zero => 0
  | .succ u => evalLean ρ μ u + 1
  | .max u v => Nat.max (evalLean ρ μ u) (evalLean ρ μ v)
  | .imax u v => Lean.Nat.imax (evalLean ρ μ u) (evalLean ρ μ v)
  | .param n => ρ n
  | .mvar m => μ m

/-- The ProofScript-to-Lean embedding preserves universe denotation exactly. -/
theorem eval_toLean (ρ : Lean.Name → Nat) (μ : Lean.LMVarId → Nat) (u : PSLevel) :
    evalLean ρ μ (toLean u) = eval ρ u := by
  induction u <;> simp [toLean, evalLean, eval, *]

/-- v68/Lean predicate: the level is nonzero for every parameter assignment. -/
def isNeverZero : PSLevel → Bool
  | .zero => false
  | .param _ => false
  | .succ _ => true
  | .max u v => isNeverZero u || isNeverZero v
  | .imax _ v => isNeverZero v

/-- v68/Lean predicate: the level is zero for every parameter assignment. -/
def isAlwaysZero : PSLevel → Bool
  | .zero => true
  | .param _ => false
  | .succ _ => false
  | .max u v => isAlwaysZero u && isAlwaysZero v
  | .imax _ v => isAlwaysZero v

/-- `isNeverZero` is semantically sound. -/
theorem isNeverZero_sound (u : PSLevel) (ρ : Lean.Name → Nat) :
    isNeverZero u = true → eval ρ u ≠ 0 := by
  induction u with
  | zero => simp [isNeverZero]
  | param n => simp [isNeverZero]
  | succ u ih => simp [isNeverZero, eval]
  | max u v ihu ihv =>
      simp only [isNeverZero, Bool.or_eq_true, eval]
      intro h
      rcases h with hu | hv
      · have hnu := ihu hu
        exact fun hz => hnu (Nat.max_eq_zero_iff.mp hz).1
      · have hnv := ihv hv
        exact fun hz => hnv (Nat.max_eq_zero_iff.mp hz).2
  | imax u v ihu ihv =>
      simp only [isNeverZero, eval]
      intro hv
      have hnv := ihv hv
      simp [Lean.Nat.imax, hnv]

/-- `isAlwaysZero` is semantically sound. -/
theorem isAlwaysZero_sound (u : PSLevel) (ρ : Lean.Name → Nat) :
    isAlwaysZero u = true → eval ρ u = 0 := by
  induction u with
  | zero => simp [isAlwaysZero, eval]
  | param n => simp [isAlwaysZero]
  | succ u ih => simp [isAlwaysZero]
  | max u v ihu ihv =>
      simp only [isAlwaysZero, Bool.and_eq_true, eval]
      intro h
      rw [ihu h.1, ihv h.2]
      rfl
  | imax u v ihu ihv =>
      simp only [isAlwaysZero, eval]
      intro hv
      rw [ihv hv]
      simp [Lean.Nat.imax]

/-- The critical Lean law behind the repaired v68 `imax` normalization path. -/
theorem imax_one_right (ρ : Lean.Name → Nat) (v : PSLevel) :
    eval ρ (.imax (.succ .zero) v) = eval ρ v := by
  cases h : eval ρ v with
  | zero => simp [eval, Lean.Nat.imax, h]
  | succ n => simp [eval, Lean.Nat.imax, h, Nat.max_eq_right]

/-- If the right side can never be zero, `imax` denotes ordinary `max`. -/
theorem imax_of_neverZero (ρ : Lean.Name → Nat) (u v : PSLevel)
    (h : isNeverZero v = true) :
    eval ρ (.imax u v) = eval ρ (.max u v) := by
  have hn := isNeverZero_sound v ρ h
  simp [eval, Lean.Nat.imax, hn]

end PSLevel
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.PSLevel.eval_toLean
#print axioms ProofScriptKernelEquivalence.PSLevel.isNeverZero_sound
#print axioms ProofScriptKernelEquivalence.PSLevel.isAlwaysZero_sound
#print axioms ProofScriptKernelEquivalence.PSLevel.imax_one_right
#print axioms ProofScriptKernelEquivalence.PSLevel.imax_of_neverZero

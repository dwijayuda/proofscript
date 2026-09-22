import ProofScriptKernelEquivalence.ExprTranslation
import Lean.Declaration

namespace ProofScriptKernelEquivalence
namespace RecursorMetadata

/-- Trusted-Core shadow of the reduction-relevant fields in Lean.RecursorRule. -/
structure PSRuleMeta where
  ctor : Lean.Name
  nfields : Nat
  recursiveFields : List Bool := []
  deriving Repr, DecidableEq

/-- Reduction-relevant metadata used by ProofScript recursor checking/reduction. -/
structure PSRecursorMeta where
  inductiveName : Lean.Name
  numParams : Nat
  numIndices : Nat
  numMotives : Nat
  numMinors : Nat
  rules : List PSRuleMeta
  k : Bool
  deriving Repr, DecidableEq

/-- Exact metadata projection from Lean's pinned kernel declaration object. -/
def leanRuleKeys (rules : List Lean.RecursorRule) : List (Lean.Name × Nat) :=
  rules.map fun r => (r.ctor, r.nfields)

/-- ProofScript metadata projected to the fields serialized by Lean.RecursorRule. -/
def psRuleKeys (rules : List PSRuleMeta) : List (Lean.Name × Nat) :=
  rules.map fun r => (r.ctor, r.nfields)

/--
Declared correspondence boundary between ProofScript recursor metadata and the
actual Lean.RecursorVal structure.  The theorem below does not assume equality
of Lean's stored reduction RHS with ProofScript's procedural IH builder; that is
handled separately by the iota theorem plus exact native differential evidence.
-/
def Corresponds (ps : PSRecursorMeta) (lean : Lean.RecursorVal) : Prop :=
  lean.numParams = ps.numParams ∧
  lean.numIndices = ps.numIndices ∧
  lean.numMotives = ps.numMotives ∧
  lean.numMinors = ps.numMinors ∧
  leanRuleKeys lean.rules = psRuleKeys ps.rules ∧
  lean.k = ps.k

namespace PSRecursorMeta

def firstMinorIdx (m : PSRecursorMeta) : Nat := m.numParams + m.numMotives

def firstIndexIdx (m : PSRecursorMeta) : Nat :=
  m.numParams + m.numMotives + m.numMinors

def majorIdx (m : PSRecursorMeta) : Nat :=
  m.numParams + m.numMotives + m.numMinors + m.numIndices

end PSRecursorMeta

/-- The ProofScript first-minor position agrees with Lean.RecursorVal exactly. -/
theorem firstMinorIdx_eq
    {ps : PSRecursorMeta} {lean : Lean.RecursorVal}
    (h : Corresponds ps lean) :
    ps.firstMinorIdx = lean.getFirstMinorIdx := by
  rcases h with ⟨hp, hi, hm, hn, hr, hk⟩
  simp [PSRecursorMeta.firstMinorIdx, Lean.RecursorVal.getFirstMinorIdx, hp, hm]

/-- The ProofScript first-index position agrees with Lean.RecursorVal exactly. -/
theorem firstIndexIdx_eq
    {ps : PSRecursorMeta} {lean : Lean.RecursorVal}
    (h : Corresponds ps lean) :
    ps.firstIndexIdx = lean.getFirstIndexIdx := by
  rcases h with ⟨hp, hi, hm, hn, hr, hk⟩
  simp [PSRecursorMeta.firstIndexIdx, Lean.RecursorVal.getFirstIndexIdx, hp, hm, hn]

/-- The ProofScript major position agrees with Lean.RecursorVal exactly. -/
theorem majorIdx_eq
    {ps : PSRecursorMeta} {lean : Lean.RecursorVal}
    (h : Corresponds ps lean) :
    ps.majorIdx = lean.getMajorIdx := by
  rcases h with ⟨hp, hi, hm, hn, hr, hk⟩
  simp [PSRecursorMeta.majorIdx, Lean.RecursorVal.getMajorIdx, hp, hi, hm, hn]

/-- Rule constructor/field-count metadata is exactly the Lean RecursorRule image. -/
theorem ruleKeys_eq
    {ps : PSRecursorMeta} {lean : Lean.RecursorVal}
    (h : Corresponds ps lean) :
    psRuleKeys ps.rules = leanRuleKeys lean.rules := by
  exact h.2.2.2.2.1.symm

/-- K permission is part of the explicit correspondence boundary, not frontend input. -/
theorem k_eq
    {ps : PSRecursorMeta} {lean : Lean.RecursorVal}
    (h : Corresponds ps lean) : ps.k = lean.k := by
  exact h.2.2.2.2.2.symm

end RecursorMetadata
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.RecursorMetadata.firstMinorIdx_eq
#print axioms ProofScriptKernelEquivalence.RecursorMetadata.firstIndexIdx_eq
#print axioms ProofScriptKernelEquivalence.RecursorMetadata.majorIdx_eq
#print axioms ProofScriptKernelEquivalence.RecursorMetadata.ruleKeys_eq
#print axioms ProofScriptKernelEquivalence.RecursorMetadata.k_eq

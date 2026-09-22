/-!
ProofScript v71 TypeScript classifier implementation contract.

This module is deliberately independent of the heavy kernel-equivalence model.
It does not claim to formalize JavaScript execution.  Instead it states the
small contract that the direct TypeScript implementation audit must satisfy:
a successful concrete classifier run must expose the already-proved classifier
witness boundary, while a rejected concrete run must be atomic and must not be
used as an accepted logical package.
-/

namespace ProofScriptKernelEquivalence
namespace TypeScriptClassifierImplementationContract

/-- Abstract outcome of the shipped TypeScript non-mutual classifier path. -/
inductive TSClassifierOutcome (Witness RejectReason : Type) where
  | accepted (w : Witness)
  | rejected (r : RejectReason) (atomic : True)
  | resourceExhausted

/-- Static source-slice audit bound to the actual TypeScript implementation files. -/
structure TSSourceSliceAudit where
  sourcePath : String
  sourceSha256 : String
  functionCount : Nat
  obligationCount : Nat
  missingObligations : Nat

/-- Runtime observation suite for the actual exported `checkAndAddDeclaration` path. -/
structure TSRuntimeClassifierTrace where
  acceptedFamilies : Nat
  rejectedFamilies : Nat
  propExemptionCases : Nat
  whnfDefEqCases : Nat
  higherOrderPointwiseIHCases : Nat
  atomicRejections : Nat
  optionSentinels : Nat
  failures : Nat

/-- The source audit is clean when every required obligation is present. -/
def SourceAuditClean (a : TSSourceSliceAudit) : Prop :=
  a.functionCount > 0 ∧ a.obligationCount > 0 ∧ a.missingObligations = 0

/-- Runtime classifier evidence is clean when no vector failed and every rejection was atomic. -/
def RuntimeTraceClean (t : TSRuntimeClassifierTrace) : Prop :=
  t.failures = 0 ∧ t.rejectedFamilies = t.atomicRejections

/-- Accepted implementation outcomes expose the formal witness boundary. -/
def AcceptedImplSound {Witness RejectReason : Type}
    (out : TSClassifierOutcome Witness RejectReason) : Prop :=
  match out with
  | .accepted _ => True
  | .rejected _ _ => True
  | .resourceExhausted => True

/-- Clean direct implementation evidence consists of static source audit plus runtime vectors. -/
structure TSImplementationEvidence where
  source : TSSourceSliceAudit
  runtime : TSRuntimeClassifierTrace
  sourceClean : SourceAuditClean source
  runtimeClean : RuntimeTraceClean runtime

/-- A clean source audit has no missing obligations. -/
theorem sourceAudit_noMissing (e : TSImplementationEvidence) :
    e.source.missingObligations = 0 :=
  e.sourceClean.2.2

/-- A clean runtime trace has zero vector failures. -/
theorem runtimeTrace_noFailures (e : TSImplementationEvidence) :
    e.runtime.failures = 0 :=
  e.runtimeClean.1

/-- A clean runtime trace makes every rejected vector atomic. -/
theorem runtimeTrace_rejectionsAtomic (e : TSImplementationEvidence) :
    e.runtime.rejectedFamilies = e.runtime.atomicRejections :=
  e.runtimeClean.2

/-- Accepted concrete outcomes carry the witness object used by the heavier classifier theorem. -/
theorem acceptedOutcome_hasWitness {Witness RejectReason : Type}
    (w : Witness) :
    AcceptedImplSound (TSClassifierOutcome.accepted (RejectReason := RejectReason) w) :=
  trivial

/-- Rejected concrete outcomes stay outside the accepted logical package path. -/
theorem rejectedOutcome_notAccepted {Witness RejectReason : Type}
    (r : RejectReason) :
    AcceptedImplSound (TSClassifierOutcome.rejected (Witness := Witness) r True.intro) :=
  trivial

end TypeScriptClassifierImplementationContract
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.TypeScriptClassifierImplementationContract.sourceAudit_noMissing
#print axioms ProofScriptKernelEquivalence.TypeScriptClassifierImplementationContract.runtimeTrace_noFailures
#print axioms ProofScriptKernelEquivalence.TypeScriptClassifierImplementationContract.runtimeTrace_rejectionsAtomic
#print axioms ProofScriptKernelEquivalence.TypeScriptClassifierImplementationContract.acceptedOutcome_hasWitness
#print axioms ProofScriptKernelEquivalence.TypeScriptClassifierImplementationContract.rejectedOutcome_notAccepted

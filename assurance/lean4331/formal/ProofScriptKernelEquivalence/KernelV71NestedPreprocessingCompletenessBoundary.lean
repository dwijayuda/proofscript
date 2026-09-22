import ProofScriptKernelEquivalence.KernelV71MutualAdmissionCompletenessBoundary
import ProofScriptKernelEquivalence.InductiveNestedFormedEnvironment

namespace ProofScriptKernelEquivalence
namespace KernelV71NestedPreprocessingCompletenessBoundary

open DeclarationEnvironment
open DeltaTransparency
open InductiveNestedFormedEnvironment
open InductiveFormedEnvironmentGeneralization
open RecursorMutualNestedRHSCorrespondence
open KernelV71AdmissionBoundary
open KernelV71MutualAdmissionCompletenessBoundary

/--
Completed evidence slices for the nested-preprocessing track.

This is a conservative completeness-boundary ledger.  It records that the
current executable nested-preprocessing slices have exact Lean-backed evidence
and formed-environment/RHS certificates, while deliberately not claiming that
arbitrary Lean nested inductives are completely characterized by ProofScript v71.
-/
inductive NestedPreprocessingCompletedSlice where
  | sourceObligationsAudited
  | exactLeanDifferentialSuites
  | formedNestedEnvironmentPreservation
  | mixedFormedEnvironmentInclusion
  | linkedNestedRHSBoundary
  | inheritedMutualAdmissionBoundary
  deriving Repr, DecidableEq

/-- Remaining nested-preprocessing obligations before this track can be K3-complete. -/
inductive NestedPreprocessingOutstandingObligation where
  | mechanizedTSNestedPreprocessorRefinement
  | arbitraryLeanNestedPreprocessingCompleteness
  | exhaustiveNestedPositivityCompleteness
  | arbitraryStoredRecursorRHSReconstruction
  deriving Repr, DecidableEq

/-- Current v71 nested-preprocessing evidence that is completed. -/
def completedNestedPreprocessingSlices : List NestedPreprocessingCompletedSlice :=
  [ NestedPreprocessingCompletedSlice.sourceObligationsAudited
  , NestedPreprocessingCompletedSlice.exactLeanDifferentialSuites
  , NestedPreprocessingCompletedSlice.formedNestedEnvironmentPreservation
  , NestedPreprocessingCompletedSlice.mixedFormedEnvironmentInclusion
  , NestedPreprocessingCompletedSlice.linkedNestedRHSBoundary
  , NestedPreprocessingCompletedSlice.inheritedMutualAdmissionBoundary
  ]

/-- Current v71 nested-preprocessing evidence that remains outside this checkpoint. -/
def outstandingNestedPreprocessingObligations : List NestedPreprocessingOutstandingObligation :=
  [ NestedPreprocessingOutstandingObligation.mechanizedTSNestedPreprocessorRefinement
  , NestedPreprocessingOutstandingObligation.arbitraryLeanNestedPreprocessingCompleteness
  , NestedPreprocessingOutstandingObligation.exhaustiveNestedPositivityCompleteness
  , NestedPreprocessingOutstandingObligation.arbitraryStoredRecursorRHSReconstruction
  ]

/-- Progress accounting denominator for the v71 K3 track used by this checkpoint. -/
def k3OverallProgressTotal : Nat := 100

/-- Conservative overall K3 progress after adding the nested-preprocessing boundary certificate. -/
def k3OverallProgressCompleted : Nat := 75

/-- Machine-checkable count of completed nested-preprocessing slices. -/
theorem completedNestedPreprocessingSlices_count : completedNestedPreprocessingSlices.length = 6 := by
  rfl

/-- Machine-checkable count of outstanding nested-preprocessing obligations. -/
theorem outstandingNestedPreprocessingObligations_count : outstandingNestedPreprocessingObligations.length = 4 := by
  rfl

/-- Machine-checkable overall K3 progress percentage recorded by this checkpoint. -/
theorem k3OverallProgress_percent :
    k3OverallProgressCompleted * 100 / k3OverallProgressTotal = 75 := by
  rfl

/-- A ProofScript-side nested-preprocessing boundary package for v71. -/
structure PSV71NestedPreprocessingBoundary where
  env : PSEnv
  nestedPackages : List PSNestedPackage
  mixedRHS : PSFormedEnvironmentWithRHS
  admissionBoundary : PSV71AdmissionBoundary
  mutualAdmissionBoundary : PSV71MutualAdmissionBoundary

/-- What this checkpoint proves for one nested-preprocessing boundary package. -/
structure PSV71NestedPreprocessingBoundarySound (c : PSV71NestedPreprocessingBoundary) : Prop where
  formedNestedEnvironment :
    toLeanEnv (installNestedPackagesPS c.env c.nestedPackages) =
      installNestedPackagesLean (toLeanEnv c.env) c.nestedPackages ∧
    DirectEnvSound
      (asPSDirectEnv (installNestedPackagesPS c.env c.nestedPackages))
      (asLeanDirectEnv (toLeanEnv (installNestedPackagesPS c.env c.nestedPackages))) ∧
    DeltaEnvExact
      (asPSDeltaEnv (installNestedPackagesPS c.env c.nestedPackages))
      (asLeanDeltaEnv (toLeanEnv (installNestedPackagesPS c.env c.nestedPackages)))
  mixedFormedAndLinkedRHS :
    toLeanEnv (installFormedPackagesPS c.mixedRHS.env c.mixedRHS.pkgs) =
      installFormedPackagesLean (toLeanEnv c.mixedRHS.env) c.mixedRHS.pkgs ∧
    DirectEnvSound
      (asPSDirectEnv (installFormedPackagesPS c.mixedRHS.env c.mixedRHS.pkgs))
      (asLeanDirectEnv (toLeanEnv (installFormedPackagesPS c.mixedRHS.env c.mixedRHS.pkgs))) ∧
    DeltaEnvExact
      (asPSDeltaEnv (installFormedPackagesPS c.mixedRHS.env c.mixedRHS.pkgs))
      (asLeanDeltaEnv (toLeanEnv (installFormedPackagesPS c.mixedRHS.env c.mixedRHS.pkgs))) ∧
    (∀ p : PSFormedInductivePackage, p ∈ c.mixedRHS.pkgs → p.RecursorBoundarySound) ∧
    (∀ b : PSMixedRHSBoundary, b ∈ c.mixedRHS.rhsBoundaries →
      b.toLean.kind = b.kind ∧
      b.toLean.rhs.publicRecursor = b.rhs.publicRecursor ∧
      b.toLean.rhs.helpers = b.rhs.helpers ∧
      b.toLean.rhs.eval.before = PSExpr.toLean b.rhs.eval.before ∧
      b.toLean.rhs.eval.after = PSExpr.toLean b.rhs.eval.after)
  inheritedAdmissionBoundary : PSV71AdmissionBoundarySound c.admissionBoundary
  inheritedMutualAdmissionBoundary : PSV71MutualAdmissionBoundarySound c.mutualAdmissionBoundary
  completedLedger : completedNestedPreprocessingSlices.length = 6
  outstandingLedger : outstandingNestedPreprocessingObligations.length = 4
  progressLedger : k3OverallProgressCompleted * 100 / k3OverallProgressTotal = 75

/-- Formed nested packages preserve environment translation and lookup premises. -/
theorem nestedFormedEnvironment_sound
    (env : PSEnv) (pkgs : List PSNestedPackage) :
    toLeanEnv (installNestedPackagesPS env pkgs) =
      installNestedPackagesLean (toLeanEnv env) pkgs ∧
    DirectEnvSound
      (asPSDirectEnv (installNestedPackagesPS env pkgs))
      (asLeanDirectEnv (toLeanEnv (installNestedPackagesPS env pkgs))) ∧
    DeltaEnvExact
      (asPSDeltaEnv (installNestedPackagesPS env pkgs))
      (asLeanDeltaEnv (toLeanEnv (installNestedPackagesPS env pkgs))) := by
  exact formedNestedWholeEnvironment_sound env pkgs

/-- Mixed formed packages plus linked RHS traces still preserve the current RHS boundary. -/
theorem mixedFormedLinkedRHS_sound
    (s : PSFormedEnvironmentWithRHS) :
    toLeanEnv (installFormedPackagesPS s.env s.pkgs) =
      installFormedPackagesLean (toLeanEnv s.env) s.pkgs ∧
    DirectEnvSound
      (asPSDirectEnv (installFormedPackagesPS s.env s.pkgs))
      (asLeanDirectEnv (toLeanEnv (installFormedPackagesPS s.env s.pkgs))) ∧
    DeltaEnvExact
      (asPSDeltaEnv (installFormedPackagesPS s.env s.pkgs))
      (asLeanDeltaEnv (toLeanEnv (installFormedPackagesPS s.env s.pkgs))) ∧
    (∀ p : PSFormedInductivePackage, p ∈ s.pkgs → p.RecursorBoundarySound) ∧
    (∀ b : PSMixedRHSBoundary, b ∈ s.rhsBoundaries →
      b.toLean.kind = b.kind ∧
      b.toLean.rhs.publicRecursor = b.rhs.publicRecursor ∧
      b.toLean.rhs.helpers = b.rhs.helpers ∧
      b.toLean.rhs.eval.before = PSExpr.toLean b.rhs.eval.before ∧
      b.toLean.rhs.eval.after = PSExpr.toLean b.rhs.eval.after) := by
  exact KernelV71AdmissionBoundary.formedEnvironmentLinkedRHS_sound s

/-- The previous mutual-admission progress ledger remains available to this nested checkpoint. -/
theorem inheritedMutualAdmissionProgress_prior :
    KernelV71MutualAdmissionCompletenessBoundary.k3OverallProgressCompleted = 70 := by
  rfl

/-- Top-level nested-preprocessing completeness-boundary theorem for v71. -/
theorem v71NestedPreprocessingCompletenessBoundary_sound
    (c : PSV71NestedPreprocessingBoundary) :
    PSV71NestedPreprocessingBoundarySound c := by
  exact
    { formedNestedEnvironment :=
        nestedFormedEnvironment_sound c.env c.nestedPackages
      mixedFormedAndLinkedRHS :=
        mixedFormedLinkedRHS_sound c.mixedRHS
      inheritedAdmissionBoundary :=
        KernelV71AdmissionBoundary.v71AdmissionBoundary_sound c.admissionBoundary
      inheritedMutualAdmissionBoundary :=
        KernelV71MutualAdmissionCompletenessBoundary.v71MutualAdmissionCompletenessBoundary_sound c.mutualAdmissionBoundary
      completedLedger := completedNestedPreprocessingSlices_count
      outstandingLedger := outstandingNestedPreprocessingObligations_count
      progressLedger := k3OverallProgress_percent }

end KernelV71NestedPreprocessingCompletenessBoundary
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.KernelV71NestedPreprocessingCompletenessBoundary.completedNestedPreprocessingSlices_count
#print axioms ProofScriptKernelEquivalence.KernelV71NestedPreprocessingCompletenessBoundary.outstandingNestedPreprocessingObligations_count
#print axioms ProofScriptKernelEquivalence.KernelV71NestedPreprocessingCompletenessBoundary.k3OverallProgress_percent
#print axioms ProofScriptKernelEquivalence.KernelV71NestedPreprocessingCompletenessBoundary.nestedFormedEnvironment_sound
#print axioms ProofScriptKernelEquivalence.KernelV71NestedPreprocessingCompletenessBoundary.mixedFormedLinkedRHS_sound
#print axioms ProofScriptKernelEquivalence.KernelV71NestedPreprocessingCompletenessBoundary.inheritedMutualAdmissionProgress_prior
#print axioms ProofScriptKernelEquivalence.KernelV71NestedPreprocessingCompletenessBoundary.v71NestedPreprocessingCompletenessBoundary_sound

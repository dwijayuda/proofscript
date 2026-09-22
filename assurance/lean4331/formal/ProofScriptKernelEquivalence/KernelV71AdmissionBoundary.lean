import ProofScriptKernelEquivalence.InductiveClassifierImplementationTrace
import ProofScriptKernelEquivalence.RecursorMutualNestedRHSCorrespondence

namespace ProofScriptKernelEquivalence
namespace KernelV71AdmissionBoundary

open DeclarationEnvironment
open DeltaTransparency
open EnvironmentNonMutualInduction
open InductiveClassifierImplementationTrace
open InductiveNonMutualClassifierCorrespondence
open InductiveFormedEnvironmentGeneralization
open InductiveNonMutualGenericAdmission
open RecursorMutualNestedRHSCorrespondence

/--
The v71 admission/completeness ledger is deliberately split into completed
soundness slices and outstanding K3 obligations.  This prevents the assurance
artifact from silently converting strong executable evidence into a false full
whole-kernel-equivalence claim.
-/
inductive CompletedAdmissionSlice where
  | nonMutualImplementationRawAdmission
  | nonMutualImplementationEnvironment
  | mixedFormedEnvironment
  | mutualNestedLinkedRHS
  deriving Repr, DecidableEq

/-- The admission/completeness obligations still outside this v71 checkpoint. -/
inductive OutstandingK3Obligation where
  | fullMutualAdmissionCompleteness
  | fullNestedPreprocessingCompleteness
  | fullMutualNestedPositivityCompleteness
  | arbitraryStoredRecursorRHSReconstruction
  | finalWholeKernelEquivalence
  deriving Repr, DecidableEq

/-- Slices that are certified by the current v71 boundary stack. -/
def completedSlices : List CompletedAdmissionSlice :=
  [ CompletedAdmissionSlice.nonMutualImplementationRawAdmission
  , CompletedAdmissionSlice.nonMutualImplementationEnvironment
  , CompletedAdmissionSlice.mixedFormedEnvironment
  , CompletedAdmissionSlice.mutualNestedLinkedRHS
  ]

/-- K3 obligations intentionally not claimed by this checkpoint. -/
def outstandingK3Obligations : List OutstandingK3Obligation :=
  [ OutstandingK3Obligation.fullMutualAdmissionCompleteness
  , OutstandingK3Obligation.fullNestedPreprocessingCompleteness
  , OutstandingK3Obligation.fullMutualNestedPositivityCompleteness
  , OutstandingK3Obligation.arbitraryStoredRecursorRHSReconstruction
  , OutstandingK3Obligation.finalWholeKernelEquivalence
  ]

/-- Machine-checkable count of completed slices. -/
theorem completedSlices_count : completedSlices.length = 4 := by
  rfl

/-- Machine-checkable count of intentionally outstanding K3 obligations. -/
theorem outstandingK3Obligations_count : outstandingK3Obligations.length = 5 := by
  rfl

/--
A packaged v71 admission-boundary certificate: implementation-traced
non-mutual classifier packages plus the mixed formed-environment/RHS boundary.
-/
structure PSV71AdmissionBoundary where
  env : PSEnv
  nonMutualImplementationPackages : List PSClassifierImplementationPackage
  formedRHS : PSFormedEnvironmentWithRHS

/-- The proposition proved by this checkpoint for one boundary certificate. -/
structure PSV71AdmissionBoundarySound (c : PSV71AdmissionBoundary) : Prop where
  nonMutualRawAdmission :
    ∀ (leanEnv : LeanOrdinaryEqEnv) (p : PSClassifierImplementationPackage),
      p ∈ c.nonMutualImplementationPackages →
      OrdinaryEqEnvSound p.package.psEnv leanEnv →
      LeanGenericNonMutualAdmitted leanEnv [] p.package.raw.toLean
  nonMutualEnvironment :
    toLeanEnv
        (installPackagesPS c.env
          ((c.nonMutualImplementationPackages.map PSClassifierImplementationPackage.package).map PSClassifierPackage.normalizedPackage)) =
      installPackagesLean (toLeanEnv c.env)
        ((c.nonMutualImplementationPackages.map PSClassifierImplementationPackage.package).map PSClassifierPackage.normalizedPackage) ∧
    DirectEnvSound
      (asPSDirectEnv
        (installPackagesPS c.env
          ((c.nonMutualImplementationPackages.map PSClassifierImplementationPackage.package).map PSClassifierPackage.normalizedPackage)))
      (asLeanDirectEnv
        (toLeanEnv
          (installPackagesPS c.env
            ((c.nonMutualImplementationPackages.map PSClassifierImplementationPackage.package).map PSClassifierPackage.normalizedPackage)))) ∧
    DeltaEnvExact
      (asPSDeltaEnv
        (installPackagesPS c.env
          ((c.nonMutualImplementationPackages.map PSClassifierImplementationPackage.package).map PSClassifierPackage.normalizedPackage)))
      (asLeanDeltaEnv
        (toLeanEnv
          (installPackagesPS c.env
            ((c.nonMutualImplementationPackages.map PSClassifierImplementationPackage.package).map PSClassifierPackage.normalizedPackage))))
  formedEnvironmentAndLinkedRHS :
    toLeanEnv (installFormedPackagesPS c.formedRHS.env c.formedRHS.pkgs) =
      installFormedPackagesLean (toLeanEnv c.formedRHS.env) c.formedRHS.pkgs ∧
    DirectEnvSound
      (asPSDirectEnv (installFormedPackagesPS c.formedRHS.env c.formedRHS.pkgs))
      (asLeanDirectEnv (toLeanEnv (installFormedPackagesPS c.formedRHS.env c.formedRHS.pkgs))) ∧
    DeltaEnvExact
      (asPSDeltaEnv (installFormedPackagesPS c.formedRHS.env c.formedRHS.pkgs))
      (asLeanDeltaEnv (toLeanEnv (installFormedPackagesPS c.formedRHS.env c.formedRHS.pkgs))) ∧
    (∀ p : PSFormedInductivePackage, p ∈ c.formedRHS.pkgs → p.RecursorBoundarySound) ∧
    (∀ b : PSMixedRHSBoundary, b ∈ c.formedRHS.rhsBoundaries →
      b.toLean.kind = b.kind ∧
      b.toLean.rhs.publicRecursor = b.rhs.publicRecursor ∧
      b.toLean.rhs.helpers = b.rhs.helpers ∧
      b.toLean.rhs.eval.before = PSExpr.toLean b.rhs.eval.before ∧
      b.toLean.rhs.eval.after = PSExpr.toLean b.rhs.eval.after)
  completedLedger : completedSlices.length = 4
  outstandingLedger : outstandingK3Obligations.length = 5

/-- Each implementation-traced non-mutual package is Lean-admitted after translation. -/
theorem nonMutualImplementationPackages_rawAdmission_sound
    (leanEnv : LeanOrdinaryEqEnv) (pkgs : List PSClassifierImplementationPackage) :
    ∀ p ∈ pkgs,
      OrdinaryEqEnvSound p.package.psEnv leanEnv →
      LeanGenericNonMutualAdmitted leanEnv [] p.package.raw.toLean := by
  intro p hp hEnv
  exact implementationPackage_rawAdmission_sound leanEnv p hEnv

/-- Sequences of implementation-traced non-mutual packages preserve environment premises. -/
theorem nonMutualImplementationPackages_environment_sound
    (env : PSEnv) (pkgs : List PSClassifierImplementationPackage) :
    toLeanEnv
        (installPackagesPS env ((pkgs.map PSClassifierImplementationPackage.package).map PSClassifierPackage.normalizedPackage)) =
      installPackagesLean (toLeanEnv env)
        ((pkgs.map PSClassifierImplementationPackage.package).map PSClassifierPackage.normalizedPackage) ∧
    DirectEnvSound
      (asPSDirectEnv
        (installPackagesPS env ((pkgs.map PSClassifierImplementationPackage.package).map PSClassifierPackage.normalizedPackage)))
      (asLeanDirectEnv
        (toLeanEnv
          (installPackagesPS env ((pkgs.map PSClassifierImplementationPackage.package).map PSClassifierPackage.normalizedPackage)))) ∧
    DeltaEnvExact
      (asPSDeltaEnv
        (installPackagesPS env ((pkgs.map PSClassifierImplementationPackage.package).map PSClassifierPackage.normalizedPackage)))
      (asLeanDeltaEnv
        (toLeanEnv
          (installPackagesPS env ((pkgs.map PSClassifierImplementationPackage.package).map PSClassifierPackage.normalizedPackage)))) := by
  exact implementationPackages_wholeEnvironment_sound env pkgs

/-- Mixed formed packages plus linked RHS traces preserve the current environment/RHS boundary. -/
theorem formedEnvironmentLinkedRHS_sound
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
  exact formedEnvironmentWithRHS_sound s

/--
Top-level v71 admission-boundary theorem.

This proves all completed soundness slices currently in scope and, equally
importantly, records that five K3 obligations remain intentionally open.  It is
therefore an admission-boundary certificate, not a full completeness theorem.
-/
theorem v71AdmissionBoundary_sound (c : PSV71AdmissionBoundary) :
    PSV71AdmissionBoundarySound c := by
  exact
    { nonMutualRawAdmission :=
        fun leanEnv p hp hEnv =>
          nonMutualImplementationPackages_rawAdmission_sound leanEnv c.nonMutualImplementationPackages p hp hEnv
      nonMutualEnvironment :=
        nonMutualImplementationPackages_environment_sound c.env c.nonMutualImplementationPackages
      formedEnvironmentAndLinkedRHS :=
        formedEnvironmentLinkedRHS_sound c.formedRHS
      completedLedger := completedSlices_count
      outstandingLedger := outstandingK3Obligations_count }

end KernelV71AdmissionBoundary
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.KernelV71AdmissionBoundary.completedSlices_count
#print axioms ProofScriptKernelEquivalence.KernelV71AdmissionBoundary.outstandingK3Obligations_count
#print axioms ProofScriptKernelEquivalence.KernelV71AdmissionBoundary.nonMutualImplementationPackages_rawAdmission_sound
#print axioms ProofScriptKernelEquivalence.KernelV71AdmissionBoundary.nonMutualImplementationPackages_environment_sound
#print axioms ProofScriptKernelEquivalence.KernelV71AdmissionBoundary.formedEnvironmentLinkedRHS_sound
#print axioms ProofScriptKernelEquivalence.KernelV71AdmissionBoundary.v71AdmissionBoundary_sound

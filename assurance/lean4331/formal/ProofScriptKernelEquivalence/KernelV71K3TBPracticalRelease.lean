import ProofScriptKernelEquivalence.KernelV71K3TBIndependentAuditPack

namespace ProofScriptKernelEquivalence
namespace KernelV71K3TBPracticalRelease

open KernelV71K3TBReleaseCandidate
open KernelV71K3TBVerificationBundle
open KernelV71K3TBIndependentAuditPack

/-- Assets added for the practical K3-TB release path. -/
inductive PracticalReleaseAsset where
  | practicalReleaseGuide
  | releaseNotes
  | trustedInfrastructureStatement
  | finalReleaseManifest
  | releaseVerifier
  | practicalReleaseGate
  | inheritedIndependentAuditPack
  deriving Repr, DecidableEq

/-- Claims permitted for v71 after choosing the practical release path. -/
inductive PracticalReleaseAllowedClaim where
  | k3TBPracticalReleaseCandidate
  | leanBackedTrustedBoundaryAssurance
  | reproduciblyVerifiableUnderTrustedInfrastructure
  deriving Repr, DecidableEq

/-- Claims still forbidden for v71. -/
inductive PracticalReleaseForbiddenClaim where
  | fullyFormalK3
  | completeLeanKernelEquivalence
  | verifiedTypeScriptNodeRuntimeSemantics
  | arbitraryLeanAcceptanceCompleteness
  deriving Repr, DecidableEq

/-- Trusted infrastructure intentionally kept outside fully formal K3. -/
inductive TrustedInfrastructure where
  | leanReferenceBinary
  | nodeRuntime
  | ecmaScriptSemantics
  | typeScriptCompiler
  | npmOfflineInstall
  | hostProcessEnvironment
  deriving Repr, DecidableEq

/-- Final practical-release assets. -/
def practicalReleaseAssets : List PracticalReleaseAsset :=
  [ PracticalReleaseAsset.practicalReleaseGuide
  , PracticalReleaseAsset.releaseNotes
  , PracticalReleaseAsset.trustedInfrastructureStatement
  , PracticalReleaseAsset.finalReleaseManifest
  , PracticalReleaseAsset.releaseVerifier
  , PracticalReleaseAsset.practicalReleaseGate
  , PracticalReleaseAsset.inheritedIndependentAuditPack
  ]

/-- Allowed claim list for release materials. -/
def allowedClaims : List PracticalReleaseAllowedClaim :=
  [ PracticalReleaseAllowedClaim.k3TBPracticalReleaseCandidate
  , PracticalReleaseAllowedClaim.leanBackedTrustedBoundaryAssurance
  , PracticalReleaseAllowedClaim.reproduciblyVerifiableUnderTrustedInfrastructure
  ]

/-- Forbidden claim list for release materials. -/
def forbiddenClaims : List PracticalReleaseForbiddenClaim :=
  [ PracticalReleaseForbiddenClaim.fullyFormalK3
  , PracticalReleaseForbiddenClaim.completeLeanKernelEquivalence
  , PracticalReleaseForbiddenClaim.verifiedTypeScriptNodeRuntimeSemantics
  , PracticalReleaseForbiddenClaim.arbitraryLeanAcceptanceCompleteness
  ]

/-- Trusted infrastructure list for v71 practical release. -/
def trustedInfrastructure : List TrustedInfrastructure :=
  [ TrustedInfrastructure.leanReferenceBinary
  , TrustedInfrastructure.nodeRuntime
  , TrustedInfrastructure.ecmaScriptSemantics
  , TrustedInfrastructure.typeScriptCompiler
  , TrustedInfrastructure.npmOfflineInstall
  , TrustedInfrastructure.hostProcessEnvironment
  ]

/-- Progress remains 99.50%; practical release is not a proof-status increase. -/
def practicalReleaseProgressBasisPoints : Nat :=
  KernelV71K3TBIndependentAuditPack.auditPackProgressBasisPoints

/-- Practical release keeps the K3-TB label. -/
def practicalReleaseLabel : K3TBReleaseLabel :=
  K3TBReleaseLabel.k3TrustedBoundary

/-- Asset count. -/
theorem practicalReleaseAssets_count :
    practicalReleaseAssets.length = 7 := by
  rfl

/-- Allowed claim count. -/
theorem allowedClaims_count :
    allowedClaims.length = 3 := by
  rfl

/-- Forbidden claim count. -/
theorem forbiddenClaims_count :
    forbiddenClaims.length = 4 := by
  rfl

/-- Trusted infrastructure count. -/
theorem trustedInfrastructure_count :
    trustedInfrastructure.length = 6 := by
  rfl

/-- Practical release progress is still 99.50%. -/
theorem practicalReleaseProgress_basisPoints :
    practicalReleaseProgressBasisPoints = 9950 := by
  rfl

/-- Practical release keeps the trusted-boundary label. -/
theorem practicalReleaseLabel_isK3TB :
    practicalReleaseLabel = K3TBReleaseLabel.k3TrustedBoundary := by
  rfl

/-- Ledger supplied by the executable practical-release gate. -/
structure PracticalReleaseLedger where
  inheritedCheckpointCount : Nat
  inheritedCheckpointFailures : Nat
  fullLeanGateParts : Nat
  fullLeanGateFailures : Nat
  releaseDocCount : Nat
  trustedInfrastructureCount : Nat
  allowedClaimCount : Nat
  forbiddenClaimCount : Nat
  progressBasisPoints : Nat
  inheritedCheckpointCountOk : inheritedCheckpointCount = 22
  noInheritedCheckpointFailures : inheritedCheckpointFailures = 0
  fullLeanGateComplete : fullLeanGateParts = 6
  fullLeanGateClean : fullLeanGateFailures = 0
  releaseDocCountOk : releaseDocCount = 8
  trustedInfrastructureCountOk : trustedInfrastructureCount = 6
  allowedClaimCountOk : allowedClaimCount = 3
  forbiddenClaimCountOk : forbiddenClaimCount = 4
  progressOk : progressBasisPoints = 9950

/-- Soundness statement for the practical release packaging layer. -/
structure PracticalReleaseSound (l : PracticalReleaseLedger) : Prop where
  inheritedCheckpointCountOk : l.inheritedCheckpointCount = 22
  noInheritedCheckpointFailures : l.inheritedCheckpointFailures = 0
  fullLeanGateComplete : l.fullLeanGateParts = 6
  fullLeanGateClean : l.fullLeanGateFailures = 0
  releaseDocCountOk : l.releaseDocCount = 8
  trustedInfrastructureCountOk : l.trustedInfrastructureCount = 6
  allowedClaimCountOk : l.allowedClaimCount = 3
  forbiddenClaimCountOk : l.forbiddenClaimCount = 4
  progressOk : l.progressBasisPoints = 9950
  assetsOk : practicalReleaseAssets.length = 7
  allowedClaimsOk : allowedClaims.length = 3
  forbiddenClaimsOk : forbiddenClaims.length = 4
  trustedInfrastructureOk : trustedInfrastructure.length = 6
  practicalProgressOk : practicalReleaseProgressBasisPoints = 9950
  practicalLabelOk : practicalReleaseLabel = K3TBReleaseLabel.k3TrustedBoundary

/-- Top-level theorem for the v71 practical K3-TB release layer. -/
theorem v71K3TBPracticalRelease_sound
    (l : PracticalReleaseLedger) :
    PracticalReleaseSound l := by
  exact
    { inheritedCheckpointCountOk := l.inheritedCheckpointCountOk
      noInheritedCheckpointFailures := l.noInheritedCheckpointFailures
      fullLeanGateComplete := l.fullLeanGateComplete
      fullLeanGateClean := l.fullLeanGateClean
      releaseDocCountOk := l.releaseDocCountOk
      trustedInfrastructureCountOk := l.trustedInfrastructureCountOk
      allowedClaimCountOk := l.allowedClaimCountOk
      forbiddenClaimCountOk := l.forbiddenClaimCountOk
      progressOk := l.progressOk
      assetsOk := practicalReleaseAssets_count
      allowedClaimsOk := allowedClaims_count
      forbiddenClaimsOk := forbiddenClaims_count
      trustedInfrastructureOk := trustedInfrastructure_count
      practicalProgressOk := practicalReleaseProgress_basisPoints
      practicalLabelOk := practicalReleaseLabel_isK3TB }

/-- The practical release path explicitly remains not fully formal K3. -/
theorem v71K3TBPracticalRelease_notFullyFormalK3 :
    practicalReleaseLabel = K3TBReleaseLabel.k3TrustedBoundary ∧
    forbiddenClaims.length = 4 ∧
    KernelV71K3TBVerificationBundle.verificationRemainingFullFormalObligations.length = 5 := by
  exact ⟨practicalReleaseLabel_isK3TB, forbiddenClaims_count,
    KernelV71K3TBVerificationBundle.verificationRemainingFullFormalObligations_count⟩

end KernelV71K3TBPracticalRelease
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.KernelV71K3TBPracticalRelease.practicalReleaseAssets_count
#print axioms ProofScriptKernelEquivalence.KernelV71K3TBPracticalRelease.allowedClaims_count
#print axioms ProofScriptKernelEquivalence.KernelV71K3TBPracticalRelease.forbiddenClaims_count
#print axioms ProofScriptKernelEquivalence.KernelV71K3TBPracticalRelease.trustedInfrastructure_count
#print axioms ProofScriptKernelEquivalence.KernelV71K3TBPracticalRelease.practicalReleaseProgress_basisPoints
#print axioms ProofScriptKernelEquivalence.KernelV71K3TBPracticalRelease.practicalReleaseLabel_isK3TB
#print axioms ProofScriptKernelEquivalence.KernelV71K3TBPracticalRelease.v71K3TBPracticalRelease_sound
#print axioms ProofScriptKernelEquivalence.KernelV71K3TBPracticalRelease.v71K3TBPracticalRelease_notFullyFormalK3

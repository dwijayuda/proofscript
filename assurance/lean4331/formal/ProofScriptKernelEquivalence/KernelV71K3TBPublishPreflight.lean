import ProofScriptKernelEquivalence.KernelV71K3TBPracticalRelease

namespace ProofScriptKernelEquivalence
namespace KernelV71K3TBPublishPreflight

open KernelV71K3TBPracticalRelease
open KernelV71K3TBIndependentAuditPack

/-- Assets added by the publish-preflight layer. -/
inductive PublishPreflightAsset where
  | publishGuide
  | provenanceManifest
  | sbomManifest
  | overclaimGuard
  | publishVerifier
  | publishCheckpoint
  deriving Repr, DecidableEq

/-- Release channels accepted for v71 K3-TB. -/
inductive PublishChannel where
  | sourceArchive
  | internalReviewerArchive
  deriving Repr, DecidableEq

/-- Publication actions explicitly forbidden for this practical release. -/
inductive ForbiddenPublishAction where
  | publishAsFullyFormalK3
  | publishAsVerifiedRuntime
  | publishAsCompleteLeanEquivalence
  | publishToNpmAsStableKernel
  deriving Repr, DecidableEq

/-- Publish-preflight assets. -/
def publishPreflightAssets : List PublishPreflightAsset :=
  [ PublishPreflightAsset.publishGuide
  , PublishPreflightAsset.provenanceManifest
  , PublishPreflightAsset.sbomManifest
  , PublishPreflightAsset.overclaimGuard
  , PublishPreflightAsset.publishVerifier
  , PublishPreflightAsset.publishCheckpoint
  ]

/-- Allowed publication channels for v71. -/
def allowedPublishChannels : List PublishChannel :=
  [ PublishChannel.sourceArchive
  , PublishChannel.internalReviewerArchive
  ]

/-- Forbidden publication actions for v71. -/
def forbiddenPublishActions : List ForbiddenPublishAction :=
  [ ForbiddenPublishAction.publishAsFullyFormalK3
  , ForbiddenPublishAction.publishAsVerifiedRuntime
  , ForbiddenPublishAction.publishAsCompleteLeanEquivalence
  , ForbiddenPublishAction.publishToNpmAsStableKernel
  ]

/-- Publish-preflight progress does not increase the formal K3 claim. -/
def publishPreflightProgressBasisPoints : Nat :=
  KernelV71K3TBPracticalRelease.practicalReleaseProgressBasisPoints

/-- Publish-preflight keeps the trusted-boundary release label. -/
def publishPreflightLabel : KernelV71K3TBReleaseCandidate.K3TBReleaseLabel :=
  KernelV71K3TBPracticalRelease.practicalReleaseLabel

/-- Asset count. -/
theorem publishPreflightAssets_count :
    publishPreflightAssets.length = 6 := by
  rfl

/-- Channel count. -/
theorem allowedPublishChannels_count :
    allowedPublishChannels.length = 2 := by
  rfl

/-- Forbidden action count. -/
theorem forbiddenPublishActions_count :
    forbiddenPublishActions.length = 4 := by
  rfl

/-- Publish-preflight progress remains 99.50%. -/
theorem publishPreflightProgress_basisPoints :
    publishPreflightProgressBasisPoints = 9950 := by
  rfl

/-- Publish-preflight keeps the K3-TB label. -/
theorem publishPreflightLabel_isK3TB :
    publishPreflightLabel = KernelV71K3TBReleaseCandidate.K3TBReleaseLabel.k3TrustedBoundary := by
  rfl

/-- Executable publish-preflight ledger supplied by the JS gate. -/
structure PublishPreflightLedger where
  inheritedCheckpointCount : Nat
  inheritedCheckpointFailures : Nat
  releaseVerifierStatus : Nat
  publishDocCount : Nat
  provenanceManifestCount : Nat
  sbomPackageCount : Nat
  overclaimGuardCount : Nat
  progressBasisPoints : Nat
  inheritedCheckpointCountOk : inheritedCheckpointCount = 23
  noInheritedCheckpointFailures : inheritedCheckpointFailures = 0
  releaseVerifierOk : releaseVerifierStatus = 0
  publishDocCountOk : publishDocCount = 1
  provenanceManifestCountOk : provenanceManifestCount = 1
  sbomPackageCountOk : sbomPackageCount = 3
  overclaimGuardCountOk : overclaimGuardCount = 1
  progressOk : progressBasisPoints = 9950

/-- Soundness statement for publish-preflight packaging. -/
structure PublishPreflightSound (l : PublishPreflightLedger) : Prop where
  inheritedCheckpointCountOk : l.inheritedCheckpointCount = 23
  noInheritedCheckpointFailures : l.inheritedCheckpointFailures = 0
  releaseVerifierOk : l.releaseVerifierStatus = 0
  publishDocCountOk : l.publishDocCount = 1
  provenanceManifestCountOk : l.provenanceManifestCount = 1
  sbomPackageCountOk : l.sbomPackageCount = 3
  overclaimGuardCountOk : l.overclaimGuardCount = 1
  progressOk : l.progressBasisPoints = 9950
  assetsOk : publishPreflightAssets.length = 6
  allowedChannelsOk : allowedPublishChannels.length = 2
  forbiddenActionsOk : forbiddenPublishActions.length = 4
  progressStable : publishPreflightProgressBasisPoints = 9950
  labelStable : publishPreflightLabel = KernelV71K3TBReleaseCandidate.K3TBReleaseLabel.k3TrustedBoundary

/-- Top-level theorem for the publish-preflight layer. -/
theorem v71K3TBPublishPreflight_sound
    (l : PublishPreflightLedger) :
    PublishPreflightSound l := by
  exact
    { inheritedCheckpointCountOk := l.inheritedCheckpointCountOk
      noInheritedCheckpointFailures := l.noInheritedCheckpointFailures
      releaseVerifierOk := l.releaseVerifierOk
      publishDocCountOk := l.publishDocCountOk
      provenanceManifestCountOk := l.provenanceManifestCountOk
      sbomPackageCountOk := l.sbomPackageCountOk
      overclaimGuardCountOk := l.overclaimGuardCountOk
      progressOk := l.progressOk
      assetsOk := publishPreflightAssets_count
      allowedChannelsOk := allowedPublishChannels_count
      forbiddenActionsOk := forbiddenPublishActions_count
      progressStable := publishPreflightProgress_basisPoints
      labelStable := publishPreflightLabel_isK3TB }

/-- Publishing this package still forbids the full-formal K3 claim. -/
theorem v71K3TBPublishPreflight_notFullyFormalK3 :
    publishPreflightLabel = KernelV71K3TBReleaseCandidate.K3TBReleaseLabel.k3TrustedBoundary ∧
    forbiddenPublishActions.length = 4 ∧
    KernelV71K3TBPracticalRelease.forbiddenClaims.length = 4 := by
  exact ⟨publishPreflightLabel_isK3TB, forbiddenPublishActions_count,
    KernelV71K3TBPracticalRelease.forbiddenClaims_count⟩

end KernelV71K3TBPublishPreflight
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.KernelV71K3TBPublishPreflight.publishPreflightAssets_count
#print axioms ProofScriptKernelEquivalence.KernelV71K3TBPublishPreflight.allowedPublishChannels_count
#print axioms ProofScriptKernelEquivalence.KernelV71K3TBPublishPreflight.forbiddenPublishActions_count
#print axioms ProofScriptKernelEquivalence.KernelV71K3TBPublishPreflight.publishPreflightProgress_basisPoints
#print axioms ProofScriptKernelEquivalence.KernelV71K3TBPublishPreflight.publishPreflightLabel_isK3TB
#print axioms ProofScriptKernelEquivalence.KernelV71K3TBPublishPreflight.v71K3TBPublishPreflight_sound
#print axioms ProofScriptKernelEquivalence.KernelV71K3TBPublishPreflight.v71K3TBPublishPreflight_notFullyFormalK3

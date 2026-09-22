import ProofScriptKernelEquivalence.KernelV71K3TBVerificationBundle

namespace ProofScriptKernelEquivalence
namespace KernelV71K3TBIndependentAuditPack

open KernelV71K3TBReleaseCandidate
open KernelV71K3TBVerificationBundle

/--
An independent-audit pack adds reviewer-facing evidence organization and
anti-overclaim checks on top of the K3-TB verification bundle. It is a release
hygiene layer: it does not discharge the remaining full-formal K3 obligations.
-/
inductive K3TBAuditAsset where
  | auditGuide
  | evidenceIndex
  | trustBoundaryMatrix
  | overclaimGuard
  | reviewerChecklist
  | inheritedVerificationBundle
  deriving Repr, DecidableEq

/-- Questions an external reviewer should be able to answer from the pack. -/
inductive K3TBAuditQuestion where
  | isLeanPinned
  | canOneCommandVerify
  | areCheckpointsPass
  | areTrustAssumptionsExplicit
  | areRemainingObligationsExplicit
  | isFullFormalK3Rejected
  deriving Repr, DecidableEq

/-- Claims that the overclaim guard must keep separated. -/
inductive K3TBClaimClass where
  | allowedTrustedBoundaryRC
  | allowedLeanBackedAssurance
  | allowedConditionalScaffold
  | forbiddenFullyFormalK3
  | forbiddenCompleteLeanKernelEquivalence
  | forbiddenVerifiedNodeRuntimeSemantics
  deriving Repr, DecidableEq

/-- Audit assets added by this package. -/
def auditAssets : List K3TBAuditAsset :=
  [ K3TBAuditAsset.auditGuide
  , K3TBAuditAsset.evidenceIndex
  , K3TBAuditAsset.trustBoundaryMatrix
  , K3TBAuditAsset.overclaimGuard
  , K3TBAuditAsset.reviewerChecklist
  , K3TBAuditAsset.inheritedVerificationBundle
  ]

/-- Minimum audit questions covered by the independent-auditor pack. -/
def auditQuestions : List K3TBAuditQuestion :=
  [ K3TBAuditQuestion.isLeanPinned
  , K3TBAuditQuestion.canOneCommandVerify
  , K3TBAuditQuestion.areCheckpointsPass
  , K3TBAuditQuestion.areTrustAssumptionsExplicit
  , K3TBAuditQuestion.areRemainingObligationsExplicit
  , K3TBAuditQuestion.isFullFormalK3Rejected
  ]

/-- Explicit claim taxonomy used by the overclaim guard. -/
def claimClasses : List K3TBClaimClass :=
  [ K3TBClaimClass.allowedTrustedBoundaryRC
  , K3TBClaimClass.allowedLeanBackedAssurance
  , K3TBClaimClass.allowedConditionalScaffold
  , K3TBClaimClass.forbiddenFullyFormalK3
  , K3TBClaimClass.forbiddenCompleteLeanKernelEquivalence
  , K3TBClaimClass.forbiddenVerifiedNodeRuntimeSemantics
  ]

/-- The audit pack intentionally preserves the K3-TB progress value. -/
def auditPackProgressBasisPoints : Nat :=
  KernelV71K3TBVerificationBundle.k3TBVerificationProgressBasisPoints

/-- The audit pack is still labelled K3-TB, never full formal K3. -/
def auditPackReleaseLabel : K3TBReleaseLabel :=
  K3TBReleaseLabel.k3TrustedBoundary

/-- Audit asset count. -/
theorem auditAssets_count :
    auditAssets.length = 6 := by
  rfl

/-- Audit question count. -/
theorem auditQuestions_count :
    auditQuestions.length = 6 := by
  rfl

/-- Claim taxonomy count. -/
theorem claimClasses_count :
    claimClasses.length = 6 := by
  rfl

/-- Progress is still 99.50%; audit organization does not inflate proof status. -/
theorem auditPackProgress_basisPoints :
    auditPackProgressBasisPoints = 9950 := by
  rfl

/-- The audit pack keeps the trusted-boundary label. -/
theorem auditPackReleaseLabel_isK3TB :
    auditPackReleaseLabel = K3TBReleaseLabel.k3TrustedBoundary := by
  rfl

/--
Ledger checked by the executable independent-audit-pack gate.
The executable gate supplies the concrete counts from JSON checkpoints,
release docs, and one-command verification assets.
-/
structure K3TBAuditPackLedger where
  inheritedCheckpointCount : Nat
  inheritedCheckpointFailures : Nat
  fullLeanGateParts : Nat
  fullLeanGateFailures : Nat
  verificationBundleProgressBasisPoints : Nat
  auditDocumentCount : Nat
  forbiddenClaimCount : Nat
  allowedClaimCount : Nat
  inheritedCheckpointCountOk : inheritedCheckpointCount = 21
  noInheritedCheckpointFailures : inheritedCheckpointFailures = 0
  fullLeanGateComplete : fullLeanGateParts = 6
  fullLeanGateClean : fullLeanGateFailures = 0
  verificationBundleProgressOk : verificationBundleProgressBasisPoints = 9950
  auditDocumentCountOk : auditDocumentCount = 4
  forbiddenClaimCountOk : forbiddenClaimCount = 3
  allowedClaimCountOk : allowedClaimCount = 3

/-- Soundness statement for the audit-pack packaging layer. -/
structure K3TBAuditPackSound (l : K3TBAuditPackLedger) : Prop where
  inheritedCheckpointCountOk : l.inheritedCheckpointCount = 21
  noInheritedCheckpointFailures : l.inheritedCheckpointFailures = 0
  fullLeanGateComplete : l.fullLeanGateParts = 6
  fullLeanGateClean : l.fullLeanGateFailures = 0
  verificationBundleProgressOk : l.verificationBundleProgressBasisPoints = 9950
  auditDocumentCountOk : l.auditDocumentCount = 4
  forbiddenClaimCountOk : l.forbiddenClaimCount = 3
  allowedClaimCountOk : l.allowedClaimCount = 3
  assetsOk : auditAssets.length = 6
  questionsOk : auditQuestions.length = 6
  claimClassesOk : claimClasses.length = 6
  progressOk : auditPackProgressBasisPoints = 9950
  labelOk : auditPackReleaseLabel = K3TBReleaseLabel.k3TrustedBoundary

/--
Top-level independent-audit-pack theorem.

It says the pack consistently exposes K3-TB evidence, verifies the inherited
checkpoint ledger, and preserves the non-full-K3 trust boundary.
-/
theorem v71K3TBIndependentAuditPack_sound
    (l : K3TBAuditPackLedger) :
    K3TBAuditPackSound l := by
  exact
    { inheritedCheckpointCountOk := l.inheritedCheckpointCountOk
      noInheritedCheckpointFailures := l.noInheritedCheckpointFailures
      fullLeanGateComplete := l.fullLeanGateComplete
      fullLeanGateClean := l.fullLeanGateClean
      verificationBundleProgressOk := l.verificationBundleProgressOk
      auditDocumentCountOk := l.auditDocumentCountOk
      forbiddenClaimCountOk := l.forbiddenClaimCountOk
      allowedClaimCountOk := l.allowedClaimCountOk
      assetsOk := auditAssets_count
      questionsOk := auditQuestions_count
      claimClassesOk := claimClasses_count
      progressOk := auditPackProgress_basisPoints
      labelOk := auditPackReleaseLabel_isK3TB }

/-- The audit pack explicitly rules out treating K3-TB as full formal K3. -/
theorem v71K3TBIndependentAuditPack_notFullyFormalK3 :
    auditPackReleaseLabel = K3TBReleaseLabel.k3TrustedBoundary ∧
    KernelV71K3TBVerificationBundle.verificationRemainingFullFormalObligations.length = 5 := by
  exact ⟨auditPackReleaseLabel_isK3TB,
    KernelV71K3TBVerificationBundle.verificationRemainingFullFormalObligations_count⟩

end KernelV71K3TBIndependentAuditPack
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.KernelV71K3TBIndependentAuditPack.auditAssets_count
#print axioms ProofScriptKernelEquivalence.KernelV71K3TBIndependentAuditPack.auditQuestions_count
#print axioms ProofScriptKernelEquivalence.KernelV71K3TBIndependentAuditPack.claimClasses_count
#print axioms ProofScriptKernelEquivalence.KernelV71K3TBIndependentAuditPack.auditPackProgress_basisPoints
#print axioms ProofScriptKernelEquivalence.KernelV71K3TBIndependentAuditPack.auditPackReleaseLabel_isK3TB
#print axioms ProofScriptKernelEquivalence.KernelV71K3TBIndependentAuditPack.v71K3TBIndependentAuditPack_sound
#print axioms ProofScriptKernelEquivalence.KernelV71K3TBIndependentAuditPack.v71K3TBIndependentAuditPack_notFullyFormalK3

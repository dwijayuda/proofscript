import { auditCoreArtifact, certifyCoreArtifact, checkCoreDeclarations, createCoreReplayCertificateBundle, replayCoreArtifactWithSnapshot, verifyCoreReplayCertificate, verifyCoreReplayCertificateBundle } from "./PSKernel/Replay";
import { proofObligationReport } from "./PSKernel/Verify/Obligations";
import { CoreDeclaration } from "./PSKernel/Declaration";

export function pskernelStatus(): string {
  return "ProofScript pskernel-derived TypeScript kernel: trusted-boundary, not fully formally equivalent to Lean 4 yet";
}

export function pskernelStatusReport() {
  return {
    status: "trusted-boundary",
    proofStatus: "not-proven",
    semanticBaseline: "Lean 4.33.1",
    implementationProfile: "pskernel-derived-typescript-kernel",
    overallProgressEstimate: "99%",
    supportedSlices: [
      "core Level/Expr/Declaration/Environment ADTs",
      "Sort/Pi/Lambda/App/Let inference and checking",
      "controlled delta unfolding with transparency modes",
      "sort cumulativity",
      "proof irrelevance for safely inferred same-Prop proofs",
      "query-scoped structural equality cache with context and environment revision",
      "bounded structural equality key construction with fail-closed cache skips",
      "local let-definition unfolding during inference and normalization",
      "unit-like equality and neutral projection congruence",
      "structural reflexivity before reduction",
      "core primitive prelude: Unit, Bool, Nat, Eq",
      "special indexed Eq.rec type synthesis and refl iota reduction",
      "Quot primitive bootstrap plus Quot.lift/Quot.ind over Quot.mk",
      "simple and parameterized non-indexed recursor type synthesis",
      "simple and parameterized non-indexed recursor iota reduction",
      "single-constructor non-indexed dependent projection typing/reduction with Prop restrictions",
      "function eta equality with de Bruijn binder shifting",
      "Pi/lambda equality independent of binder annotations",
      "nonrecursive single-constructor structure eta for projection-supported structures",
      "trusted Core Nat literal inference and constructor normalization",
      "deterministic replay with optional core/core+quot prelude",
      "deterministic trusted-boundary replay certificates with artifact, semantic, and final environment SHA-256",
      "deterministic environment snapshot JSON and environment SHA-256 evidence",
      "certificate verification by fresh replay",
      "machine-readable proof-obligation catalog",
      "standalone audit bundle with replay/certificate/obligation evidence",
      "release preflight mirror/audit gate for standalone packaging",
      "npm package audit for dist + trust/proof-obligation evidence",
      "install-from-tarball smoke for published @proofscript/kernel dist APIs",
      "deterministic release manifest tying preflight/package/tarball/audit/proof evidence",
      "module metadata cross-checking against checked declarations/generated names",
    ],
    failClosedSlices: [
      "full parser/elaborator/macro/tactic system",
      "String/UInt/Float/native literal semantics",
      "general indexed recursor typing/reduction beyond Eq.rec",
      "mutual recursor typing/reduction",
      "nested/container positivity and recursors",
      "dependent constructor-field recursors/projections",
      "multi-constructor raw projections",
      "full native Lean .olean replay",
      "full formal equivalence with Lean 4 kernel",
      "source-to-source proof completion for the preflight/package/tarball/release-manifest gates themselves",
    ],
  } as const;
}

export function pskernelCheckCore(declarations: CoreDeclaration[], implementationProfile?: string) {
  return checkCoreDeclarations(declarations, implementationProfile);
}

export function pskernelCertifyCoreArtifact(artifact: Parameters<typeof certifyCoreArtifact>[0]) {
  return certifyCoreArtifact(artifact);
}

export function pskernelVerifyCoreCertificate(artifact: Parameters<typeof verifyCoreReplayCertificate>[0], certificate: Parameters<typeof verifyCoreReplayCertificate>[1]) {
  return verifyCoreReplayCertificate(artifact, certificate);
}

export function pskernelProofObligations() {
  return proofObligationReport();
}

export function pskernelAuditCoreArtifact(artifact: Parameters<typeof auditCoreArtifact>[0]) {
  return auditCoreArtifact(artifact);
}

export function pskernelSnapshotCoreArtifact(artifact: Parameters<typeof replayCoreArtifactWithSnapshot>[0]) {
  return replayCoreArtifactWithSnapshot(artifact);
}

export function pskernelCreateCoreCertificateBundle(artifact: Parameters<typeof createCoreReplayCertificateBundle>[0]) {
  return createCoreReplayCertificateBundle(artifact);
}

export function pskernelVerifyCoreCertificateBundle(bundle: Parameters<typeof verifyCoreReplayCertificateBundle>[0]) {
  return verifyCoreReplayCertificateBundle(bundle);
}

export const portStatus_Main = {
  source: "Main.lean",
  target: "packages/kernel/src/Main.ts",
  status: "partial",
  trustedBoundary: true,
  proofStatus: "not-proven",
} as const;

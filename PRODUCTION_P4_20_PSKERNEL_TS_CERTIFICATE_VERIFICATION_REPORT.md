# Production P4.20 — Replay Certificate Verification Report

## Trust label

ProofScript pskernel-derived TypeScript kernel; trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet.

## Goal

Deepen the standalone replay/certificate path. P4.19 could emit deterministic replay certificates. P4.20 adds verification of those certificates by fresh replay, so a consumer can reject stale, forged, or artifact-mismatched evidence without trusting frontend memory.

## Changes

- Added `artifactSha256` to `CoreReplayCertificate`.
- Added `CoreReplayCertificateVerification`.
- Added `validateCoreReplayCertificate(certificate)`.
- Added `verifyCoreReplayCertificate(artifact, certificate)`.
- Added `pskernelVerifyCoreCertificate(...)` Main entrypoint.
- Added CLI command:
  - `npm run pskernel -- verify-cert <certificate-bundle.json>`
- `verify-cert` input is an object with:
  - `artifact`
  - `certificate`
- Verification reruns replay/certification and accepts only if the supplied certificate exactly matches the freshly derived certificate.
- Certificate validation rejects malformed evidence shape:
  - non-accepted certificate status;
  - wrong proof status;
  - wrong trust label;
  - wrong semantic baseline;
  - malformed artifact/semantic SHA-256;
  - malformed declarations/generated/assumptions/prelude evidence.
- Updated status report from 92% to 94%.
- Added proof obligations for artifact hashing, semantic hashing, fresh replay verification, and forgery rejection.

## Files changed

- `packages/kernel/src/PSKernel/Replay.ts`
- `packages/kernel/src/Main.ts`
- `tools/pskernel.ts`
- `tools/pskernel-kernel-smoke.ts`
- `docs/PROOF_OBLIGATIONS.md`
- `PRODUCTION_P4_20_PSKERNEL_TS_CERTIFICATE_VERIFICATION_REPORT.md`

## Red-green evidence

Initial smoke failed before implementation because `verifyCoreReplayCertificate` and `pskernelVerifyCoreCertificate` did not exist.

After implementation, smoke covers:

- matching certificate accepts;
- Main entry certificate verification accepts;
- forged semantic hash rejects;
- artifact changed after certification rejects;
- CLI `verify-cert` accepts a matching bundle.

## Commands run

```bash
npm run build -- --pretty false
npx tsc -b --force --pretty false
node tools/copy-static-assets.ts
npm run test:kernel:smoke
npm run pskernel -- status
npm run pskernel -- status --json
npm run pskernel -- check-core artifacts/pskernel-cli-check-core-smoke.json cli-smoke
npm run pskernel -- certify artifacts/pskernel-cli-certify-smoke.json
npm run pskernel -- verify-cert artifacts/pskernel-cli-verify-cert-smoke.json
```

## Results

```txt
build: PASS
forced tsc rebuild: PASS
copy static assets: PASS
test:kernel:smoke: PASS
pskernel status: PASS
pskernel status --json: PASS
pskernel check-core: PASS
pskernel certify: PASS
pskernel verify-cert: PASS
```

## Supported slices after P4.20

- Core Level/Expr/Declaration/Environment ADTs.
- Sort/Pi/Lambda/App/Let inference and checking.
- Controlled delta unfolding with transparency modes.
- Sort cumulativity.
- Proof irrelevance for safely inferred same-Prop proofs.
- Core primitive prelude: Unit, Bool, Nat, Eq.
- Special indexed `Eq.rec` type synthesis and refl iota reduction.
- Quot primitive bootstrap plus `Quot.lift` / `Quot.ind` over `Quot.mk`.
- Simple and parameterized non-indexed recursor type synthesis.
- Simple and parameterized non-indexed recursor iota reduction.
- Simple single-constructor non-indexed raw projection typing/reduction.
- Simple single-constructor structure eta for projection-supported structures.
- Trusted Core Nat literal inference and constructor normalization.
- Deterministic replay with optional core/core+quot prelude.
- Deterministic trusted-boundary replay certificates with artifact and semantic SHA-256.
- Certificate verification by fresh replay.
- Module metadata cross-checking against checked declarations/generated names.

## Unsupported/fail-closed slices

- Full parser/elaborator/macro/tactic system.
- String/UInt/Float/native literal semantics.
- General indexed recursor typing/reduction beyond `Eq.rec`.
- Mutual recursor typing/reduction.
- Nested/container positivity and recursors.
- Dependent constructor-field recursors/projections.
- Multi-constructor raw projections.
- Full native Lean `.olean` replay.
- Full formal equivalence with Lean 4 kernel.

## Progress

```txt
Previous overall: ~92%
Current overall: ~94%

Phase 2: ~99% complete
Phase 3: ~99% started
Phase 4: ~99% started
Phase 5: ~84% started
Phase 6: ~82% started
Phase 9: ~58% started via proof-obligation/certificate evidence
Trust label: trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet
```

## Notes

This certificate verifier is replay evidence, not a cryptographic signature and not a formal proof. It strengthens the trusted-boundary standalone workflow by binding evidence to a deterministic artifact hash and a freshly replayed semantic hash.

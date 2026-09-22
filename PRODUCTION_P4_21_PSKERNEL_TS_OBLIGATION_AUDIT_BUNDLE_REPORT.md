# Production P4.21 — Machine-Readable Proof Obligations and Audit Bundle Report

## Trust label

ProofScript pskernel-derived TypeScript kernel; trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet.

## Goal

Deepen the standalone evidence path after P4.20 certificate verification by making the proof-obligation catalog machine-readable and adding a one-command audit bundle for replay artifacts.

This does not prove Lean equivalence. It makes the unproven obligations explicit, auditable, and bound to replay/certificate evidence.

## Changes

- Added `packages/kernel/src/PSKernel/Verify/Obligations.ts`.
- Added `proofObligations`, `verifyProofObligationCatalog(...)`, and `proofObligationReport()`.
- The catalog currently exposes 38 obligations:
  - 28 `lean-proof-target` obligations.
  - 10 `informal-spec` obligations.
  - 0 proven obligations.
- Added catalog validation guards:
  - duplicate IDs reject;
  - empty source/target/symbol/relation/subset fields reject;
  - premature `proofStatus: proven` entries reject.
- Exported obligations from the active kernel entrypoint.
- Added Main entrypoints:
  - `pskernelProofObligations()`
  - `pskernelAuditCoreArtifact(...)`
- Added replay audit bundle support:
  - fresh replay summary;
  - deterministic replay certificate;
  - fresh certificate verification;
  - machine-readable proof-obligation report;
  - deterministic `auditSha256`.
- Added CLI commands/behavior:
  - `pskernel obligations --json`
  - `pskernel audit <artifact.json>`
- Added generated machine-readable docs snapshot:
  - `docs/PSKERNEL_TS_PROOF_OBLIGATIONS.json`
- Updated `pskernel status --json` to report 96% implementation-progress estimate and include obligation/audit support.

## Files changed

- `packages/kernel/src/PSKernel/Verify/Obligations.ts`
- `packages/kernel/src/PSKernel.ts`
- `packages/kernel/src/PSKernel/Replay.ts`
- `packages/kernel/src/Main.ts`
- `tools/pskernel.ts`
- `tools/pskernel-kernel-smoke.ts`
- `docs/PROOF_OBLIGATIONS.md`
- `docs/PSKERNEL_TS_PROOF_OBLIGATIONS.json`
- `PRODUCTION_P4_21_PSKERNEL_TS_OBLIGATION_AUDIT_BUNDLE_REPORT.md`

## Red-green evidence

Initial smoke failed before implementation because these exports did not exist:

- `proofObligationReport`
- `verifyProofObligationCatalog`
- `pskernelProofObligations`
- `pskernelAuditCoreArtifact`

After implementation, smoke covers:

- catalog validation accepts the built-in obligation catalog;
- catalog exposes at least 30 obligations;
- catalog does not claim any proven obligations;
- Main proof-obligation entry matches the direct report;
- CLI `obligations --json` exposes the same total;
- programmatic audit bundle accepts a replayable artifact;
- audit bundle verifies its own fresh certificate;
- audit bundle includes a deterministic SHA-256;
- CLI `audit` accepts the replayable artifact and emits a deterministic audit SHA-256.

## Commands run

```bash
npm run build -- --pretty false
npx tsc -b --force --pretty false
node tools/copy-static-assets.ts
npm run test:kernel:smoke
npm run pskernel -- status
node tools/pskernel.ts status --json
node tools/pskernel.ts check-core artifacts/pskernel-cli-check-core-smoke.json cli-smoke
node tools/pskernel.ts certify artifacts/pskernel-cli-certify-smoke.json
node tools/pskernel.ts verify-cert artifacts/pskernel-cli-verify-cert-smoke.json
node tools/pskernel.ts obligations --json
node tools/pskernel.ts audit artifacts/pskernel-cli-certify-smoke.json
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
pskernel obligations --json: PASS, total obligations = 38
pskernel audit: PASS, certificateVerification.status = accepted
```

## Supported slices after P4.21

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
- Machine-readable proof-obligation catalog.
- Deterministic replay audit bundle.
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
Previous overall: ~94%
Current overall: ~96%

Phase 2: ~99% complete
Phase 3: ~99% started
Phase 4: ~99% started
Phase 5: ~85% started
Phase 6: ~88% started
Phase 9: ~72% started via machine-readable proof-obligation/audit evidence
Trust label: trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet
```

## Notes

P4.21 improves auditability, not formal soundness. The standalone kernel now exposes replay evidence, certificate verification, and proof obligations in one machine-readable path. The remaining 4% toward a practical pre-proof milestone should focus on package integration and final fail-closed release gating, not on claiming Lean equivalence.

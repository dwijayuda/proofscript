# Production P4.19 — Replay Certificate and Metadata Cross-Check Report

## Trust label

ProofScript pskernel-derived TypeScript kernel; trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet.

## Goal

Deepen the standalone replay/checking path rather than expanding parser or frontend features. The kernel can now emit deterministic replay evidence for accepted artifacts and reject malformed or lying artifact metadata earlier.

## Changes

- Added deterministic `semanticSha256` to accepted `CheckSummary` values.
- Added `certifyCoreArtifact(artifact)` and `CoreReplayCertificate`.
- Added `pskernelCertifyCoreArtifact(...)` in `Main.ts`.
- Added CLI command:
  - `npm run pskernel -- certify <artifact.json>`
- Added replay term-shape validation for `lit` nodes:
  - Nat literals require nonnegative safe integers.
  - String literals require string payload shape, but still fail closed semantically in the trusted kernel slice.
- Added module metadata cross-checking after successful replay:
  - module `declarations` must reference checked declaration/generated/prelude names;
  - module `exports` must reference checked declaration/generated/prelude names.
- Updated `pskernel status --json` with certificate and module-cross-check slices.
- Added smoke cases for:
  - Nat literal replay acceptance with declared core prelude;
  - malformed Nat literal replay rejection;
  - accepted-artifact module metadata mismatch rejection;
  - CLI `certify` output containing deterministic semantic SHA-256.

## Files changed

- `packages/kernel/src/PSKernel/Replay.ts`
- `packages/kernel/src/Main.ts`
- `tools/pskernel.ts`
- `tools/pskernel-kernel-smoke.ts`
- `PRODUCTION_P4_19_PSKERNEL_TS_REPLAY_CERTIFICATE_REPORT.md`

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
```

## Supported kernel/replay features after this phase

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
- Deterministic trusted-boundary replay certificates with semantic SHA-256.
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
Previous overall: ~88%
Current overall: ~92%

Phase 2: ~99% complete
Phase 3: ~99% started
Phase 4: ~98% started
Phase 5: ~82% started
Phase 6: ~72% started
Phase 9: ~45% started via certificate/proof-obligation evidence
Trust label: trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet
```

## Notes

The new certificate hash is deterministic replay evidence only. It is not a formal proof. Formal equivalence to Lean 4 remains a later proof target.

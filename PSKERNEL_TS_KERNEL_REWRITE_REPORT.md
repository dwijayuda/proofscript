# pskernel TypeScript Kernel Rewrite Report

## Phase

Phase 1 completed and Phase 2 started.

## Status

The active `@proofscript/kernel` package now uses a pskernel-derived TypeScript mirror under `packages/kernel/src/PSKernel/**`.

The previous compact K3-TB kernel source was removed from the active package source tree and preserved as historical evidence at:

```txt
legacy/kernel-k3tb-v71/src
```

## Files created/changed

Created/updated:

```txt
docs/PSKERNEL_TS_REWRITE_FINDINGS.md
docs/PSKERNEL_TS_PORTING_MAP.md
docs/PSKERNEL_TS_PHASE_PLAN.md
docs/PROOF_OBLIGATIONS.md
docs/TRUST_BOUNDARY.md
docs/superpowers/plans/2026-09-10-pskernel-ts-kernel-rewrite.md
packages/kernel/src/PSKernel.ts
packages/kernel/src/Main.ts
packages/kernel/src/PSKernel/**/*.ts
tools/pskernel-kernel-smoke.ts
```

Quarantined old implementation:

```txt
legacy/kernel-k3tb-v71/src/core.ts
legacy/kernel-k3tb-v71/src/index.ts
legacy/kernel-k3tb-v71/src/inductive.ts
legacy/kernel-k3tb-v71/src/kernel.ts
legacy/kernel-k3tb-v71/src/level.ts
legacy/kernel-k3tb-v71/src/quotient.ts
legacy/kernel-k3tb-v71/src/runner.ts
```

Removed from active kernel package source:

```txt
packages/kernel/src/core.ts
packages/kernel/src/inductive.ts
packages/kernel/src/kernel.ts
packages/kernel/src/level.ts
packages/kernel/src/quotient.ts
packages/kernel/src/runner.ts
```

## Implemented kernel slice

Partial pskernel-derived implementation exists for:

```txt
Name
Level
Expr / Term compatibility surface
Declaration / ConstantInfo
LocalContext
Environment/Basic
Environment admission skeleton
TypeChecker skeleton
infer
check
whnf / kernelWhnf
isDefEq / defEq
Level instantiation
Term level instantiation
Expression traversal
Replay/check summary
```

## Explicit fail-closed areas

Still unsupported/fail-closed:

```txt
full quotient reduction
full inductive recursor reduction
full primitive reflection
full Lean parser
full elaborator
full macro/tactic system
full .olean replay
full formal equivalence to Lean 4
```

## Proof obligations

`docs/PROOF_OBLIGATIONS.md` contains mirrored obligations for pskernel `Theory/` and `Verify/` files. These are not TypeScript proofs.

## Commands run

```bash
npm install --ignore-scripts
npm run build -- --pretty false
npm run test:kernel:smoke
```

## Results

```txt
npm run build: PASS
npm run test:kernel:smoke: PASS
```

## Completion

Phase 0: 100% complete.
Phase 1: 100% complete.
Phase 2: approximately 45% complete.
Overall project completion: approximately 18%.

## Trust label

```txt
ProofScript pskernel-derived TypeScript kernel
trusted-boundary standalone kernel
not fully formally equivalent to Lean 4 yet
```

## Next phase

Continue Phase 2 until the core ADTs and admission behavior are better aligned with the source `pskernel` definitions, then move into Phase 3 TypeChecker conformance.


---

## Update: P2 core hardening pass

See `PRODUCTION_P2_PSKERNEL_TS_CORE_HARDENING_REPORT.md`.

Additional completed work:

```txt
Level mvar representation with fail-closed rejection
Level traversal and undefined-parameter detection
Declaration type-is-type validation
Loose de Bruijn rejection before admission
Assumption propagation through checked declarations
Duplicate generated declaration rejection
Inductive result-type validation
PSKernel Expr helper functions
TypeChecker pskernel naming aliases
Clean rebuild of packages/kernel/dist without stale old kernel outputs
```

Latest commands:

```bash
npm run build -- --pretty false
npx tsc -b --force --pretty false
node tools/copy-static-assets.ts
npm run test:kernel:smoke
```

Latest result:

```txt
build: PASS
test:kernel:smoke: PASS
```

Updated progress:

```txt
Phase 2: ~70% complete
Phase 3: ~15% started
Overall: ~24%
Trust label: trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet
```

## Latest continuation

- `PRODUCTION_P3_PSKERNEL_TS_ADMISSION_DEFEQ_REPORT.md` records the latest admission/definitional-equality hardening pass.
- Overall progress is now estimated at ~28%.


---

## Update: P4 replay/admission fail-closed hardening pass

See `PRODUCTION_P4_PSKERNEL_TS_REPLAY_FAIL_CLOSED_REPORT.md`.

Additional completed work:

```txt
Generated recursor placeholder typing removed
Generated recursors remain registered but fail closed on inference/use
Replay artifact format validation added
Replay Lean semantic-baseline validation added
Replay declaration/term/level shape validation added
Malformed artifacts now reject instead of implementation-erroring
```

Latest commands:

```bash
npm run build -- --pretty false
npm run test:kernel:smoke
```

Latest result:

```txt
build: PASS
test:kernel:smoke: PASS
```

Updated progress:

```txt
Phase 2: ~86% complete
Phase 3: ~32% started
Phase 4: ~18% started
Phase 6: ~12% started
Overall: ~31%
Trust label: trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet
```

## P4.2 Update — Admission Shape and Constructor Telescope Hardening

- Added direct declaration shape validation before `checkAndAddDeclaration` performs semantic checking.
- Added `EnvironmentCore.fork()` for temporary inductive pre-environments.
- Constructor types now must infer to Sort/Type after provisional family constants are available.
- Direct malformed declarations now reject instead of producing implementation errors.
- Direct inductive `numParams` / `numIndices` now reject when negative or unsafe.
- Smoke tests added for malformed direct terms, invalid binderInfo, constructor telescope domain validity, constructor universe arity, and negative inductive counters.
- Fresh verification: `npm run build -- --pretty false` PASS; `npm run test:kernel:smoke` PASS.
- Current overall progress: ~34%.
- Trust label remains trusted-boundary standalone, not fully formally equivalent to Lean 4.


## P4.3 update — positivity and quotient guards

Added inductive family telescope arity/codomain guards, constructor target argument-count checks, conservative negative-recursion rejection, and quotient initialization fail-closed guards. `PSKernel/Quot.ts` now carries the quotient primitive type generator shape. Fresh `npm run build -- --pretty false` and `npm run test:kernel:smoke` passed after the changes.

Trust label remains: trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet.


---

## Update: P4.4 primitive prelude bootstrap

See `PRODUCTION_P4_4_PSKERNEL_TS_PRIMITIVE_PRELUDE_BOOTSTRAP_REPORT.md`.

Additional completed work:

```txt
Primitive prelude declaration generators added for Unit, Bool, Nat, and Eq
Canonical quotient initialization now has a positive smoke path after Eq is admitted
installCorePrimitives(env, { quotients }) routes prelude declarations through normal kernel admission
Nat.zero / Nat.succ constructor admission smoke added
String/UInt/Float/native primitive reflection remains unsupported/fail-closed
```

Latest commands:

```bash
npm run build -- --pretty false
npm run test:kernel:smoke
```

Latest result:

```txt
build: PASS
test:kernel:smoke: PASS
```

Updated progress:

```txt
Phase 2: ~91% complete
Phase 3: ~43% started
Phase 4: ~41% started
Phase 5: ~20% started
Overall: ~40%
Trust label: trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet
```

---

## P4.5 update — deterministic replay prelude

See `PRODUCTION_P4_5_PSKERNEL_TS_REPLAY_PRELUDE_REPORT.md`.

Additional completed work:

```txt
CoreArtifact now supports optional deterministic prelude profiles: none, core, core+quot
replayCoreArtifact installs the declared primitive prelude before artifact declarations
Nat-using replay rejects without declared prelude and accepts with prelude: core
core+quot replay installs quotient primitives deterministically after Eq/Eq.refl admission
unknown prelude profiles fail closed
checkCoreDeclarationsWithPrelude helper added
```

Latest commands:

```bash
npm run build -- --pretty false
npm run test:kernel:smoke
```

Latest result:

```txt
build: PASS
test:kernel:smoke: PASS
```

Updated progress:

```txt
Phase 2: ~92% complete
Phase 3: ~44% started
Phase 4: ~44% started
Phase 5: ~23% started
Phase 6: ~20% started
Overall: ~42%
Trust label: trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet
```


## Phase 4.6 — replay and recursor metadata hardening

- Added constructor-derived generated recursor metadata with field count and direct recursive field bitmap.
- Propagated recursor metadata into both checked entries and `recInfo` constant metadata.
- Added exported Main entry functions: `pskernelStatus` and `pskernelCheckCore`.
- Added `tools/pskernel.ts` CLI and root `npm run pskernel` script.
- Hardened replay validation for typeclass and module metadata.
- Recursor use remains fail-closed until real Lean-style recursor typing/reduction is implemented.
- Fresh checks passed: `npm run build -- --pretty false`, forced `tsc`, `npm run test:kernel:smoke`, and `npm run pskernel -- check-core`.

Progress after this pass: overall ~45%; trust label remains trusted-boundary standalone, not fully formally equivalent to Lean 4 yet.

---

## Phase 4.7 — simple non-indexed recursor type synthesis

See `PRODUCTION_P4_7_PSKERNEL_TS_SIMPLE_RECURSOR_TYPE_REPORT.md`.

Additional completed work:

```txt
Generated recursors for the smallest safe non-indexed/non-parameterized slice now receive synthesized types.
UnitLike.rec, ClosedRecursorFamily.rec, PositiveRecursiveMeta.rec, and primitive Nat.rec now infer successfully with an explicit motive universe argument.
Direct recursive constructor fields now generate induction-hypothesis premises in the minor-premise telescope.
Parameterized/indexed/mutual/nested/dependent recursors remain fail-closed with KernelUnsupportedError.
Recursor metadata status now distinguishes typed-simple-nonindexed from stubbed.
```

Latest commands:

```bash
npm run build -- --pretty false
npm run test:kernel:smoke
npx tsc -b --force --pretty false
node tools/copy-static-assets.ts
npm run test:kernel:smoke
npm run pskernel -- status
npm run pskernel -- check-core artifacts/pskernel-cli-check-core-smoke.json cli-smoke
```

Latest result:

```txt
build: PASS
test:kernel:smoke: PASS
forced tsc rebuild: PASS
pskernel status: PASS
pskernel check-core: PASS
```

Updated progress:

```txt
Phase 2: ~94% complete
Phase 3: ~50% started
Phase 4: ~52% started
Phase 5: ~30% started
Phase 6: ~32% started
Overall: ~48%
Trust label: trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet
```

## P4.8 update — simple recursor iota reduction

Implemented conservative iota-reduction for generated `typed-simple-nonindexed` recursors. This reduces fully applied simple recursors when the major premise WHNF is a known constructor and constructor arity matches metadata. Direct recursive fields receive recursive-call induction hypotheses.

Fresh verification passed:

```bash
npm run build -- --pretty false
npx tsc -b --force --pretty false
node tools/copy-static-assets.ts
npm run test:kernel:smoke
npm run pskernel -- status
npm run pskernel -- check-core artifacts/pskernel-cli-check-core-smoke.json cli-smoke
```

Overall progress: ~51%.
Trust label remains: trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet.

## Phase 4.9 — Type-aware simple recursor iota guard

- Added a type-correctness predicate to simple recursor iota reduction.
- `whnfCore` now checks a recursor application against synthesized `recInfo.type` before reducing.
- Malformed raw recursor applications remain neutral instead of reducing through arbitrary minor terms.
- Smoke tests now cover a malformed UnitLike.rec application that must not iota-reduce.
- Fresh verification: build PASS, forced tsc rebuild PASS, smoke PASS, pskernel status PASS, pskernel check-core PASS.
- Trust label remains trusted-boundary standalone, not fully formally equivalent to Lean 4 yet.

Progress: overall ~53%.

## Phase 4.10 — Theorem Prop guard and theorem delta unfolding

- Added a theorem/example Prop guard: theorem-like declarations must have type whose inferred type is definitionally equal to `Prop` / `Sort 0`.
- Fixed delta reduction to include theorem values, matching pskernel's `ConstantInfo.deltaValue?` behavior for definitions and theorems while preserving opaque non-unfolding.
- Added red-green smoke tests: non-Prop theorem rejection failed before the implementation and passes after the fix; theorem `whnf` unfolding now passes.
- Fresh verification: build PASS, forced tsc rebuild PASS, smoke PASS, pskernel status PASS, pskernel check-core PASS.
- Report: `PRODUCTION_P4_10_PSKERNEL_TS_THEOREM_DELTA_PROP_REPORT.md`.

Progress: overall ~55%.
Trust label remains: trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet.

## Phase 4.11 — Transparency policy and delta arity guard

- Added exported `TransparencyMode = "reducible" | "default" | "all"`.
- Threaded the configured `TypeChecker` transparency option through instance `infer`, `check`, `whnf`, and `isDefEq`.
- Added `whnfWithTransparency` and `defEqWithTransparency` helpers.
- Added conservative unfolding behavior: abbrevs unfold at `reducible`, regular definitions at `default`/`all`, theorem values at `default`/`all`, opaques never unfold.
- Added delta arity guard so malformed constants with the wrong number of universe arguments remain neutral instead of unfolding.
- Fresh verification: build PASS, forced tsc rebuild PASS, smoke PASS, pskernel status PASS, pskernel check-core PASS.
- Report: `PRODUCTION_P4_11_PSKERNEL_TS_TRANSPARENCY_DELTA_ARITY_REPORT.md`.

Progress: overall ~57%.
Trust label remains: trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet.

## P4.12 Deep TypeChecker + Admission Boundary Batch

Added conservative proof-irrelevance to definitional equality, constructor codomain universe-argument validation, and uniform family-parameter checking for constructor targets. This pass intentionally batched several high-trust changes to move progress deeper than prior 1–2% slices while preserving fail-closed behavior for unsupported advanced Lean features.

Report: `PRODUCTION_P4_12_PSKERNEL_TS_DEEP_TYPECHECKER_ADMISSION_REPORT.md`

## P4.13 — Cumulativity, let-type validation, quotient reduction, and replay hardening

This pass intentionally batches several high-value kernel/trust-boundary changes instead of a small metadata increment.

Implemented:

- sort-level cumulativity in `checkCore` for `Sort u` checked against `Sort v` when `v >= u`;
- validation that trusted Core `let` annotation types themselves infer to `Sort` before the bound value is accepted;
- exact replay `CoreArtifact.formatVersion` gating at version `1`;
- stricter typeclass replay metadata validation for parameter counts, duplicate class/instance names, and missing class references;
- stricter module metadata validation for duplicate serialized module names and missing entry modules;
- first conservative quotient computation rules for `Quot.lift` and `Quot.ind` over `Quot.mk`, guarded by installed `quotInfo` metadata and ordinary type checking.

Report: `PRODUCTION_P4_13_PSKERNEL_TS_CUMULATIVITY_QUOTIENT_REPLAY_REPORT.md`

Updated progress:

```txt
Phase 2: ~97% complete
Phase 3: ~75% started
Phase 4: ~76% started
Phase 5: ~50% started
Phase 6: ~40% started
Overall: ~68%
Trust label: trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet
```

## P4.14 — Parameterized simple recursor types and iota reduction

This pass expands the recursor slice from only closed non-indexed families to simple non-indexed families with nondependent uniform parameters. It intentionally does not open indexed, mutual, nested/container, dependent-parameter, dependent-field, or higher-order recursor cases.

Implemented:

- parameterized `synthesizeSimpleRecursorType` for uniform nondependent parameters;
- recursor metadata fields `numParams` and `numIndices`;
- constructor field counts after dropping uniform family parameters;
- parameter-aware iota reduction for `params + motive + minors + major` recursor applications;
- structural matching of recursor parameters against constructor major-premise parameters before iota reduction;
- smoke coverage for `Box.rec` type synthesis and reduction over `Box.mk Nat Nat.zero`.

Report: `PRODUCTION_P4_14_PSKERNEL_TS_PARAMETERIZED_RECURSORS_REPORT.md`

Fresh verification: build PASS, forced tsc rebuild PASS, smoke PASS, pskernel status PASS, pskernel check-core PASS.

Updated progress:

```txt
Phase 2: ~98% complete
Phase 3: ~82% started
Phase 4: ~82% started
Phase 5: ~60% started
Phase 6: ~42% started
Overall: ~72%
Trust label: trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet
```

## P4.15 — Simple structure projections, List-like recursive recursors, and CLI status report

This pass intentionally batches several deeper kernel/trust-boundary changes instead of another small metadata increment.

Implemented:

- raw projection typing for the smallest safe structure slice:
  - one inductive family;
  - exactly one constructor;
  - no indices;
  - nondependent fields except references to uniform family parameters;
  - projection field type instantiated from the major premise family parameters and universe levels.
- raw projection iota reduction for constructor major premises:
  - `proj Box 0 (Box.mk Nat Nat.zero)` reduces to `Nat.zero` in the supported slice.
- projection participation in definitional equality through `whnf`.
- fail-closed/neutral behavior for unsupported projection cases:
  - indexed projections;
  - multi-constructor projections;
  - out-of-range projections;
  - dependent-field projections.
- added List-like parameterized recursive smoke coverage:
  - `ListLike.rec` metadata marks the tail field as directly recursive;
  - recursive iota calls participate in definitional equality.
- added precise indexed-family recursor fail-closed smoke coverage.
- added `pskernelStatusReport()` and `pskernel status --json` so the standalone kernel reports supported and fail-closed slices without claiming formal equivalence.

Report: `PRODUCTION_P4_15_PSKERNEL_TS_PROJECTION_RECURSOR_STATUS_REPORT.md`

Updated progress:

```txt
Phase 2: ~98% complete
Phase 3: ~88% started
Phase 4: ~88% started
Phase 5: ~66% started
Phase 6: ~50% started
Overall: ~76%
Trust label: trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet
```


## P4.17 update — Nat literal and simple structure eta

- Added trusted Core `lit` terms to the public Term ADT.
- Nat literals now infer `Nat`, WHNF-normalize to Nat constructors, and participate in definitional equality.
- String literals remain fail-closed unsupported.
- Added simple single-constructor structure eta for projection-supported structures.
- Updated pskernel status estimate to 84%.
- Verification: build, forced tsc rebuild, smoke, pskernel status/status --json/check-core all pass after implementation.



## P4.18 update — special Eq recursor type and refl iota

- Added canonical `Eq.rec` type synthesis for the small indexed equality slice.
- Added `typed-eq-indexed` recursor metadata.
- Added refl-iota reduction for `Eq.rec α a motive reflCase a (Eq.refl α a)`.
- Non-refl equality proofs and general indexed recursors remain neutral/unsupported.
- Updated pskernel status estimate to 88%.
- Verification: build, forced tsc rebuild, smoke, pskernel status/status --json/check-core pass after implementation.

---

## Phase 4.19 — Replay Certificate and Metadata Cross-Check

Added deterministic accepted-summary `semanticSha256`, `certifyCoreArtifact`, `pskernel certify`, replay `lit` shape validation, and module metadata cross-checking against actually checked declaration/generated/prelude names.

Fresh verification:

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

Result: PASS.

Overall progress estimate: ~92%.
Trust label remains: trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet.

---

## Phase 4.20 — Replay Certificate Verification

Added certificate verification by fresh replay. Certificates now include both artifact SHA-256 and semantic SHA-256. The CLI gained `pskernel verify-cert <certificate-bundle.json>`, where the bundle contains `{ artifact, certificate }`.

Fresh verification:

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

Result: PASS.

Overall progress estimate: ~94%.
Trust label remains: trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet.

## P4.21 update — machine-readable proof obligations and audit bundles

- Added `packages/kernel/src/PSKernel/Verify/Obligations.ts`.
- Added programmatic proof-obligation report and catalog validation.
- Added `pskernelProofObligations()` and `pskernelAuditCoreArtifact(...)` Main entrypoints.
- Added `pskernel obligations --json` and `pskernel audit <artifact.json>` CLI support.
- Added deterministic audit bundle evidence combining replay, certificate, fresh certificate verification, and obligations.
- Added `docs/PSKERNEL_TS_PROOF_OBLIGATIONS.json`.
- Trust label remains trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet.
- Overall progress estimate: ~96%.

---

# P4.22 Update — Release Preflight Mirror/Audit Gate

Added a standalone preflight gate for the pskernel-derived TypeScript kernel. The gate validates the 112-file pskernel mirror recorded in the porting map, checks every mirrored target for portStatus/not-proven metadata, confirms active package entrypoints and legacy dist-file absence, validates the proof-obligation catalog, and checks deterministic audit-bundle output.

Fresh result:

```txt
PSKERNEL_TS_KERNEL_PREFLIGHT=PASS
checks=24
warnings=0
failures=0
preflightSha256=a220533b56d2cc1b657c16520fa090b446af9b6d18462e27c96ee99855dd26ed
```

Current overall estimate: ~98% trusted-boundary standalone readiness. Full Lean 4 kernel equivalence is still not claimed.

## Production P4.23 — Package Audit Evidence

Added publish-oriented package audit for the pskernel-derived TypeScript kernel.
The package audit validates that `@proofscript/kernel` npm contents include built
entrypoints plus trust-boundary/proof-obligation evidence docs, while excluding
legacy compact-kernel files.

Fresh result:

```txt
package-audit: PASS
checks: 22
failures: 0
packageAuditSha256: 3d6ecd11484446a0ab250eec16acb6d9a1f6f8f85c14ffb2861dfd443cb80762
preflight checks after package audit integration: 25
preflight failures: 0
preflightSha256: 0ecb5259ade2927210f3756836c6d26a20a8b746c697f8e77313fcffc5c8eee7
packed artifact: artifacts/proofscript-kernel-0.1.0-dev.0.tgz
```

Overall progress estimate: ~99%.
Trust label remains trusted-boundary standalone; not fully formally equivalent
to Lean 4 yet.

## Phase 4.24 — Tarball Install Smoke / Publish-Use Evidence

Added an install-from-tarball release gate for the pskernel-derived trusted-boundary kernel.

The new gate packs `@proofscript/kernel`, installs the `.tgz` into a fresh temporary project, imports the installed package from `dist`, and runs status/replay/certificate/check/proof-obligation API smoke. This catches packaging errors that local monorepo build and dry-run package audit cannot catch.

Verification:

```txt
npm run build -- --pretty false: PASS
npx tsc -b --force --pretty false: PASS
node tools/copy-static-assets.ts: PASS
npm run test:kernel:smoke: PASS
node tools/pskernel.ts preflight: PASS
node tools/pskernel.ts package-audit: PASS
node tools/pskernel.ts tarball-smoke: PASS
node tools/pskernel.ts package-audit --json --pack-destination artifacts: PASS
```

Progress: overall practical trusted-boundary release readiness remains ~99%; formal Lean 4 equivalence remains not claimed.

## Phase 4.25 — Deterministic Release Manifest / Reproducible Evidence

Fixed a release-evidence determinism issue in the tarball install-smoke gate: accepted runs previously included temporary install paths and npm timing output in the hashed manifest. The packed tarball SHA-256 was stable, but the tarball-smoke evidence hash was not stable across repeated accepted runs.

Added a deterministic release manifest gate that ties together trusted-boundary status, proof obligations, preflight, package audit, install-from-tarball smoke, standalone audit, evidence-file hashes, and packed tarball SHA-256.

Fresh result:

```txt
release-manifest: PASS
checks: 9
failures: 0
releaseManifestSha256: 28a424db277a7517102808df5589a5e48594b3a05c211bec370e41574f8a32de
tarballSmokeSha256: e5046da8811c4b33414e15e65ddde10061bd3107a64bcb4c0659494fe03e3f8d
packed tarball SHA-256: 23d9fe1acb1e4f89d9c410acdd4124aacc9fefc234570b79e78b561aa00e2948
proof obligations: 42 total, 0 proven
```

Overall practical trusted-boundary release readiness remains ~99%; formal Lean 4 equivalence remains not claimed.

## P4.28 — Standalone PSC-1 rfl theorem smoke

Standalone `.ps` now accepts theorem/example proof blocks of exactly `by { rfl }`, elaborates them to checked `Eq.refl` proof terms, rejects non-definitional equality such as `2 = 3`, and still emits executable JS for definitions while skipping proof declarations as non-executable.

Trust label remains trusted-boundary standalone small subset; not fully formally equivalent to Lean 4 yet.

---

## P4.38 update — Nat literal/catch-all match execution

See `PRODUCTION_P4_38_NAT_MATCH_EXECUTION_REPORT.md`.

Added executable PSC-1 Nat match slice:

```ts
function isZeroMatch(n: Nat): Bool := {
  match (n) {
    | 0 => true
    | _ => false
  }
}
```

Completed work:

```txt
backend-typescript emits checked Nat.rec applications as __ps.Nat_rec(...)
runtime exposes Nat_rec bounded primitive recursion helper
standalone-small example includes isZeroMatch and rfl theorems
pslive smoke includes Nat match runtime checks
reference governance includes positive and negative Nat match fixtures
non-exhaustive Nat match rejects
semicolon-terminated Nat match branch rejects
```

Verification summary:

```txt
build: PASS
standalone-small: PASS
pslive check/build-js/run: PASS
reference-governance: PASS, checks=29
governance: PASS, checks=27, warnings=0, failures=0
pskernel preflight/package-audit/tarball-smoke: PASS individually
release-manifest heavyweight path: attempted but timed out/langered in sandbox, not counted as PASS
```

Updated progress:

```txt
Standalone PSC-1 without Lean4: ~88%
PSC-1 small complete programming language: ~58%
PSC-1 small theorem prover: ~54%
Full ProofScript compiler: ~49%
Full Lean-like ProofScript without Lean4: ~9%
Formal Lean 4 equivalence: 0 proven obligations
```

Trust label remains trusted-boundary standalone; not fully formally equivalent to Lean 4 yet.


---

## P4.39 update — deterministic environment snapshot evidence

See `PRODUCTION_P4_39_ENVIRONMENT_SNAPSHOT_REPORT.md`.

Added:

```txt
EnvironmentCore.constantInfos()
EnvironmentSnapshot / SnapshotReplaySummary
snapshotEnvironment(env, { label })
checkCoreDeclarationsWithSnapshot(...)
replayCoreArtifactWithSnapshot(...)
pskernelSnapshotCoreArtifact(...)
pskernel snapshot <artifact.json>
ProofScript.Replay.EnvironmentSnapshot.Deterministic proof obligation
```

Also guarded package/tarball checks in default kernel smoke behind `PS_KERNEL_SMOKE_RELEASE=1`, while keeping release-manifest behind `PS_KERNEL_SMOKE_HEAVY=1`.

Fresh checks passed:

```txt
npm run build -- --pretty false
npm run test:kernel:smoke
npm run test:standalone-small
npm run test:reference-governance
npm run test:governance
node tools/pskernel.ts snapshot artifacts/pskernel-cli-certify-smoke.json
node tools/pskernel.ts package-audit --json
node tools/pskernel.ts tarball-smoke --json
```

Updated progress:

```txt
Standalone PSC-1 without Lean4: ~89%
PSC-1 small complete programming language: ~58%
PSC-1 small theorem prover: ~55%
Full ProofScript compiler: ~50%
Full Lean-like ProofScript without Lean4: ~10%
Formal Lean 4 equivalence: 0 proven obligations
```

Trust label remains trusted-boundary standalone; not fully formally equivalent to Lean 4 yet.

## P4.40 update — environment snapshot certificate binding

P4.40 binds deterministic final environment snapshots into replay certificates.

Completed:

```txt
CoreReplayCertificate.environmentSha256 added
CoreReplayCertificateVerification.environmentSha256 added
certifyCoreArtifact now certifies from replayCoreArtifactWithSnapshot
validateCoreReplayCertificate requires environmentSha256
verifyCoreReplayCertificate rejects forged or missing environmentSha256
pskernel certify emits environmentSha256
pskernel verify-cert returns verified environmentSha256
proof obligation ProofScript.Replay.Certificate.EnvironmentSnapshotBinding added
```

Latest verification:

```txt
build: PASS
kernel smoke: PASS
standalone-small: PASS
reference-governance: PASS, checks=29
governance: PASS, checks=27, warnings=0, failures=0
pskernel certify: PASS
pskernel verify-cert: PASS
package-audit: accepted, failures=0
tarball-smoke: accepted, failures=0
```

Trust label remains trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet.

---

## P4.41 update — deterministic certificate bundle verification

Added a canonical replay certificate bundle that binds the CoreArtifact, replay certificate, certificate verification, final environment snapshot, audit hash, and bundle hash. Added `pskernel bundle` and `pskernel verify-bundle` CLI commands. Added bundle validation and tamper checks for forged bundle hashes and forged environment snapshots.

Fresh verification passed:

```txt
build
kernel smoke
standalone-small
reference-governance
governance
pskernel bundle
pskernel verify-bundle
package-audit
tarball-smoke
```

Progress after this pass: standalone PSC-1 without Lean4 ~91%; PSC-1 small theorem prover ~57%; full Lean-like ProofScript without Lean4 ~10%; formal Lean 4 equivalence still 0 proven obligations.

---

## P4.42 update — obligation hash binding in certificate bundles

See `PRODUCTION_P4_42_OBLIGATION_HASH_BUNDLE_REPORT.md`.

Additional completed work:

```txt
CoreReplayAuditBundle.obligationsSha256 added
CoreReplayCertificateBundle.obligationsSha256 added
CoreReplayCertificateBundleVerification.obligationsSha256 added
Bundle creation now exposes the proof-obligation catalog hash explicitly
Bundle verification rejects forged/stale obligation hashes by fresh replay/rebundle
Proof obligation added: ProofScript.Replay.CertificateBundle.ObligationCatalogBinding
```

Latest result:

```txt
build: PASS
kernel smoke: PASS
standalone-small: PASS
reference-governance: PASS, checks=29
governance: PASS, checks=27, warnings=0, failures=0
pskernel bundle: PASS
pskernel verify-bundle: PASS
package-audit: accepted, failures=0
tarball-smoke: accepted, failures=0
```

Progress after this pass:

```txt
Standalone PSC-1 without Lean4: ~91.5%
PSC-1 small complete programming language: ~60%
PSC-1 small theorem prover: ~57.5%
Full ProofScript compiler: ~52.5%
Full Lean-like ProofScript without Lean4: ~10%
Formal Lean 4 equivalence: 0 proven obligations
```

Trust label remains trusted-boundary standalone, not fully formally equivalent to Lean 4.

---

## P4.43 update — release manifest certificate-bundle binding

See `PRODUCTION_P4_43_RELEASE_MANIFEST_CERTIFICATE_BUNDLE_BINDING_REPORT.md`.

Additional completed work:

```txt
Release manifest now binds deterministic certificate bundle evidence.
Release manifest component hashes include certificateBundleSha256, certificateBundleAuditSha256, certificateBundleObligationsSha256, and certificateBundleEnvironmentSha256.
Release manifest generation checks certificate bundle verification, repeated bundle determinism, audit-hash agreement, and obligation-hash agreement.
Added verify-release-manifest CLI shape/self-hash verifier with optional fresh evidence comparison.
Added proof obligation: ProofScript.Release.Manifest.CertificateBundleBinding.
```

Trust label remains: trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet.


P4.43 final observed releaseManifestSha256: `5de43d5c2d8162b6469dfa2e4282ee30ce3599d44f3510e36d1f91a8b2112bc4`.
P4.43 final observed certificateBundleSha256: `2e24c317c5e5d98df7f35c11b8e5b782902b151c2648c0cfacc5da5210f27d4d`.

---

## P4.44 update — release fresh-bound verification and hermetic tools

See `PRODUCTION_P4_44_RELEASE_FRESH_BOUND_HERMETIC_TOOLS_REPORT.md`.

Completed:

```txt
fresh-unzip tool resolution for @proofscript/* workspace packages without node_modules symlinks
deterministic reference-governance hashing by scrubbing random temp paths
bounded release preflight used by release-manifest generation by default
verify-release-manifest --fresh now performs deterministic fresh-bound verification
heavy fully regenerative release verification remains behind --fresh --heavy
```

Fresh checks passed:

```txt
npm run build -- --pretty false
npm run test:kernel:smoke
npm run test:standalone-small
npm run test:reference-governance
npm run test:governance
node tools/pskernel.ts status
node tools/pskernel.ts package-audit --json
node tools/pskernel.ts tarball-smoke --json --pack-destination /tmp/p44tarfinal3
node tools/pskernel.ts verify-release-manifest /tmp/p44_manifest4.json --json --fresh
```

Current progress estimate:

```txt
Standalone PSC-1 without Lean4: ~92.5%
PSC-1 small complete programming language: ~60.5%
PSC-1 small theorem prover: ~58.5%
Full ProofScript compiler: ~53.5%
Full Lean-like ProofScript without Lean4: ~10.5%
Formal Lean 4 equivalence: 0 proven obligations
```


## P4.45 — release source tree binding

- Added deterministic release-critical source tree evidence.
- Added `tools/pskernel-kernel-source-tree.ts`.
- Added `pskernel source-tree` and `pskernel verify-source-tree`.
- Release manifest now binds `componentHashes.sourceTreeSha256`.
- Fresh-bound release verification recomputes sourceTreeSha256 from the current workspace.
- Forged source-tree evidence rejects.
- Fresh verification passed for build, kernel smoke, standalone-small, reference-governance, governance, source-tree, verify-source-tree, release-manifest, verify-release-manifest --fresh, package-audit, and tarball-smoke.
- Trust label remains trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet.

Observed sourceTreeSha256: `35a7adc75b19a0f3223f584d59cf6f3016d1046c519bc5105ef4f33a5164b0c5`.

Progress after this pass: Standalone PSC-1 without Lean4 ~92.7%; PSC-1 small theorem prover ~58.7%; full Lean-like ProofScript without Lean4 ~10.7%; formal Lean 4 equivalence: 0 proven obligations.

## P4.46 — release source archive binding

P4.46 added deterministic source-archive evidence and bound it into release-manifest verification. The new `tools/pskernel-kernel-release-archive.ts` creates a fixed-timestamp zip over the release-critical source-tree profile, emits archive/payload/source-tree hashes, and verifies the archive against the fresh workspace. `pskernel source-archive` and `pskernel verify-source-archive` expose this path. Release manifests now bind `releaseArchiveSha256`, `releaseArchiveZipSha256`, `releaseArchivePayloadSha256`, and `releaseArchiveSourceTreeSha256`.

Trust label remains trusted-boundary standalone, not fully formally equivalent to Lean 4.

## P4.47 — fresh-extract delivery verification

Added local workspace bootstrap and bounded delivery verification.

- `npm run build` now first links local `@proofscript/*` workspace packages, so a fresh extracted release can build without prior `node_modules` symlinks.
- Added `tools/link-local-workspaces.cts` and `pskernel bootstrap-local-workspaces`.
- Added `tools/pskernel-kernel-delivery-verify.ts` and `pskernel verify-delivery`.
- Added delivery verification evidence docs at the root release-evidence layer.
- Kept self-referential delivery/source-tree docs out of package evidence lists to avoid circular source-tree hashes.

Fresh status: bounded delivery verification accepts with zero required failures. Trust label remains trusted-boundary standalone, not fully formally equivalent to Lean 4.

## P4.48 — delivery-bootstrap release-manifest binding

Added a manifestless delivery-bootstrap evidence layer and bound it into the deterministic release manifest. This avoids circularly binding the full delivery verifier, because full delivery verification itself runs release-manifest verification.

New evidence and commands:

```txt
tools/pskernel-kernel-delivery-bootstrap.ts
node tools/pskernel.ts delivery-bootstrap --json
npm run test:release-manifest-delivery-binding
```

Release manifests now include:

```txt
componentHashes.deliveryBootstrapSha256
componentSummaries.deliveryBootstrap
```

Fresh-bound release-manifest verification recomputes `deliveryBootstrapSha256` and rejects forged delivery-bootstrap hashes. Package audit and tarball smoke now also require `docs/PSKERNEL_TS_DELIVERY_BOOTSTRAP.json` in the kernel package.

Trust label remains trusted-boundary standalone, not fully formally equivalent to Lean 4.

## P4.49 — Delivery Archive Fresh-Extract Verification

- Added `verify-delivery-archive <zip>` for bounded fresh extraction of a distributed release archive.
- The verifier extracts the zip, bootstraps local workspaces, builds, checks trusted-boundary kernel status, runs standalone-small, delivery-bootstrap, and source-tree evidence from inside the extracted project.
- Added `ProofScript.Release.Delivery.ArchiveFreshExtractVerification` to the trusted-boundary obligation catalog.
- Package audit and tarball smoke now require `PSKERNEL_TS_DELIVERY_ARCHIVE_VERIFICATION.json` in package docs.
- Status remains trusted-boundary / not fully formally equivalent to Lean 4 yet.

## P4.50 — Multi-Literal Nat Match Desugaring

P4.50 extends PSC-1 Nat matches from only `0 | _` into bounded finite numeric literal alternatives such as `0`, `1`, `2`, plus final `_`. The parser records positive numeric alternatives as `natLit`; the elaborator desugars them into nested `Nat.zero` / `Nat.succ` constructor matches and checked `Nat.rec` applications. Duplicate literal alternatives, missing catch-all, too-large literal desugaring, and mixed positive literal/constructor Nat matches remain fail-closed. The runtime feature manifest, standalone-small smoke, reference-governance smoke, examples, and proof-obligation catalog were updated. No full Lean equivalence is claimed.

## P4.51 — Lean-style Constructor Pattern Binders

Added PSC-1 support for Lean-style constructor pattern binders such as `Nat.succ k` and scrutinee-type-scoped `succ k` inside supported match expressions. The parser now accepts space-separated constructor pattern binders, the elaborator resolves simple unqualified constructors against the matched inductive type, and smoke/governance examples verify both executable behavior and rfl theorem checking.

Trust label remains trusted-boundary; this is not full Lean pattern matching and not a formal Lean-equivalence proof.

Report: `PRODUCTION_P4_51_LEAN_STYLE_CONSTRUCTOR_PATTERN_REPORT.md`.

## P4.52 — Executable Structure Runtime Slice

Added bounded executable runtime support for parameterless single-constructor structures after checked Core elaboration. Structure instances such as `{x := 1, y := 2}` now emit frozen PSC-1 JS records through `Struct_mk`; generated projections such as `Point.x` and `Point.y` emit `Struct_proj` wrappers. Added smoke/reference-governance examples, negative field-shape checks, and proof obligation `ProofScript.Runtime.Structure.ConstructorProjectionEncoding`.

Trust label remains trusted-boundary; no full Lean equivalence is claimed.

## P4.53 — Structure dotted projection sugar

Status: PASS.

Added bounded PSC-1 dotted projection syntax for known source structures:

```proofscript
def pointDotX: Nat := { point.x }
def pointDotY: Nat := { point.y }
```

The feature is a frontend elaboration to generated checked projection applications (`Point.x(point)` / `Point.y(point)`) and is not JavaScript property access. Unknown dotted fields and non-structure bases reject. Added `ProofScript.Frontend.Structure.DottedProjectionSugar` as a not-proven trusted-boundary proof obligation.

Fresh evidence recorded in `PRODUCTION_P4_53_STRUCTURE_DOT_PROJECTION_REPORT.md`.

## P4.54 — Structure Update Runtime Evidence

Added first-class PSC-1 evidence for checked structure update syntax `{point with x := 3}`. The update is parsed as `structUpdate`, elaborated to the generated checked constructor plus generated checked projections for preserved fields, executed through the existing frozen-record runtime, and covered by standalone smoke, reference governance, examples, negative tests, and the proof-obligation catalog.

Trust label remains trusted-boundary, not full Lean equivalence.

## P4.55 — Nested Structure Update Field Paths

Added bounded PSC-1 nested structure update syntax such as `{box with p.x := 7}`. The frontend now recursively reconstructs nested structures through generated checked projections and constructors, keeping JS execution tied to kernel-checked Core. Added focused TDD smoke, standalone/reference-governance evidence, runtime manifest update, and proof-obligation catalog entry. Kept kernel smoke fast by moving release source-tree/source-archive/preflight checks behind `PS_KERNEL_SMOKE_RELEASE=1`; dedicated release commands still cover those checks.

## P4.56 — Structure update base expression

- Added bounded parenthesized checked base expressions for PSC-1 structure update.
- `{(point) with x := 4}` and `{(box.p) with y := 6}` now elaborate through the existing checked constructor/projection reconstruction path.
- Added focused TDD smoke, standalone smoke, reference governance checks, and proof obligation `ProofScript.Frontend.Structure.ParenthesizedUpdateBase`.
- Verified build, focused test, standalone-small, reference-governance, kernel smoke, governance, package audit, tarball smoke, release manifest, and fresh release-manifest verification.
- Trust boundary remains trusted-boundary; no full Lean record-update equivalence is claimed.


## P4.57 — Structure Update Field Punning

Added bounded PSC-1 structure update field punning. `{p with x}` now parses as `{p with x := x}` and then uses the existing checked structure-update lowering through generated projections/constructors and kernel inference before JS emission. Added focused smoke, standalone smoke coverage, reference-governance coverage, and proof obligation `ProofScript.Frontend.Structure.UpdateFieldPunning`. Boundary remains trusted-boundary; not full Lean record-update elaboration and not formally equivalent to Lean 4.

## P4.58 — Executable Single-Constructor Structure Match

Added executable JS backend/runtime coverage for checked PSC-1 matches over parameterless single-constructor structures. The frontend already elaborates `match (p) { | Point.mk x y => ... }` into checked `Point.rec`; P4.58 adds `Struct_rec` runtime emission for that bounded Core shape after kernel checking. Multi-constructor user-inductive JS match emission remains fail-closed. New evidence: `tools/structure-match-runtime-tests.ts`, `npm run test:structure-match-runtime`, updated standalone-small/reference-governance smoke, and `ProofScript.Runtime.Structure.SingleConstructorMatchEncoding` proof obligation. This remains trusted-boundary evidence, not a formal Lean equivalence proof.

## P4.59 — Structure literal field punning evidence

P4.59 records and verifies the already intended PSC-1 structure literal field-punning slice as first-class release evidence.

Implemented/recorded:

- `tools/structure-literal-field-punning-tests.ts`
- `npm run test:structure-literal-field-punning`
- Runtime feature-manifest entry for structure literal field punning.
- Standalone-small smoke coverage for `{x, y}` as `{x := x, y := y}`.
- Reference-governance coverage for acceptance, JS emission, rfl theorem smoke, runtime execution, missing punned value rejection, and punned-value type rejection.
- Proof obligation `ProofScript.Frontend.Structure.LiteralFieldPunning`.

Trust boundary:

- This is a frontend sugar/evidence slice, not a new trusted runtime object model.
- Punned values still resolve as ordinary names and are checked against generated structure field types before constructor application.
- Missing identifiers, wrong types, duplicate fields, unknown fields, dependent records, and JavaScript object-literal semantics remain fail-closed or unsupported.
- Proof status remains `not-proven`; this is trusted-boundary evidence only.


## P4.60 — User Inductive Match Runtime

Added trusted-boundary JavaScript backend/runtime support for checked matches over nonrecursive parameterless/indexless multi-constructor user inductives. The new `Inductive_rec` runtime dispatches on frozen tagged-record constructor indices after Core checking, while recursive user-inductive runtime emission remains fail-closed. Evidence: `tools/user-inductive-match-runtime-tests.ts`, standalone-small smoke, reference-language governance, package audit, tarball smoke, release manifest, fresh release-manifest verification, and final zip fresh-extract verification.

## P4.61 — Expected-Type Constructor Shorthand

Added bounded PSC-1 expected-type-directed constructor shorthand for unqualified constructor terms and fully-applied constructor calls, such as `red` under expected type `Color` and `some(7)` under expected type `MaybeNat`. The feature runs only after normal local/global resolution fails, then elaborates to generated checked constructor applications before JS emission. Added focused TDD smoke, standalone-small coverage, reference-governance checks, and proof obligation `ProofScript.Frontend.Inductive.ExpectedTypeConstructorShorthand`. Boundary remains trusted-boundary; not full Lean constructor elaboration and not formally equivalent to Lean 4.

## Production P4.62 — Partial Constructor Shorthand for Expected Function Types

P4.62 extends the expected-type constructor shorthand slice to expected function types. A declaration such as `def mkSome: Nat -> MaybeNat := { some }` now elaborates to the checked constructor function `MaybeNat.some` when the expected type is a nondependent Pi ending in a known parameterless/indexless inductive target. The feature remains fail-closed for dependent function targets, parameterized/indexed inductives, unresolved names, and local/global name shadowing. The new proof obligation is `ProofScript.Frontend.Inductive.ExpectedFunctionTypePartialConstructorShorthand`.

## P4.63 — Simple self-recursive user-inductive runtime

P4.63 extends the executable PSC-1 runtime from nonrecursive user-inductive dispatch to simple direct self-recursive inductives. The backend records recursive constructor-field positions for parameterless/indexless inductives whose recursive fields are exactly owner-typed, and the runtime computes induction hypotheses structurally before applying checked recursor branches.

This enables examples such as `NatList` and `listLength` to run without Lean4 installed while preserving the trusted-boundary label. It does not claim full Lean recursor semantics, dependent motive runtime support, parameterized/indexed/mutual/nested inductives, or formal Lean 4 equivalence.

## P4.64 — Kernel Maturity Replacement from Uploaded P4.48 Comparison

P4.64 audits the uploaded `proofscript-standalone-p4-48-kernel-comparison(1).zip` against the current P4.63 standalone kernel. The uploaded artifact was not stronger as a whole release because it predates the P4.49–P4.63 frontend/runtime slices and fails a P4.63 feature probe. However, its core kernel files are more mature for several trusted-boundary checker internals: context-scoped definitional-equality cache, local definition unfolding, unit-like equality, neutral projection congruence, function eta, binder-annotation-insensitive Pi/lambda equality, and dependent single-constructor projection typing.

Action taken: replaced the current core kernel implementation files with the mature P4.48 versions for `TypeChecker.ts`, `EquivManager.ts`, `LocalContext.ts`, and `Environment/Basic.ts`; recovered the P4.48 kernel conformance/reference scripts; preserved the newer P4.63 frontend/runtime work; and preserved the P4.63 fail-closed opaque-transparency boundary rather than adopting P4.48 opaque unfolding. Added proof obligation `ProofScript.Kernel.CoreMaturity.P48ConformanceReplacement`.

Fresh evidence includes recovered `npm run test:kernel:typechecker` with 42/42 passing, `npm run test:kernel:reference:if-available` blocked cleanly without a Lean oracle while 11/11 TypeScript paired cases match expectations, plus the existing P4.63 standalone/runtime/governance/release gates.

Boundary remains trusted-boundary and not formally equivalent to Lean 4. Full K3 equivalence, arbitrary native `.olean` replay, indexed/mutual/nested inductive completeness, and opaque unfolding remain unsupported/fail-closed.

# PSKernel KA-7 Real Lean4Lean Import Gate Report

Checkpoint: `proofscript-v1-ka7-real-lean4lean-import0`  
Public version: `1.0.0-pskernel.9`  
Baseline: `proofscript-v1-ka6-lean4lean-binding0`

## Purpose

KA-7 adds the first real Lean4Lean source-discovery and strict import gate. KA-6 checked a Lean4Lean-compatible interface with Lean 4.33.1; KA-7 makes the next boundary executable: a real Lean4Lean source tree must be mounted before the project can claim an imported Lean4Lean binding.

## Local result

```text
materializedLeanPath: /mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lean
actualLean4LeanSourcePresent: false
actualLean4LeanImportBound: false
strictActualImportPassed: false
blockedReason: lean4lean_source_missing
KA6 compatible scaffold still checks: true
```

The strict command `npm run lean:ka7:import` exits `2` in this environment as designed because no pinned Lean4Lean source tree is mounted. The soft and assurance gates pass while recording this as `lean4lean_source_missing`, not as a proof or import success.

## Source discovery candidates checked

```text
vendor/lean4lean
external/lean4lean
/mnt/data/lean4lean
/mnt/data/lean4lean-master
/mnt/data/lean4lean-src
/mnt/data/lean4lean-test-clone
```

All candidates were missing the required Lean4Lean source files locally.

## Boundary

```text
Trusted kernel semantic change: NO
Kernel codec change: NO
New trusted computation rule: NO
Core format changed: NO, still 71
Actual Lean4Lean import bound: NO
Full Lean 4 equivalence: NO
Same theory as full Lean 4: NO
Fully formal K3: NO
Formal Lean 4 equivalence proven obligations: 0
```

## Verification

```text
npm install --offline --no-audit --no-fund: PASS
npm run build -- --pretty false: PASS
npm run test:pskernel:ka1: PASS
npm run test:pskernel:ka2: PASS
npm run test:pskernel:ka3: PASS
npm run test:pskernel:ka4: PASS
npm run test:pskernel:ka5: PASS
npm run test:pskernel:ka6: PASS
npm run test:pskernel:ka7: PASS
npm run assurance:ka1..ka7: PASS
npm run lean:ka6:check: PASS
npm run lean:ka7:import:soft: PASS with source_missing recorded
npm run lean:ka7:import: FAILS as designed with exit 2 / source_missing
npm run verify:arena: PASS
npm run test:kernel:smoke: PASS
npm run test:standalone-small: PASS
npm run test:psc:kernel-status: PASS
npm run test:psc:conformance-bounded: PASS
```

## Next milestone

KA-8 should mount or vendor a Lean4Lean source tree compatible with Lean 4.33.1, then make `npm run lean:ka7:import` pass strictly. Only after that should the KA-6 `Lean4LeanCompat` interface be replaced with a real imported Lean4Lean reference module.

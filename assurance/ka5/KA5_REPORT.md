# PSKernel KA-5 Lean 4.33.1 Strict Proof-Check Report

Checkpoint: `proofscript-v1-ka5-lean4331-strict-check0`  
Public version: `1.0.0-pskernel.7`  
Baseline: `proofscript-v1-ka4-lean-toolchain-gate0`

## Scope

KA-5 materializes the uploaded Lean 4.33.1 Linux toolchain archive from `/mnt/data`, teaches the KA-4 gate to discover that materialized toolchain, and runs the strict Lean proof-file check.

This checkpoint does **not** change trusted PSKernel semantics, the kernel codec, or Core format 71.

## Toolchain

Lean was materialized from:

- `/mnt/data/7z2603-linux-x64.tar.xz`
- `/mnt/data/lean-4.33.1-linux.7z(2).001`
- `/mnt/data/lean-4.33.1-linux.7z(2).002`

Materialized binary:

```text
/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lean
```

Version observed:

```text
Lean (version 4.33.1, x86_64-unknown-linux-gnu, commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6, Release)
```

## Machine-check result

`assurance/ka4/noninductive-soundness-machine-check.lean` checks successfully under Lean 4.33.1.

Strict gate status:

```text
npm run lean:ka4:check: PASS
npm run lean:ka5:check: PASS
```

## Verification

```text
npm install --offline --no-audit --no-fund: PASS
npm run build -- --pretty false: PASS
npm run lean:ka5:materialize: PASS
npm run lean:ka4:check: PASS
npm run lean:ka5:check: PASS
npm run test:pskernel:ka1: PASS
npm run test:pskernel:ka2: PASS
npm run test:pskernel:ka3: PASS
npm run test:pskernel:ka4: PASS
npm run test:pskernel:ka5: PASS
npm run assurance:ka1: PASS
npm run assurance:ka2: PASS
npm run assurance:ka3: PASS
npm run assurance:ka4: PASS
npm run assurance:ka5: PASS
npm run verify:arena: PASS with mounted 190-fixture corpus
npm run test:kernel:smoke: PASS
npm run test:standalone-small: PASS
npm run test:psc:kernel-status: PASS
npm run test:psc:conformance-bounded: PASS
```

## Claim boundary

- Machine-checked Lean proof file in this checkpoint: YES, for the self-contained KA-4 non-inductive translation skeleton.
- Full Lean 4 equivalence: NO.
- Same theory as full Lean 4: NO.
- Fully formal K3: NO.
- Formal Lean 4 equivalence proven obligations: 0.

## Next advancement

KA-6 should replace the self-contained KA-4 reference model with a pinned Lean4Lean import or a vendored minimal Lean4Lean-compatible model, then prove the first declaration-checking soundness lemma against that reference instead of only the local staging model.

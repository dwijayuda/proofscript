# PSKernel KA-4 Lean Toolchain Gate Report

Checkpoint: `proofscript-v1-ka4-lean-toolchain-gate0`  
Public version: `1.0.0-pskernel.6`  
Baseline: `proofscript-v1-ka3-noninductive-soundness0`

## Summary

KA-4 adds a strict/soft Lean 4.33.1 machine-check gate for the KA-3 non-inductive soundness skeleton. It does **not** change trusted kernel semantics, the kernel codec, or Core format 71.

## Added artifacts

- `assurance/ka4/noninductive-soundness-machine-check.lean`
- `assurance/ka4/lean-toolchain-gate.json`
- `assurance/ka4/machine-check-status.json`
- `assurance/ka4/lean4lean-binding-plan.json`
- `assurance/ka4/KA4_REPORT.md`
- `assurance/ka4/KA4_RELEASE_GATE.json`
- `tools/pskernel-ka4-lean-check.ts`
- `tools/pskernel-ka4-lean-check-tests.ts`
- `docs/superpowers/plans/2026-09-18-pskernel-ka4-lean-toolchain-gate.md`

## Commands added

```bash
npm run test:pskernel:ka4
npm run assurance:ka4
npm run lean:ka4:check
npm run lean:ka4:check:soft
```

`npm run lean:ka4:check` is intentionally strict. In this environment it exits non-zero because `lean` is not available. `npm run assurance:ka4` and `npm run lean:ka4:check:soft` pass while recording `leanCheckedHere: false`.

## Local Lean discovery

```text
lean executable: not found
lake executable: not found
7z extractor: not found
Lean archive parts: present under /mnt/data
strict Lean check: not passed here
```

## Verification

Passed:

```text
npm install --offline --no-audit --no-fund
npm run build -- --pretty false
npm run test:pskernel:ka1
npm run test:pskernel:ka2
npm run test:pskernel:ka3
npm run test:pskernel:ka4
npm run assurance:ka1
npm run assurance:ka2
npm run assurance:ka3
npm run assurance:ka4
npm run lean:ka4:check:soft
npm run verify:arena
npm run test:kernel:smoke
npm run test:standalone-small
npm run test:psc:kernel-status
npm run test:psc:conformance-bounded
```

Expected strict failure in this environment:

```text
npm run lean:ka4:check
exit code: 2
reason: lean executable not found on PATH or LEAN_BIN
```

## Claim boundary

- Trusted kernel semantic change: NO
- Kernel codec change: NO
- New trusted computation rule: NO
- Core format changed: NO, still 71
- Machine-checked Lean proof in this checkpoint: NO
- Full Lean 4 equivalence: NO
- Same theory as full Lean 4: NO
- Fully formal K3: NO
- Formal Lean 4 equivalence proven obligations: 0

## Next milestone

KA-5 should mount or extract Lean 4.33.1, make `npm run lean:ka4:check` pass strictly, and only then start replacing the self-contained KA-4 model with a pinned Lean4Lean import.

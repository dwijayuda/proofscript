# PSKernel KA-6 Lean4Lean-Compatible Binding Report

Checkpoint: `proofscript-v1-ka6-lean4lean-binding0`  
Public version: `1.0.0-pskernel.8`  
Baseline: `proofscript-v1-ka5-lean4331-strict-check0`

## Advancement

KA-6 adds the first **Lean 4.33.1-machine-checked Lean4Lean-compatible reference binding** for the non-inductive PSKernel translation slice. It introduces a separate `Lean4LeanCompat` reference namespace and an explicit PSKernel-to-reference translation relation in Lean.

This is a real strict Lean check of the KA-6 file:

```text
/mnt/data/lean-4.33.1-toolchain/lean-4.33.1-linux/bin/lean assurance/ka6/lean4lean-compatible-binding.lean
```

## Added files

```text
assurance/ka6/lean4lean-compatible-binding.lean
assurance/ka6/lean4lean-reference-binding.json
assurance/ka6/obligation-delta.json
assurance/ka6/KA6_REPORT.md
assurance/ka6/KA6_RELEASE_GATE.json
tools/pskernel-ka6-reference-binding.ts
tools/pskernel-ka6-reference-binding-tests.ts
docs/superpowers/plans/2026-09-18-pskernel-ka6-lean4lean-binding.md
```

## Machine-checked slice

The KA-6 Lean file checks these scaffold obligations:

```text
closedMachineCheckedScaffoldObligations: 5
stillOpenObligations: 9
leanCheckedHere: true
actualLean4LeanImportBound: false
```

The checked slice covers:

```text
- Lean4Lean-compatible Level / Expr / Decl shape interface
- PSKernel Level / Expr / Decl shape translation
- axiom / definition / theorem-example / opaque shape lemmas
- metadata erasure preservation
- metavariable and free-variable blocking
- unsupported inductive/quotient family still blocked from this slice
```

## Boundary

```text
Trusted kernel semantic change: NO
Kernel codec change: NO
New trusted computation rule: NO
Core format changed: NO, still 71
Actual pinned Lean4Lean import bound: NO
Lean4Lean-compatible interface checked by Lean 4.33.1: YES
Full Lean 4 equivalence: NO
Same theory as full Lean 4: NO
Fully formal K3: NO
Formal Lean 4 equivalence proven obligations: 0
```

## Verification passed

```text
npm install --offline --no-audit --no-fund: PASS
npm run build -- --pretty false: PASS
npm run test:pskernel:ka1: PASS
npm run test:pskernel:ka2: PASS
npm run test:pskernel:ka3: PASS
npm run test:pskernel:ka4: PASS
npm run test:pskernel:ka5: PASS
npm run test:pskernel:ka6: PASS
npm run assurance:ka1: PASS
npm run assurance:ka2: PASS
npm run assurance:ka3: PASS
npm run assurance:ka4: PASS
npm run assurance:ka5: PASS
npm run assurance:ka6: PASS
npm run lean:ka6:check: PASS
npm run verify:arena: PASS
npm run test:kernel:smoke: PASS
npm run test:standalone-small: PASS
npm run test:psc:kernel-status: PASS
npm run test:psc:conformance-bounded: PASS
```

## Next milestone

KA-7 should vendor or mount a pinned Lean4Lean source tree that matches Lean 4.33.1 and replace the compatibility namespace with a real imported Lean4Lean reference module. Only then should we start counting imported Lean4Lean-backed proof obligations.

## Fresh extract verification

```text
unzip -t final ZIP: PASS
npm install --offline --no-audit --no-fund: PASS
npm run build -- --pretty false: PASS
npm run lean:ka6:check: PASS
npm run test:pskernel:ka6: PASS
npm run assurance:ka6: PASS
npm run test:kernel:smoke: PASS
npm run test:arena:static-nonperf: PASS
```

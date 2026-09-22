# P5.96 Software Executable Examples Report — ProofScript Software Profile v0

Status: **PROFILE EXECUTABLE CHECKPOINT FROZEN**

This is not a kernel-semantics release. It is an executable software-profile checkpoint layered on top of P5.95 `proofscript-software-v0` and the frozen P5.94 kernel/checker baseline.

## Baseline

- Profile baseline: P5.95 `profile-plan0`.
- Kernel/checker baseline: P5.94 `arena-nested-helper-target-validation0`.
- P5.94 baseline SHA-256: `8994a1e4317b82b07a032004eda9a66255cab76e63ee0923cb0ebee40f9d873c`.

## Feature

P5.96 turns the software profile from a planning document into a runnable demo gate. It adds repository-owned `.ps` examples for correctness-focused software and a gate that checks, builds, compiles, and executes selected observations from those examples.

## Files added

- `examples/software-profile/README.md`
- `examples/software-profile/software-profile-examples.json`
- `examples/software-profile/src/BusinessRules.ps`
- `examples/software-profile/src/StateMachine.ps`
- `examples/software-profile/src/SecurityPolicy.ps`
- `examples/software-profile/src/Validation.ps`
- `examples/software-profile/src/Collections.ps`
- `tools/software-profile-executable-examples-tests.ts`

## Files modified

- `package.json`
- `docs/profiles/PROOFSCRIPT_SOFTWARE_PROFILE_V0.md`

## Example coverage

- Business rules: total Nat arithmetic, if, clamped subtraction, small theorem checks.
- State machines: inductive states, structures, projections, updates, match.
- Security policy: ADT role/action matrix as total decision functions.
- Validation: explicit `Except(String, Nat)` success/error handling.
- Collections: finite `List`/`Array` filter/find/any helpers.

## Test evidence

RED:

```text
software-profile examples README must exist
```

GREEN:

```text
PROOFSCRIPT_SOFTWARE_EXECUTABLE_EXAMPLES0=PASS
```

Bounded gates run from the working tree:

- `npm install --offline --no-audit --no-fund`: PASS.
- `npm run build -- --pretty false`: PASS.
- `npm run test:profile:software`: PASS.
- `npm run test:profile:software:examples`: PASS.
- `npm run verify:profile:software`: PASS.
- `npm run test:conformance`: PASS.
- `npm run test:standalone-small`: PASS.
- `npm run test:typescript-migration`: PASS.
- `npm run test:kernel:smoke`: PASS.

Clean source gate:

- Fresh extract install/build/profile examples: PASS.

## Boundary

Kernel source changed: NO.

Arena importer changed: NO.

Kernel-codec changed: NO.

New trusted computation rule: NO.

Full Lean 4 equivalence: NO.

Same theory as full Lean 4: NO.

Fully formal K3: NO.

Formal Lean 4 equivalence proven obligations: 0.

The examples are executable evidence for the supported software profile subset. They do not prove full frontend coverage, full Lean 4 equivalence, full backend execution correspondence, or contract verification support.

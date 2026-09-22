# P5.95 Software Profile Plan Report — ProofScript Software Profile v0

Status: **PROFILE CHECKPOINT FROZEN**

This is not a kernel-semantics release. It is a profile/specification checkpoint that binds a small correctness-focused software language surface to the frozen P5.94 kernel/checker evidence.

## Baseline

Selected baseline: P5.94 `arena-nested-helper-target-validation0`.

Baseline archive SHA-256: `8994a1e4317b82b07a032004eda9a66255cab76e63ee0923cb0ebee40f9d873c`.

## Feature

P5.95 introduces **ProofScript Software Profile v0**, a Go-small source-language profile for correctness-focused software development.

The profile defines a 20-35 core-construct budget and classifies source features as:

- current;
- planned;
- deferred;
- forbidden.

It explicitly separates ordinary software-programming features from full Lean 4 frontend/kernel-equivalence work.

## Files added

- `docs/profiles/PROOFSCRIPT_SOFTWARE_PROFILE_V0.md`
- `config/proofscript-software-profile-v0.json`
- `tools/software-profile-consistency-tests.ts`
- `docs/superpowers/specs/2026-09-17-proofscript-software-profile-v0-design.md`
- `docs/superpowers/plans/2026-09-17-proofscript-software-profile-v0.md`
- `P5_95_SOFTWARE_PROFILE_PLAN_REPORT.md`

## Files modified

- `package.json`

## Test evidence

RED:

```text
software profile spec must exist at docs/profiles/PROOFSCRIPT_SOFTWARE_PROFILE_V0.md
```

GREEN:

```text
PROOFSCRIPT_SOFTWARE_PROFILE_V0_CONSISTENCY=PASS
```

Additional bounded inherited gates run from the working tree:

- `npm install --offline --no-audit --no-fund`: PASS.
- `npm run build -- --pretty false`: PASS.
- `npm run test:profile:software`: PASS.
- `npm run test:conformance`: PASS.
- `npm run test:standalone-small`: PASS.
- `npm run test:typescript-migration`: PASS.
- `npm run test:kernel:smoke`: PASS.

Clean source profile gate:

- `node tools/software-profile-consistency-tests.ts`: PASS.

## Current software-profile feature summary

The profile treats these as current implementation-supported slices for software-profile planning:

- definitions, theorems, function application, lambdas, let/have;
- Nat, Bool, bounded Int/String runtime slices;
- Option/Except/List/Array runtime slices;
- if/match, constructor patterns, simple ADTs, structures, projections, updates;
- structural recursion subset and equation-style one-argument definitions;
- dependent Pi types, namespaces/modules/sections slices;
- TypeScript emission for the supported subset;
- standalone kernel replay and certificate/replay path.

## Deferred features

- nested helper recursor derivation + iota validation;
- full Lean tactic engine;
- arbitrary macros;
- unrestricted JS interop;
- general mutual/nested inductives in ordinary source;
- full Lean typeclass search/coercion behavior;
- full IO/effects and exception model;
- loops with verified invariants;
- full Lean stdlib/Mathlib compatibility;
- full backend execution-correspondence proof.

## Boundary

Kernel source changed: NO.

Arena importer changed: NO.

Kernel-codec changed: NO.

New trusted computation rule: NO.

Full Lean 4 equivalence: NO.

Same theory as full Lean 4: NO.

Fully formal K3: NO.

Formal Lean 4 equivalence proven obligations: 0.

Arena/differential tests are engineering evidence, not formal equivalence proofs.

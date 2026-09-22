# Production Proof Obligation Ledger

P5.2 adds a machine-checked proof-obligation ledger for the ProofScript PSC-1 production path.

The ledger lives in:

```txt
config/proof-obligations-ledger.json
```

The checker lives in:

```txt
tools/check-proof-obligations.ts
```

Run it with:

```txt
npm run test:proof-obligations
npm run test:architecture:proof-obligations
```

## Goal

The goal is to make the project more production-grade, explainable, provable, and safe to extend.

Before P5.2, the project already had package classification, feature promotion checks, a verification matrix, production status, and canonical package docs. But the formal proof story still lived across older reports and natural-language explanations.

P5.2 makes the formal proof roadmap explicit and machine-checkable.

## K3-TB

The current trust label remains:

```txt
K3-TB trusted-boundary
```

This means the implementation has checked artifacts, replay, governance checks, architecture guards, and engineering evidence. It does **not** mean the kernel is fully formal K3. It does **not** mean the implementation is proven equivalent to Lean 4.

## What This Proves

This ledger proves only an architecture/governance fact:

```txt
The repo contains a complete, machine-checked list of the current formal proof obligations and does not silently overclaim them as proved.
```

It proves that required formal obligations remain visible, categorized, and attached to evidence and next-proof-work. It also proves that the published trust claim still says formal Lean 4 equivalence has zero proven obligations.

## What This Does Not Prove

This ledger does not prove:

```txt
full Lean 4 equivalence
type soundness of the full language
semantic preservation of the JS/TS backend
correctness of the JavaScript runtime
soundness of the elaborator
self-hosting correctness
```

Those are recorded as obligations, not completed proofs.

## Obligation States

```txt
open
  No formal proof artifact exists yet.

evidence-only
  Tests, audits, or checked artifacts exist, but no accepted formal proof artifact exists.

blocked-external-lean
  Work needs a pinned Lean executable, exported Lean artifact, or external oracle setup.

proved
  A formal proof artifact exists and a required verification command checks it.
```

P5.2 intentionally has zero required formal Lean-equivalence obligations in the `proved` state.

## Required Formal Lean-Equivalence Obligations

The canonical required obligations are:

```txt
kernel-lean4-equivalence
core-type-soundness
elaborator-elaboration-soundness
stdlib-bootstrap-soundness
backend-semantic-preservation
runtime-observable-semantics
artifact-replay-soundness
feature-proof-obligation-coverage
```

These obligations are the minimum roadmap before the project can honestly claim strong Lean-compatible formal trust.

## How to Upgrade an Obligation

To move an obligation to `proved`:

1. Add a reviewed formal proof artifact, preferably `.lean` or another explicitly accepted formal artifact.
2. Add a deterministic command that checks that proof artifact.
3. Link both in `config/proof-obligations-ledger.json`.
4. Run `npm run test:proof-obligations`.
5. Update the verification matrix and production status only after the checker accepts the new state.

Engineering tests are useful, but they must stay `evidence-only` until a formal artifact exists.

## Feature Development Rule

A new production-supported feature must update the feature promotion gate and, when it changes proof/kernel/backend/runtime assumptions, must also update the proof-obligation ledger.

This keeps feature work easy to add without weakening the trust story.

## P5.4 Feature Linkage

P5.4 links supported PSC-1 features back to this ledger through `proofObligationIds` in `config/feature-promotion-gate.json`.

This means a future feature such as `Option`, `List`, `String`, or `Int` cannot be promoted as production-supported unless it declares which formal obligations it relies on: parser/elaborator soundness, kernel/core soundness, stdlib bootstrap soundness, backend/runtime semantic preservation, artifact replay, or another listed obligation.

The project remains K3-TB trusted-boundary and still has 0 formally proved Lean-equivalence obligations.

## P5.4 Traceability Integration

P5.4 connects this ledger to `config/production-traceability-bundle.json`. Supported features now participate in a repository-wide traceability check that links feature support to formal proof obligations, while keeping all formal Lean 4 equivalence obligations in the not-proven state until actual proof artifacts exist.

## P5.51 Option.flatten Evidence

P5.51 adds engineering evidence for existing obligations only: Core type soundness, elaborator soundness, stdlib bootstrap soundness, backend semantic preservation, runtime observable semantics, artifact replay soundness, and feature proof-obligation coverage. No obligation is marked proved.


## P5.52 Proof-Obligation Status

`Except.flatten` reuses existing checked-bootstrap, Core type-soundness, replay, backend preservation, runtime-observable semantics, and feature-coverage obligations. No new formal Lean proof was added; formal Lean 4 equivalence proven obligations remain 0.


## P5.52 Except.flatten Feature

P5.52 adds engineering evidence for existing obligations only: Core type soundness, elaborator soundness, stdlib bootstrap soundness, backend semantic preservation, runtime observable semantics, artifact replay soundness, and feature proof-obligation coverage. No obligation is marked proved.

## P5.53 Except.toError Feature

`Except.toError` reuses existing checked-bootstrap, Core type-soundness, replay, backend preservation, runtime-observable semantics, and feature-coverage obligations. No formal Lean proof was added; formal Lean 4 equivalence proven obligations remain 0.

## P5.54 Except.getErrorD Feature

`Except.getErrorD` reuses existing checked-bootstrap, Core type-soundness, replay, backend preservation, runtime-observable semantics, and feature-coverage obligations. No formal Lean proof was added; formal Lean 4 equivalence proven obligations remain 0.

## P5.55 Option.fold Feature

`Option.fold` reuses existing checked-bootstrap, Core type-soundness, replay, backend preservation, runtime-observable semantics, and feature-coverage obligations. No formal Lean proof was added; formal Lean 4 equivalence proven obligations remain 0.

## P5.56 Except.swap Feature

`Except.swap` reuses existing checked-bootstrap, Core type-soundness, replay, backend preservation, runtime-observable semantics, and feature-coverage obligations. No formal Lean proof was added; formal Lean 4 equivalence proven obligations remain 0.


## P5.72 note

P5.72 adds checked Iff.mp/Iff.mpr prelude theorem definitions as engineering evidence only. The canonical formal Lean 4 equivalence proof obligations remain unchanged and the number of proven obligations remains 0.

## P5.73 note

P5.73 adds checked `Iff.refl`/`Iff.symm`/`Iff.trans` prelude theorem definitions as engineering evidence only. The canonical formal Lean 4 equivalence proof obligations remain unchanged and the number of proven obligations remains 0.

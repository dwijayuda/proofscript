# P4.32 — PSC-1 Assumption Proof and Reference-Governed Closure

**Status:** PASS  
**Trust label:** trusted-boundary standalone small subset; not fully formally equivalent to Lean 4 yet

## Purpose

Move the standalone no-Lean4 PSC-1 language from `rfl`/`exact`/`intro` into a minimal local-context proof loop by adding `assumption`. This follows the v0.2.x reference tactic surface while remaining a small explicit subset.

## Implemented

- Added `SurfaceTerm.assumptionProof`.
- Added parser support for `by { assumption }`.
- Added elaborator support that searches local hypotheses from newest to oldest and returns the matching bound variable only when its type is definitionally equal to the expected goal.
- Added support for omitting the command semicolon after self-delimited `by { ... }` theorem/example declarations in the PSC-1 parser slice.
- Updated runtime status metadata.
- Updated standalone and reference-governance smokes.
- Added positive and negative proof fixtures.

## Accepted examples

```ts
axiom P: Prop;

theorem intro_id_prop_assumption: P -> P := by {
  intro h;
  assumption
}

theorem direct_assumption(h: P): P := by {
  assumption
}
```

## Rejected example

```ts
axiom P: Prop;
axiom Q: Prop;

theorem bad_assumption: P -> Q := by {
  intro h;
  assumption
};
```

Expected rejection: no local hypothesis has the expected goal type `Q`.

## Verification

```bash
npm run build -- --pretty false
npm run test:fast-smoke
node tools/pskernel.ts preflight
node tools/pskernel.ts package-audit
node tools/pskernel.ts release-manifest
node tools/pslive.ts check examples/standalone-small/src/Main.ps --json
node tools/pslive.ts build-js examples/standalone-small/src/Main.ps --out artifacts/standalone-small-main-p4-32.js --json
node artifacts/standalone-small-main-p4-32.js
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call add2 --args 5 --json
```

Observed result: all commands passed.

## Current progress estimate

- Standalone PSC-1 without Lean4: ~77%.
- PSC-1 small complete programming language: ~42%.
- PSC-1 small theorem prover: ~43%.
- Full ProofScript compiler: ~43%.
- Full Lean-like ProofScript without Lean4: ~8%.
- Formal Lean equivalence: 0 proven obligations.

## Boundary

This is not full Lean tactic support. `assumption` is a small trusted-boundary frontend elaboration rule whose produced core proof term is checked by the kernel. Unsupported tactic scripts remain fail-closed.

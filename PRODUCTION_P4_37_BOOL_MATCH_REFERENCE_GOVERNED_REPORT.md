# Production P4.37 — PSC-1 Boolean Match Reference-Governed Slice

**Date:** 2026-09-11

**Trust label:** trusted-boundary standalone small subset; not fully formally equivalent to Lean 4 yet

## Purpose

Move the standalone PSC-1 language from Boolean `bif` only to a first canonical `match` expression slice, while staying governed by the ProofScript v0.2.x language and grammar references.

## Implemented Slice

```ts
function chooseMatch(b: Bool): Nat := {
  match (b) {
    | true => 1
    | false => 2
  }
}

theorem choose_match_true_eq_one: chooseMatch(true) = 1 := by { rfl }

theorem choose_match_false_eq_two: chooseMatch(false) = 2 := by { rfl }
```

## Changes

- Added Bool constructor-pattern normalization so canonical `true` and `false` patterns resolve to `Bool.true` and `Bool.false` in Bool matches.
- Reused the existing checked recursor lowering path; no JavaScript-only `switch` semantics were introduced.
- Added executable JS smoke for `chooseMatch(true)` and `chooseMatch(false)`.
- Added theorem smoke proving match reductions by `rfl`.
- Added negative smoke for non-exhaustive Bool match.
- Added negative smoke for forbidden branch-level semicolon in canonical match alternatives.
- Updated runtime supported/fail-closed feature declarations.
- Updated proof-obligation catalog with `ProofScript.Frontend.Match.BoolRec`.
- Updated working-language progress documentation.

## Verification

Fresh commands run:

```bash
npm run build -- --pretty false
npx tsc -b --force --pretty false
npm run test:fast-smoke
node tools/pskernel.ts preflight
node tools/pskernel.ts package-audit
node tools/pskernel.ts release-manifest
node tools/pskernel.ts tarball-smoke
node tools/pslive.ts check examples/standalone-small/src/Main.ps --json
node tools/pslive.ts build-js examples/standalone-small/src/Main.ps --out artifacts/standalone-small-main-p4-37.js --json
node artifacts/standalone-small-main-p4-37.js
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call chooseMatch --args true --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call chooseMatch --args false --json
```

Observed result:

```text
build: PASS
forced tsc rebuild: PASS
fast-smoke: PASS
preflight: PASS, checks=29, warnings=0, failures=0
package-audit: PASS, checks=26, failures=0
release-manifest: PASS, checks=9, failures=0
tarball-smoke: PASS, checks=8, failures=0
pslive check: PASS, user declarations=36, total checked=40
chooseMatch(true): 1
chooseMatch(false): 2
```

## Current Progress Estimate

| Goal | Progress |
|---|---:|
| Standalone PSC-1 without Lean4 | ~86% |
| PSC-1 small complete programming language | ~55% |
| PSC-1 small theorem prover | ~52% |
| Full ProofScript compiler | ~48% |
| Full Lean-like ProofScript without Lean4 | ~9% |
| Formal Lean 4 equivalence | 0 proven obligations |

## Boundary

This is not full pattern matching. The supported slice is exhaustive Bool match over canonical Bool patterns, lowered to checked Core recursor applications. General indexed, parameterized, nested, dependent, wildcard-heavy, and constructor-field-rich pattern matching remain fail-closed or provisional until separately implemented and tested.

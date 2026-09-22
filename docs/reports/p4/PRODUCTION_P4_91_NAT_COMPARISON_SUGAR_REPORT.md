# Production P4.91 — Nat Boolean comparison sugar

## Summary

P4.91 adds the next small controlled PSC-1 programming feature after `Nat.sub`: checked Nat Boolean comparison helpers and infix comparison sugar.

This remains K3-TB trusted-boundary. It is not fully formal K3 and it is not a proof of equivalence with Lean 4.

## What changed

- `packages/std/src/Bootstrap/Foundation.ps`
  - Added transparent checked `Nat.leb` through `Nat.rec`.
  - Added transparent checked `Nat.beq` through checked `Nat.leb` and Boolean recursor sugar.
  - Added transparent checked `Nat.ltb` as `Nat.leb (Nat.succ a) b`.
- `packages/std/core/bootstrap.pscore.json`
  - Regenerated the checked bootstrap artifact with `Nat.leb`, `Nat.beq`, and `Nat.ltb`.
- `packages/std/bootstrap-manifest.json`
  - Updated the bootstrap artifact SHA-256 and intended Lean built-in correspondence list.
- `packages/parser/src/tokenize.ts`
  - Added token support for `<`, `>`, `<=`, and `>=`.
- `packages/parser/src/sugar.ts`
  - Added lowering constructors for `Nat.beq`, `Nat.leb`, and `Nat.ltb`.
- `packages/parser/src/expressionParser.ts`
  - Added non-chained Nat comparison parsing.
  - `x == y` lowers to checked `Nat.beq x y`.
  - `x <= y` lowers to checked `Nat.leb x y`.
  - `x < y` lowers to checked `Nat.ltb x y`.
  - `x >= y` lowers to checked `Nat.leb y x`.
  - `x > y` lowers to checked `Nat.ltb y x`.
- `packages/backend-typescript/src/termEmitter.ts`
  - Added direct executable emission for checked `Nat.beq`, `Nat.leb`, and `Nat.ltb` constants/applications.
- `packages/runtime/src/nat.ts`
  - Added runtime `Nat_beq`, `Nat_leb`, and `Nat_ltb` helpers with Nat nonnegative BigInt guards.
- `packages/runtime/src/source.ts`
  - Added embedded JS/TS runtime source helpers for Nat comparisons.
- `packages/runtime/src/profile.ts`
  - Updated supported-feature metadata and profile marker to `standalone-small-subset-no-lean4-p4.91`.
- `tools/pslive-nat-comparison-tests.ts`
  - Added focused JS/TS/rfl/rejection regression for Nat comparisons.
- `tools/k1d-foundation-tests.ts`
  - Updated bootstrap foundation checks for the new checked Nat comparison declarations.

## Behavior covered

```proofscript
def eqTrue: Bool := { 3 == 3 }
def eqFalse: Bool := { 3 == 4 }
def leTrue: Bool := { 2 <= 5 }
def leEq: Bool := { 5 <= 5 }
def leFalse: Bool := { 6 <= 5 }
def ltTrue: Bool := { 2 < 5 }
def ltFalseEq: Bool := { 5 < 5 }
def gtTrue: Bool := { 5 > 2 }
def geTrue: Bool := { 5 >= 2 }
def chooseSmall: Nat := { if 2 < 3 then 10 else 20 }

theorem eq_true_rfl: eqTrue = true := by rfl
theorem le_false_rfl: leFalse = false := by rfl
theorem choose_small_rfl: chooseSmall = 10 := by rfl
```

## Verification run

```txt
node tools/pslive-nat-comparison-tests.ts before implementation  FAIL_EXPECTED, '<' rejected by tokenizer
npm run build -- --pretty false                                   PASS
npm run test:pslive:nat-comparison                                PASS
npm run test:pslive:language-fast                                 PASS
node tools/k1d-foundation-tests.ts                               PASS
npm run test:parser:expression                                    PASS
npm run test:runtime:extraction                                   PASS
npm run test:backend-typescript:extraction                        PASS
npm run test:reference-governance:json                            PASS, 94 checks
npm run test:governance                                           PASS, 27 checks
npm run test:architecture                                         PASS
npm run test:standalone-small                                     PASS
npm run test:kernel:smoke                                         PASS
node tools/pskernel.ts status --json                             PASS, trusted-boundary / not-proven
```

## Non-claims

- This does not add general `BEq`, `Ord`, `LE`, `LT`, or typeclass elaboration.
- This does not make `==` polymorphic. In PSC-1 P4.91 it is Nat Boolean equality sugar.
- This does not add Prop-valued `<`/`≤` theorem proving.
- This does not prove Lean 4 equivalence.
- This does not change the K3-TB trusted-boundary label.

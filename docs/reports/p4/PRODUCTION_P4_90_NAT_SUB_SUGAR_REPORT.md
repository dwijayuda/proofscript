# Production P4.90 — Nat subtraction sugar

## Summary

P4.90 resumes small controlled feature work after the P4.76–P4.89 cleanup pass. It adds PSC-1 checked `Nat.pred`, checked `Nat.sub`, and Lean-style Nat subtraction syntax `x - y`.

This remains K3-TB trusted-boundary. It is not fully formal K3 and it is not a proof of equivalence with Lean 4.

## What changed

- `packages/std/src/Bootstrap/Foundation.ps`
  - Added transparent `Nat.pred` through checked `Nat.rec`.
  - Added transparent `Nat.sub` through checked `Nat.rec` and `Nat.pred`.
- `packages/std/core/bootstrap.pscore.json`
  - Regenerated the checked bootstrap artifact with `Nat.pred` and `Nat.sub`.
- `packages/std/bootstrap-manifest.json`
  - Updated the bootstrap artifact SHA-256 and intended Lean built-in correspondence list.
- `packages/parser/src/tokenize.ts`
  - Added `-` as a single-character symbol while preserving `->`, `--`, and block-comment handling.
- `packages/parser/src/sugar.ts`
  - Added `makeNatSub` lowering to `Nat.sub`.
- `packages/parser/src/expressionParser.ts`
  - Added left-associative `+` / `-` parsing with `*` still binding tighter.
- `packages/backend-typescript/src/termEmitter.ts`
  - Added direct executable emission for checked `Nat.pred` and `Nat.sub` constants/applications.
- `packages/runtime/src/nat.ts`
  - Added runtime `Nat_pred` and `Nat_sub` helpers, both rejecting negative host BigInts and using saturating-at-zero Nat semantics.
- `packages/runtime/src/source.ts`
  - Added embedded JS/TS runtime source helpers for `Nat_pred` and `Nat_sub`.
- `packages/runtime/src/profile.ts`
  - Updated supported-feature metadata.
- `tools/pslive-nat-sub-tests.ts`
  - Added focused JS/TS/rfl/rejection regression for subtraction.
- `tools/pslive-smoke-lib.ts`
  - Extended standalone-small smoke coverage to include Nat subtraction/pred examples and `rfl` theorems.

## Behavior covered

```proofscript
def fiveMinusTwo: Nat := { 5 - 2 }
def twoMinusFive: Nat := { 2 - 5 }
def mixedPrecedence: Nat := { 8 - 2 * 3 }
def leftAssociative: Nat := { 10 - 3 - 2 }
def grouped: Nat := { 10 - (3 - 2) }
def viaNatSub: Nat := { Nat.sub 9 4 }
def viaNatPred: Nat := { Nat.pred 7 }
```

Expected runtime/proof behavior:

- `5 - 2 = 3`
- `2 - 5 = 0`
- `8 - 2 * 3 = 2`
- `10 - 3 - 2 = 5`
- `10 - (3 - 2) = 9`
- `Nat.sub 9 4 = 5`
- `Nat.pred 7 = 6`

## Verification run

```txt
node tools/pslive-nat-sub-tests.ts before implementation  FAIL_EXPECTED, '-' rejected by tokenizer
npm run build -- --pretty false                            PASS
npm run test:pslive:nat-sub                                PASS
npm run test:pslive:language-fast                          PASS
npm run test:parser:sugar                                  PASS
npm run test:parser:expression                             PASS
npm run test:runtime:extraction                            PASS
npm run test:backend-typescript:extraction                 PASS
node tools/k1d-foundation-tests.ts                        PASS
npm run test:reference-governance:json                     PASS, 94 checks
npm run test:architecture                                  PASS
npm run test:standalone-small                              PASS
npm run test:kernel:smoke                                  PASS
node tools/pskernel.ts status --json                      PASS, trusted-boundary / not-proven
```

## Non-claims

- This does not add signed integers.
- This does not add unary negation.
- This does not add general algebra/typeclass `HSub` elaboration.
- This does not prove Lean 4 equivalence.
- This does not change the K3-TB trusted-boundary label.

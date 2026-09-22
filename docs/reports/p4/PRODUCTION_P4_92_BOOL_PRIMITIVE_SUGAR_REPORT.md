# Production P4.92 — Bool primitive sugar

## Summary

P4.92 adds the next small controlled PSC-1 programming feature after Nat comparisons: checked Boolean helper declarations and prefix Boolean negation sugar.

This remains K3-TB trusted-boundary. It is not fully formal K3 and it is not a proof of equivalence with Lean 4.

## What changed

- `packages/std/src/Bootstrap/Foundation.ps`
  - Added transparent checked `Bool.not` through checked Boolean conditional/`Bool.rec` sugar.
  - Added transparent checked `Bool.xor` through checked `Bool.not` and Boolean conditional/`Bool.rec` sugar.
- `packages/std/core/bootstrap.pscore.json`
  - Regenerated the checked bootstrap artifact with `Bool.not` and `Bool.xor`.
- `packages/std/bootstrap-manifest.json`
  - Updated the bootstrap artifact SHA-256 and intended Lean built-in correspondence list.
- `packages/parser/src/tokenize.ts`
  - Added token support for prefix `!`.
- `packages/parser/src/sugar.ts`
  - Added lowering constructor for `Bool.not`.
- `packages/parser/src/expressionParser.ts`
  - Added prefix unary `!b`, lowering to checked `Bool.not b` before elaboration/backend emission.
  - Added explicit rejection for bare `!` without a following expression.
- `packages/backend-typescript/src/termEmitter.ts`
  - Added executable emission for checked `Bool.not` and `Bool.xor` constants/applications.
- `packages/runtime/src/bool.ts`
  - Added runtime `Bool_not` and `Bool_xor` helpers.
- `packages/runtime/src/index.ts`
  - Re-exported the new Bool runtime module.
- `packages/runtime/src/source.ts`
  - Added embedded JS/TS runtime source helpers for Bool primitives.
- `packages/runtime/src/profile.ts`
  - Updated supported-feature metadata and profile marker to `standalone-small-subset-no-lean4-p4.92`.
- `tools/pslive-bool-primitive-tests.ts`
  - Added focused JS/TS/rfl/rejection regression for Bool primitives.
- `tools/k1d-foundation-tests.ts`
  - Updated bootstrap foundation checks for the new checked Bool declarations.
- `tools/runtime-extraction-tests.ts`
  - Updated runtime extraction guard to include `bool.ts` and ensure Bool helpers stay outside Nat/structure modules.

## Behavior covered

```proofscript
def notTrue: Bool := { !true }
def notFalse: Bool := { Bool.not(false) }
def xorTrueFalse: Bool := { Bool.xor true false }
def xorTrueTrue: Bool := { Bool.xor true true }
def nestedLogic: Bool := { !(3 < 2) && Bool.xor (2 == 2) false }
def chooseByNot: Nat := { if !false then 11 else 22 }

theorem not_true_rfl: notTrue = false := by rfl
theorem not_false_rfl: notFalse = true := by rfl
theorem xor_true_false_rfl: xorTrueFalse = true := by rfl
theorem xor_true_true_rfl: xorTrueTrue = false := by rfl
```

## Verification run

```txt
node tools/pslive-bool-primitive-tests.ts before implementation  FAIL_EXPECTED, `!` rejected by tokenizer
npm run build -- --pretty false                                 PASS
npm run test:pslive:bool-primitive                              PASS
npm run test:pslive:language-fast                               PASS
node tools/k1d-foundation-tests.ts                             PASS
npm run test:parser:expression                                  PASS
npm run test:runtime:extraction                                 PASS
npm run test:backend-typescript:extraction                      PASS
npm run test:reference-governance:json                          PASS, 94 checks
npm run test:governance                                         PASS, 27 checks
npm run test:architecture                                       PASS
npm run test:standalone-small                                   PASS
npm run test:kernel:smoke                                       PASS
node tools/pskernel.ts status --json                           PASS, trusted-boundary / not-proven
```

## Non-claims

- This does not add Prop-valued Boolean theorem automation.
- This does not add `Decidable`, typeclass-driven Boolean operations, or polymorphic logic notation.
- This does not add Boolean inequality `!=`; it remains fail-closed.
- This does not prove Lean 4 equivalence.
- This does not change the K3-TB trusted-boundary label.

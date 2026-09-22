# ProofScript P4.72 — Nat Multiplication Sugar and Runtime

## Status

P4.72 extends the practical standalone PSC-1 MVP with checked Nat multiplication support.

Trust label remains unchanged:

- K3-TB trusted-boundary.
- Not fully formal K3.
- Not proven equivalent to the full Lean 4 kernel.
- Formal Lean 4 equivalence obligations proven in this slice: 0.

## What changed

P4.72 adds Lean-style multiplication syntax and execution:

```proofscript
function double(x: Nat): Nat := { x * 2 }
def six: Nat := { 2 * 3 }
def precedence: Nat := { 1 + 2 * 3 }
def grouped: Nat := { (1 + 2) * 3 }

theorem six_eq: six = 6 := by rfl
theorem precedence_eq: precedence = 7 := by rfl
theorem grouped_eq: grouped = 9 := by rfl
```

The parser lowers `x * y` to `Nat.mul(x, y)`. `*` binds tighter than `+`.

`Nat.mul` is added to the checked bootstrap foundation as a transparent definition over `Nat.rec` and `Nat.add`. JavaScript and TypeScript emission map checked Core `Nat.mul` applications to the standalone PSC-1 runtime helper `__ps.Nat_mul`.

## Files touched

- `packages/parser/src/index.ts`
- `packages/std/src/Bootstrap/Foundation.ps`
- `packages/std/core/bootstrap.pscore.json`
- `packages/runtime/src/index.ts`
- `packages/backend-typescript/src/index.ts`
- generated package `dist/` outputs after `npm run build`
- `tools/pslive-nat-mul-tests.ts`
- `tools/k1d-foundation-tests.ts`
- `package.json`
- documentation/proof-obligation wording that names the PSC-1 Nat subset

## Verification performed

Fast verification only, per user instruction.

```txt
npm run build -- --pretty false        PASS
npm run test:pslive:nat-mul            PASS
node tools/k1d-foundation-tests.ts    PASS
npm run test:pslive:nat-plus           PASS
npm run test:standalone-small          PASS
npm run test:kernel:smoke              PASS
node tools/pskernel.ts status --json  PASS, trusted-boundary / not-proven
```

## Not rerun

```txt
npm run verify:k3tb:publish            NOT RERUN; still requires PROOFSCRIPT_LEAN_BIN
full long matrix                       NOT RERUN; skipped for faster iteration
```

## Progress after P4.72

```txt
Standalone PSC-1 without Lean4:                 ~97.0%
PSC-1 small complete programming language:      ~71.0%
PSC-1 small theorem prover:                     ~62.0%
Full ProofScript compiler:                      ~59.8%
Full Lean-like ProofScript without Lean4:       ~13.7%
Formal Lean 4 equivalence:                      0 proven obligations
```

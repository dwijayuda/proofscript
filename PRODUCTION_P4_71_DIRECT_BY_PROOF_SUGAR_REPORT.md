# ProofScript P4.71 — Direct `by` Proof Sugar

## Summary

P4.71 adds a focused PSC-1 theorem-prover ergonomics slice: direct Lean-style `by` proof syntax without mandatory braces for the already-supported primitive proof steps.

New accepted syntax:

```proofscript
function addTwo(x: Nat): Nat := { x + 2 }
def seven: Nat := { addTwo 5 }

theorem seven_eq: seven = 7 := by rfl
theorem exact_seven_eq: seven = 7 := by exact rfl
```

The previous braced form remains accepted:

```proofscript
theorem seven_eq: seven = 7 := by { rfl }
```

This is syntax sugar only. It does not add new trusted proof rules and does not change the K3-TB trust boundary.

## Implementation

Changed parser proof-term handling so `by` can be followed by either:

1. a braced proof block: `by { rfl }`; or
2. a direct proof step: `by rfl`, `by exact rfl`, etc.

The direct form reuses the existing `parseProofStep` path, so proof checking still goes through the same elaborator/kernel verification flow.

## Regression

Added `tools/pslive-by-sugar-tests.ts` and `npm run test:pslive:by-sugar`.

The regression covers:

- `by rfl` acceptance;
- `by exact rfl` acceptance;
- JS backend skips theorem declarations as non-executable;
- JS executable values still run;
- TS backend emits typecheckable TypeScript;
- bad `by rfl` theorem rejection still fails closed.

## Verification

Fast verification only, per request to go faster with fewer tests:

```txt
npm run build -- --pretty false       PASS
npm run test:pslive:by-sugar          PASS
npm run test:standalone-small         PASS
npm run test:kernel:smoke             PASS
node tools/pskernel.ts status --json PASS, trusted-boundary / not-proven
```

Not rerun in this fast slice:

```txt
npm run verify:k3tb:publish           NOT RERUN; previously blocked by missing PROOFSCRIPT_LEAN_BIN
full long matrix                      NOT RERUN; intentionally skipped for faster iteration
```

## Trust status

P4.71 remains K3-TB trusted-boundary. It is not fully formal K3 and has 0 proven Lean 4 equivalence obligations.

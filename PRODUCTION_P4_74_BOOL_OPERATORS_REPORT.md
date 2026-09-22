# Production P4.74 — Boolean Operator Sugar

P4.74 adds a fast MVP language slice for PSC-1: Lean/JS-familiar Boolean operators `&&` and `||`.

## Feature

```proofscript
function and2(a: Bool, b: Bool): Bool := { a && b }
function or2(a: Bool, b: Bool): Bool := { a || b }
def choose: Nat := { if true && (false || true) then 7 else 9 }
theorem choose_eq: choose = 7 := by rfl
```

## Semantics

No new kernel primitive was added. The parser lowers:

- `a && b` to checked Boolean recursor sugar: `if a then b else false`
- `a || b` to checked Boolean recursor sugar: `if a then true else b`

`&&` binds tighter than `||`. Existing Core checking rejects non-Bool operands.

## Verification

Fast verification only:

- `npm run build -- --pretty false` — PASS
- `npm run test:pslive:bool-operators` — PASS
- `npm run test:standalone-small` — PASS
- `npm run test:kernel:smoke` — PASS
- `node tools/pskernel.ts status --json` — PASS, trusted-boundary / not-proven
- `unzip -tq` on the P4.74 archive — PASS

Not rerun: full long matrix, `verify:k3tb:publish`, reference-governance JSON hang smoke.

## Trust boundary

This remains K3-TB trusted-boundary work. It is not fully formal K3 and does not prove Lean 4 kernel equivalence.

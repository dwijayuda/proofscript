# P5.11 Int Operators Feature Report

## Status

P5.11 adds a bounded, type-directed PSC-1 operator slice for `Int` without claiming full Lean numeric typeclass overloading.

Trust status remains: **K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4**.

## Supported behavior

- `a + b` lowers to `Int.add(a, b)` when the expected type or operand evidence is `Int`.
- `a - b` lowers to `Int.sub(a, b)` when the expected type or operand evidence is `Int`.
- `a == b` lowers to `Int.beq(a, b)` when either operand is known or syntactically evident as `Int`.
- Nat operators still lower to `Nat.add`, `Nat.sub`, `Nat.mul`, and `Nat.beq` by default.
- The generated Core still uses checked bootstrap declarations and K3-TB kernel checking before JS/TypeScript emission.

## Non-goals

- No full Lean `OfNat`, `Neg`, `HAdd`, `HSub`, or `BEq` typeclass elaboration.
- No `Int *` operator yet.
- No Int ordering operators yet.
- No full Lean `Int.ofNat` / `Int.negSucc` constructor semantics.
- No formal Lean 4 equivalence proof.

## Verification

Primary focused command:

```bash
node tools/pslive-int-operator-tests.ts
```

Controlled P5 release command:

```bash
node tools/verify-p5-controlled-release.ts
```

Companion checks:

```bash
npm run test:pslive:language-fast
node tools/conformance-runner.ts
```

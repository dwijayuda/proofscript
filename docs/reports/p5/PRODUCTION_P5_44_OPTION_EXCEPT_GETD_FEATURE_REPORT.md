# Production P5.44 — Option.getD / Except.getD Default Extraction Helpers

P5.44 adds explicit PSC-1 default extraction helpers for already checked `Option` and `Except` values:

```ps
def a: Nat := { Option.getD(Nat, Option.some(Nat, 7), 99) }
def b: Nat := { Option.getD(Nat, Option.none(Nat), 99) }
def c: Nat := { Except.getD(String, Nat, Except.ok(String, Nat, 4), 99) }
def d: Nat := { Except.getD(String, Nat, Except.error(String, Nat, "bad"), 99) }
```

## Semantics

- `Option.getD(A, value, fallback)` returns the contained value for `Option.some(A, value)` and `fallback` for `Option.none(A)`.
- `Except.getD(E, A, value, fallback)` returns the contained value for `Except.ok(E, A, value)` and `fallback` for `Except.error(E, A, error)`.
- The fallback must type-check as the same `A` as the successful value.

## Implementation

This feature is implemented as checked bootstrap definitions over existing recursors:

- `Option.getD` uses `Option.rec`.
- `Except.getD` uses `Except.rec`.

JS/TypeScript emission routes checked Core calls to small runtime helpers after Core checking. The runtime helpers preserve the constructor validation already used by P5.43 predicates.

## Verification

```bash
npm run build -- --pretty false
node tools/pslive-option-except-getd-tests.ts
node tools/k1d-foundation-tests.ts
npm run test:architecture
node tools/typescript-migration-audit.ts
node tools/conformance-runner.ts
```

## Non-claims

P5.44 does not refactor the kernel, does not restructure kernel reducers, does not add a new kernel primitive rule, and does not claim full Lean library/typeclass equivalence. It remains K3-TB trusted-boundary evidence only.

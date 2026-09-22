# Production P5.43 — Option/Except Predicate Helpers

P5.43 adds explicit PSC-1 predicate helpers for already checked `Option` and `Except` values:

```ps
Option.isSome(A, value): Bool
Option.isNone(A, value): Bool
Except.isOk(E, A, value): Bool
Except.isError(E, A, value): Bool
```

## Implementation

The helpers are checked bootstrap definitions in `packages/std/src/Bootstrap/Foundation.ps`, expressed through existing checked `Option.rec` and `Except.rec`. They are not new kernel primitives.

The TypeScript backend routes checked Core calls to small runtime helpers in `packages/runtime/src/source.ts` after Core checking. Runtime helpers validate the frozen PSC-1 tagged-record shape before reading constructor tags.

## Verification

Primary test:

```sh
npm run test:pslive:option-except-predicates
```

The smoke test covers JavaScript emission, TypeScript emission/compile/execute, `by rfl` reduction, and negative type checks for passing `Except` where `Option` is expected and `Option` where `Except` is expected.

## Trust boundary

P5.43 does not refactor the kernel, does not restructure kernel reducers, and does not claim full Lean library/typeclass equivalence. It remains K3-TB trusted-boundary evidence only.

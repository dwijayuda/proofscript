# P5.13 Except(E, A) Feature Report

## Scope

P5.13 promotes a bounded Result-style `Except(E, A)` feature through the canonical PSC-1 path. It is intentionally small and does not claim full Lean `Except` library coverage, JavaScript exception semantics, IO exception conversion, monadic `do`, or formal Lean 4 equivalence.

## Supported Surface

```ts
def okSeven: Except(String, Nat) := { Except.ok(String, Nat, 7) }
def errorMessage: Except(String, Nat) := { Except.error(String, Nat, "bad") }

function unwrapOrZero(result: Except(String, Nat)): Nat := {
  match (result) {
    | Except.error message => 0
    | Except.ok value => value
  }
}
```

## Architecture Path

```text
parser/tokenizer
  -> existing name/application/match syntax
  -> elaborator resolves checked bootstrap constructors and recursor
  -> Core constructor/recursor applications
  -> K3-TB kernel recheck and replay
  -> JS/TypeScript tagged-record emission
```

No backend/runtime shortcut is allowed to create or inspect `Except` values before checked Core exists. The feature uses existing non-indexed inductive, constructor, recursor, match, JS, and TypeScript machinery.

## Checked Bootstrap

`packages/std/src/Bootstrap/Foundation.ps` now declares:

```ts
inductive Except(E: Type, A: Type): Type {
  | error(error: E);
  | ok(value: A);
}
```

`packages/std/core/bootstrap.pscore.json` was regenerated from that source and remains inert checked Core data loaded and rechecked by `@proofscript/environment`.

## Verification

Focused feature command:

```bash
node tools/pslive-except-tests.ts
```

The test covers:

- `Except(String, Nat)` constructor values;
- exhaustive match returning `Nat` and `Bool`;
- JS execution smoke;
- TypeScript compile/run smoke;
- `by rfl` theorem smoke over reduced matches;
- rejection of non-exhaustive matches;
- rejection of wrong `Except.ok` payload type;
- rejection of wrong `Except.error` payload type.

Companion gates:

```bash
npm run build -- --pretty false
node tools/k1d-foundation-tests.ts
npm run test:pslive:language-fast
npm run test:feature-promotion
npm run test:verification-matrix
npm run test:production-traceability
npm run test:development-workflow
npm run test:production-readiness
node tools/verify-p5-controlled-release.ts
node tools/conformance-runner.ts
```

## Trust Boundary

Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4. Formal Lean 4 equivalence remains 0 proven obligations.

## Deferred Work

- full Lean `Except` API;
- `Except.map`, `bind`, `mapError`, or applicative/monadic library functions;
- `EIO.ofExcept` / `IO.ofExcept` integration;
- `do` notation over `Except`;
- generic theorem library around `Except`;
- formal proof of Lean 4 equivalence.

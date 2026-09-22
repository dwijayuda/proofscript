# Production P5.17 Do-Notation Feature Report

Status: **focused feature implemented**.

P5.17 adds minimal `do { x <- value; body }` notation over expected `Option(A)` and `Except(E, A)` result types. The notation is intentionally bounded sugar over the already checked `Option.bind` and `Except.bind` declarations from P5.16.

## Supported

- `do { x <- Option.some(Nat, 2); Option.some(Nat, x + 1) }`
- multiple sequential Option binds
- `do { x <- Except.ok(String, Nat, 4); Except.ok(String, Nat, x + 1) }`
- Except error short-circuit through checked `Except.bind` reduction
- JS execution smoke
- TypeScript compile/run smoke
- `by rfl` smoke for reducible checked do results
- rejection for missing expected monad result, mixed Option/Except blocks, and non-monadic final expressions

## Architecture

Parser support lives in `packages/parser/src/index.ts` and creates a `SurfaceTerm` do block declared in `packages/syntax/src/index.ts`. The elaborator in `packages/elaborator/src/index.ts` requires an expected `Option(A)` or `Except(E, A)` result type, checks each bind value through ordinary Core elaboration/inference, and lowers each statement into checked applications of `Option.bind` or `Except.bind` with a lambda body.

No backend/runtime shortcut is introduced. `packages/backend-typescript/src/termEmitter.ts` and `packages/runtime/src/source.ts` keep using the existing bind Core/runtime path from P5.16.

## Non-claims

P5.17 is not full Lean do-notation, not Monad typeclass elaboration, not IO support, not `return` syntax, not generalized statement sequencing, and not a formal Lean 4 equivalence proof. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## Verification

Focused feature test: `tools/pslive-do-notation-tests.ts`.

Controlled release gate: `tools/verify-p5-controlled-release.ts`.

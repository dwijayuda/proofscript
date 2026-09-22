# P5.59 Option.any Feature Report

P5.59 adds `Option.any(A, p, value): Bool` as a checked-bootstrap PSC-1 helper.

## Semantics

- `Option.any(A, p, Option.none(A))` reduces to `Bool.false`.
- `Option.any(A, p, Option.some(A, x))` reduces to `p(x)`.

The declaration is implemented in `packages/std/src/Bootstrap/Foundation.ps` using existing `Option.rec`; it adds no new kernel primitive, no kernel refactor, and no kernel restructuring.

## Runtime / backend

JS/TypeScript emission maps checked Core calls to `__ps.Option_any(predicate)(value)` after Core checking. The runtime validates the value is an `Option` tagged record and validates the predicate returns a ProofScript `Bool`.

## Verification evidence

- `tools/pslive-option-any-tests.ts`
- `tools/k1d-foundation-tests.ts`
- `packages/std/core/bootstrap.pscore.json`
- `packages/backend-typescript/src/termEmitter.ts`
- `packages/runtime/src/source.ts`
- `packages/runtime/src/profile.ts`

## Trust status

K3-TB trusted-boundary only. This is not fully formal K3, not full Lean 4 equivalence, and adds 0 formal Lean 4 equivalence proven obligations.

## Elaborator refactor

P5.59 also extracts program/declaration orchestration from `packages/elaborator/src/index.ts` into `packages/elaborator/src/programElaboration.ts`. This is behavior-preserving and keeps the kernel unchanged.

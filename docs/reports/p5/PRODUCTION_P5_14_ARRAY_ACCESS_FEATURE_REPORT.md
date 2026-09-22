# P5.14 Array.size / Array.get? Feature Report

## Scope

P5.14 promotes a bounded `Array.size` / `Array.get?` feature through the canonical PSC-1 path. It is intentionally small and does not claim full Lean `Array` library coverage, persistent-array internals, mutation, push/pop, `get` with proof bounds, `ForIn`, IO, or formal Lean 4 equivalence.

## Supported Surface

```ts
def xs: Array(Nat) := { [1, 2, 3] }
def empty: Array(Nat) := { [] }

def xsSize: Nat := { Array.size(Nat, xs) }
def emptySize: Nat := { Array.size(Nat, empty) }
def first: Option(Nat) := { Array.get?(Nat, xs, 0) }
def missing: Option(Nat) := { Array.get?(Nat, xs, 3) }

theorem xs_size_rfl: xsSize = 3 := by rfl
theorem first_rfl: first = Option.some(Nat, 1) := by rfl
theorem missing_rfl: missing = Option.none(Nat) := by rfl
```

## Architecture Path

```text
parser/tokenizer
  -> Lean-style ? identifier tail for Array.get?
  -> existing name/application syntax
  -> elaborator emits ordinary checked Core applications
  -> checked bootstrap declarations for Array.size and Array.get?
  -> K3-TB kernel recheck plus bounded primitive reduction over checked Array.mk/List payloads
  -> JS/TypeScript emission after Core checking
```

No backend/runtime shortcut is allowed to inspect an unchecked array. Runtime helpers only execute already-checked emitted Core terms.

## Checked Bootstrap and Kernel Boundary

`packages/std/src/Bootstrap/Foundation.ps` declares:

```ts
axiom Array.size(A: Type, xs: Array(A)): Nat;
axiom Array.get?(A: Type, xs: Array(A), index: Nat): Option(A);
```

`packages/std/core/bootstrap.pscore.json` was regenerated from that source. The trusted K3-TB checker only reduces these operations when the array argument reduces to `Array.mk(A, finiteList)` and the supplied element type agrees definitionally with the checked payload type.

## Verification

Focused feature command:

```bash
node tools/pslive-array-access-tests.ts
```

The test covers:

- `Array.size(Nat, xs)` over non-empty and empty arrays;
- `Array.get?(Nat, xs, 0)` and `Array.get?(Nat, xs, 1)` returning `Option.some`;
- out-of-bounds `Array.get?(Nat, xs, 3)` returning `Option.none`;
- JS execution smoke;
- TypeScript compile/run smoke;
- `by rfl` theorem smoke over size and get reductions;
- rejection of a String index;
- rejection of a non-array argument to `Array.size`.

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

- full Lean `Array` implementation details;
- mutation, push/pop, set, map, fold, and iteration APIs;
- proof-bounded `Array.get`;
- `ForIn` and monadic traversal;
- array extensionality theorem library;
- formal proof of Lean 4 equivalence.

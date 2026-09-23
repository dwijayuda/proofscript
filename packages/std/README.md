# @proofscript/std

Source-controlled ProofScript bootstrap declarations and their independently kernel-checked core artifact.

Current bootstrap (`K3c-section-vars0`):

- `Eq`, generated `Eq.refl` and `Eq.rec`;
- `Nat`, generated constructors and `Nat.rec`;
- `Bool`, generated constructors and `Bool.rec`;
- `Unit`, generated `Unit.unit` and `Unit.rec`;
- `Int`, `String`, `Option(A)`, `List(A)` plus bounded `List.map` / `List.foldl` / `List.length` / `List.range` / `List.replicate` / `List.toArray` / `List.isEmpty` / `List.head?` / `List.get?` / `List.take` / `List.takeWhile` / `List.dropWhile` / `List.drop` / `List.tail?` / `List.reverse` / `List.any` / `List.all` / `List.find?`, `Array(A)`, bounded `Array.size` / `Array.range` / `Array.replicate` / `Array.toList` / `Array.get?` / `Array.take` / `Array.takeWhile` / `Array.dropWhile` / `Array.drop` / `Array.head?` / `Array.tail?` / `Array.map` / `Array.foldl` / `Array.reverse` / `Array.any` / `Array.all` / `Array.find?`, `Option.map`, `Except.map`, `Option.bind`, `Except.bind`, and `Except(E, A)` bounded PSC-1 bootstrap declarations;
- transparent `Nat.add`, `Nat.pred`, `Nat.sub`, `Nat.mul`, `Nat.leb`, `Nat.beq`, `Nat.ltb`, `Bool.not`, and `Bool.xor` defined through `Nat.rec` / checked Boolean composition.

`core/bootstrap.pscore.json` is inert data and is rechecked when loaded by `@proofscript/environment`. It is not a trusted JavaScript implementation of these types.

`bootstrap-manifest.json` binds the current artifact hash and records the intended Lean 4.33.1 built-in correspondence. That correspondence is not marked validated until the pinned differential/oracle corpus runs successfully.


## Production Role

Provides canonical PSC-1 bootstrap declarations and checked artifacts.

## Trust Boundary

Tier: language  
Lifecycle: canonical  
Trust boundary: Checked bootstrap source/artifact, not unchecked runtime semantics.

This package is not the proof authority; the kernel remains the final checker for trusted Core validity.

Current trust claim: **K3-TB trusted-boundary**. This is not fully formal K3 and is not proven equivalent to Lean 4.

## Extension Points

Use the feature promotion gate before adding or promoting language behavior. New feature work should keep this package inside its documented role and update `config/feature-promotion-gate.json` plus the verification matrix when support changes.

## Verification

Run `npm run test:architecture` after changing this package. Feature work should also run the feature-specific parser/elaborator/backend/runtime smoke named by the feature promotion gate.

## Non-Claims

This README does not claim full Lean 4 compatibility, fully formal K3, self-hosting, or Lean 4 kernel equivalence. Formal Lean 4 equivalence remains **0 proven obligations** until proved by a separate formal campaign.

## P5.6 Option, P5.7 List, P5.12/P5.14 Array, and P5.13 Except Bootstrap

The checked bootstrap prelude includes `Option(A)` with explicit `Option.none(A)` / `Option.some(A, value)` constructors, `List(A)` with explicit `List.nil(A)` / `List.cons(A, head, tail)` constructors plus bounded `List.map(A, B, f, xs)` / `List.foldl(A, B, f, init, xs)` / `List.isEmpty(A, xs)` / `List.find?(A, p, xs)` / `List.tail?(A, xs)` / `List.take(A, xs, count)` / `List.takeWhile(A, p, xs)` / `List.dropWhile(A, p, xs)` / `List.drop(A, xs, count)` / `List.replicate(A, count, value)` / `List.toArray(A, xs)`, `Array(A)` with explicit `Array.mk(A, data)` over `List(A)` plus bounded `Array.size(A, xs)` / `Array.get?(A, xs, index)` / `Array.map(A, B, f, xs)` / `Array.foldl(A, B, f, init, xs)` / `Array.find?(A, p, xs)` / `Array.tail?(A, xs)` / `Array.take(A, xs, count)` / `Array.takeWhile(A, p, xs)` / `Array.dropWhile(A, p, xs)` / `Array.drop(A, xs, count)` / `Array.replicate(A, count, value)` / `Array.toList(A, xs)` API declarations, `Option.map(A, B, f, value)` / `Option.bind(A, B, value, f)`, and `Except(E, A)` with explicit `Except.error(E, A, error)` / `Except.ok(E, A, value)` constructors plus `Except.map(E, A, B, f, value)` / `Except.bind(E, A, B, value, f)`. This is a conservative PSC-1 form with erased uniform parameters after Core checking.

P5.53 adds `Except.toError(E, A, value): Option(E)` as a checked bootstrap helper over `Except.rec`.

## P5.54 Except.getErrorD

P5.54 adds `Except.getErrorD(E, A, value, fallback): E` as a checked bootstrap helper over `Except.rec`. It returns the error payload from `Except.error` and the supplied fallback for `Except.ok`, with no kernel refactor or new primitive.

## P5.56 Except.swap

The checked bootstrap now includes `Except.swap(E, A, value): Except(A, E)` over existing `Except.rec`. It is part of the PSC-1 standard bootstrap artifact and does not add a kernel primitive.

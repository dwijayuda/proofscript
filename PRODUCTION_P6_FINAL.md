# Production P6 Final Candidate Report

Status: VERIFIED_CANDIDATE
Profile: PRODUCTION-P6-bounded-string
Patch level: P6.19 v71 trusted-boundary K3-TB default kernel + strict Lean environment doctor + default consistency guard + CI publish-parity gate + one-command doctor guard
Core: v71 trusted-boundary K3-TB default
TCB changes: v71 replaces v68 as practical/default kernel; not fully formal K3

## Feature summary

Production P6 introduces a bounded executable `String` slice in the unified production path:

- `String` values in the implemented executable slice lower to checked Core constructors in `ProofScript.Core.P6.String`.
- Primitive bounded `String == String` lowers to `ProofScript.Core.P6.String.beq`, an ordinary checked Core definition over the finite artifact literal domain.
- Bool branching, first-class monomorphic functions, local lets, and closures may carry bounded String values.
- TypeScript output uses native `string` and `===` for the same checked slice.
- P6.1 canonicalizes equivalent portable Lean escape spellings before constructor assignment, preserving equality for `"A"`, `"\x41"`, and `"\u0041"` across Core and TypeScript.
- P6.2 accepts literal-only `++` by folding decoded operands into one canonical literal before Core lowering; non-literal/runtime append remains fail-closed.
- P6.3 accepts literal-only `String.length` by folding decoded portable literal operands, including folded concat outputs, to checked Nat character-count literals; non-literal/runtime length remains fail-closed.
- P6.7 accepts literal-only `String.utf8ByteSize` by folding decoded portable literal operands, including folded concat outputs, to checked Nat byte-count literals; non-literal/runtime byte-size queries remain fail-closed.
- P6.8 accepts literal-only `String.append` by folding decoded portable literal operands to a canonical checked String literal; nested literal-only consumers may use this folded result; non-literal/runtime append remains fail-closed.
- P6.9 accepts literal-only `String.take` and `String.drop` by folding decoded portable String operands plus literal/foldable Nat counts to canonical checked String literals; runtime/non-literal subjects or counts remain fail-closed.
- P6.10 accepts literal-only `String.takeRight` and `String.dropRight` by folding decoded portable String operands plus literal/foldable Nat counts to canonical checked String literals; runtime/non-literal subjects or counts remain fail-closed.
- P6.4 accepts literal-only `String.isEmpty` by folding decoded portable literal operands, including folded concat outputs, to checked Bool constructors; non-literal/runtime predicates remain fail-closed.
- P6.5 accepts literal-only `String.startsWith` / `String.endsWith` by folding decoded portable literal operands, including folded concat outputs, to checked Bool constructors; non-literal/runtime predicate operands remain fail-closed.
- P6.6 accepts literal-only `String.contains` by folding decoded portable literal operands, including folded concat outputs, to checked Bool constructors; non-literal/runtime predicate operands remain fail-closed.
- P6.11 accepts literal-only `String.beq` by folding decoded portable literal operands and nested folded String values to checked Bool constructors; non-literal/runtime equality-function operands remain fail-closed.
- P6.12 accepts literal-only `String.isPrefixOf` by folding decoded portable literal operands and nested folded String values to checked Bool constructors with Lean-compatible prefix-first argument order; non-literal/runtime operands remain fail-closed.
- P6.13 accepts literal-only `String.stripPrefix` and `String.stripSuffix` by folding decoded portable literal operands and nested folded String values to checked bounded String constructors; non-literal/runtime operands remain fail-closed.
- P6.14 accepts literal-only `String.isNat` by folding decoded portable literal operands and nested folded String values to checked Bool constructors for non-empty decimal Nat strings; non-literal/runtime operands remain fail-closed.

## Assurance summary

The P6 fixture validates checked Core acceptance with zero assumptions, independent `.pscore` replay, TypeScript runtime behavior, finite-domain constructor canonicalization, literal-only concat folding, literal-only length folding, literal-only isEmpty folding, literal-only UTF-8 byte-size folding, literal-only isEmpty folding, literal-only prefix/isPrefixOf/suffix/contains/String.beq predicate folding, literal-only stripPrefix/stripSuffix/isNat folding, non-literal concat/length/utf8ByteSize/isEmpty/prefix/isPrefixOf/suffix/contains/String.beq/stripPrefix/stripSuffix rejection, visibility inherited from P5, and tamper rejection for both the Core String inductive and equality body. The cumulative production verification wrapper passed all 30 gates after a fresh build in this sandbox, including the new K3-TB Lean environment doctor regression.

## Scope limits

P6 does not yet implement full Lean `String`, Unicode/string APIs, arbitrary/runtime append beyond literal-only folding, runtime String length, runtime String byte-size queries, arbitrary/runtime String predicates or strip functions, interpolation, arrays, byte arrays, IO/effects, separate Core module artifacts, selective export artifacts, or full frontend-to-Core coverage. Literal-only `++`, literal-only `String.append`, literal-only `String.take` / `String.drop`, literal-only `String.takeRight` / `String.dropRight`, literal-only `String.stripPrefix` / `String.stripSuffix`, literal-only `String.length`, literal-only `String.utf8ByteSize`, literal-only `String.isEmpty`, literal-only `String.startsWith` / `String.endsWith`, literal-only `String.contains`, literal-only `String.isPrefixOf`, and literal-only `String.beq` are frontend/backend constant-folding slices, not general String computation.


## P6.17 default-kernel consistency

P6.17 adds `test:v71:k3tb-default-consistency` to keep current/default metadata aligned with `KERNEL-level-instantiation-conformance1` / Core v71 / trusted-boundary K3-TB. It rejects package/provenance version drift and stale active-bridge Core v68 wording. This does not change trusted kernel semantics and does not claim fully formal K3.


## P6.18 CI publish parity

P6.18 adds `test:v71:k3tb-ci-publish-parity` and includes it in `npm run verify:production:no-build`. The guard statically verifies that GitHub Actions runs the local production verifier and the exact `npm run verify:k3tb:publish` path after installing pinned Lean 4.33.1. The CI publish preflight does not run `npm publish`; it preserves the trusted-boundary K3-TB / not fully formal K3 label.


## P6.19 one-command doctor guard

P6.19 makes `npm run verify:k3tb` run the strict Lean environment doctor before Lean-dependent K3-TB verification. Missing or mismatched Lean now fails closed with `K3TB_LEAN_ENV_STATUS=...`, expected Lean 4.33.1, expected commit, and next action instead of an opaque assertion. This remains trusted-boundary K3-TB and not fully formal K3.

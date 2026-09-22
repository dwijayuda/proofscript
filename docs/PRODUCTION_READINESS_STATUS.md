# Production Readiness Status

ProofScript is currently an **architecture-gated pre-production** implementation of the PSC-1 language path. This document explains what is canonical, what is guarded by machine checks, what remains trusted-boundary only, and how new features should be added.

## Canonical PSC-1 Production Path

The canonical production path is intentionally smaller than the whole repository:

```txt
.ps source
  -> packages/parser
  -> packages/elaborator
  -> packages/std / packages/environment
  -> packages/kernel
  -> packages/kernel-codec / packages/certificates / packages/verifier
  -> packages/backend-typescript
  -> packages/runtime
```

The machine-readable source of truth is `config/package-classification.json`. The architecture gate rejects unclassified packages, undeclared internal dependencies, experimental packages in the stable PSC-1 path, and trusted-boundary overclaims.

## Production Readiness Command

Use one command to see the current architecture status:

```sh
npm run production:status
npm run production:status:json
npm run test:production-readiness
```

`production:status` combines these inputs:

```txt
config/package-classification.json
config/feature-promotion-gate.json
config/verification-matrix.json
node tools/pskernel.ts status --json
```

The command is also part of `npm run test:architecture`, so production-readiness drift is caught as an architecture failure.

## What Is Enforced

The current production-readiness gate checks that:

```txt
package roles are classified and dependency-limited
supported feature families carry required evidence
production claims map to concrete verification commands
kernel status remains K3-TB trusted-boundary / not-proven
formal Lean 4 equivalence obligations remain exactly 0 until actually proven
required production docs exist and state the non-claims clearly
```

## Feature Addition Gate

New PSC-1 features must be promoted through `config/feature-promotion-gate.json`. A supported feature needs parser/syntax evidence, elaborator or kernel evidence, checked-bootstrap or proof-obligation story, backend/runtime evidence when executable, JS and TypeScript smoke, theorem/reduction smoke when applicable, negative fail-closed tests, governance coverage, and docs/reports.

Recommended feature path:

```txt
1. Add a failing feature test.
2. Add syntax/parser support only if needed.
3. Elaborate into checked Core or checked bootstrap declarations.
4. Add runtime/backend support only after the checked Core story exists.
5. Add negative fail-closed tests.
6. Add the feature-promotion manifest entry.
7. Add the verification-matrix claim when the feature becomes release-relevant.
8. Run npm run test:architecture and the feature-specific smoke.
```

## What Is Still Not Proven

The current trust claim is **K3-TB trusted-boundary**. This is deliberately not the same as fully formal K3 and not the same as Lean 4 equivalence.

Current non-claims:

```txt
not fully formal K3
not proven equivalent to Lean 4
not a complete Lean 4 implementation
not self-hosting
not a formal proof that the TypeScript backend preserves Lean semantics
not a formal proof that the runtime implements all executable semantics
```

Formal Lean 4 equivalence remains **0 proven obligations** until actual formal obligations are discharged.

## Current Readiness Judgment

The repository is ready for **controlled feature development** after P5.0 because parser/backend/runtime are modular, the elaborator has been substantially split, package roles are classified, feature promotion is enforced, and production claims map to commands.

It is not yet ready for broad public production claims because the formal trust story remains trusted-boundary engineering evidence rather than a mechanized equivalence proof.

Best next engineering work:

```txt
P5.1: package-level READMEs / contributor map for canonical PSC-1 packages
P5.3: feature proof-obligation linkage
P5.5: feature scaffold generator tied to feature/proof gates
P5.6: Option through the feature promotion gate
P5.7: psverify / psc CLI consolidation
```

## P5.1 Canonical Package Documentation Gate

P5.1 adds `tools/check-canonical-package-docs.ts` and `docs/PRODUCTION_CANONICAL_PACKAGE_GUIDE.md`.

The production readiness gate now checks that every canonical PSC-1 package README documents:

```text
Production Role
Trust Boundary
Extension Points
Verification
Non-Claims
```

This improves explainability for contributors and future agents. It does not upgrade the trust claim: ProofScript remains K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## P5.2 Proof Obligation Ledger

P5.2 adds a machine-checked proof-obligation ledger. Production readiness now includes a check that formal Lean 4 equivalence remains explicitly not proven, while the required proof obligations are listed with evidence and next-proof-work.

## P5.3 Feature Proof-Obligation Linkage

P5.3 connects the feature promotion gate to the formal proof-obligation ledger. Every supported PSC-1 production feature now lists `proofObligationIds` in `config/feature-promotion-gate.json`, and `tools/check-feature-promotion.ts` rejects supported features that omit required obligations.

This improves production readiness in three ways:

```text
production-grade: supported features have auditable proof-roadmap links
explainable: contributors can see why each feature is only K3-TB evidence today
provable direction: feature support cannot bypass kernel/core/elaborator/backend/runtime obligations
```

This still does not prove Lean 4 equivalence. It keeps the claim at K3-TB trusted-boundary with 0 formally proved Lean-equivalence obligations.

## P5.4 Production Traceability Bundle

P5.4 adds `config/production-traceability-bundle.json` and `tools/check-production-traceability.ts`.

This links package classification, feature promotion, verification claims, canonical package docs, and the proof-obligation ledger into one machine-checked production map. It improves explainability and feature-addition safety, while preserving the K3-TB non-claim: traceability is not itself a formal proof and formal Lean 4 equivalence remains 0 proven obligations.


## P5.5 Development Workflow Gate

P5.5 adds `config/development-workflow.json` and `tools/check-development-workflow.ts`.
This gate defines the production development workflow for adding features through proposal, red tests, checked Core/bootstrap evidence, backend/runtime evidence, proof-obligation linkage, governance, traceability, and release reporting.

This improves production-grade architecture, explainability, and feature-addition safety. It remains K3-TB trusted-boundary and does not prove full Lean 4 equivalence.

## P5.6 Option Feature

P5.6 validates the production workflow with a real small feature: checked `Option(A)`, `Option.none(A)`, `Option.some(A, value)`, and exhaustive matches over non-indexed parameterized inductives. The feature is tracked by the feature-promotion gate, verification matrix, production traceability bundle, and proof-obligation linkage.

This does not prove Lean 4 equivalence. The kernel remains K3-TB trusted-boundary.


## P5.6.2 Controlled Baseline Reconciliation

P5.6.2 keeps the P5.6 Option feature as the current controlled-feature baseline and separates it from inherited P6/v71 publish gates that do not define the P5 release boundary. The P5.6.2 baseline is architecture-gated pre-production: it is suitable for controlled PSC-1 feature development, but it is not a full public production claim.

Verified P5-owned behavior includes checked `Option(A)`, `Option.none(A)`, `Option.some(A, value)`, exhaustive matching over `Option(Nat)`, JS execution smoke, TypeScript compile smoke, `by rfl` theorem smoke, non-exhaustive match rejection, and wrong-payload rejection.

Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4. Formal Lean 4 equivalence remains 0 proven obligations.

## P5.7 List(Nat) Feature

P5.7 keeps the K3-TB honesty boundary and adds a real language feature: checked `List(Nat)` construction, match, bounded structural recursion, JS execution, TypeScript compile/run, and `by rfl` smoke. Inherited P6/v71 gates remain outside this P5.7 release boundary.

## P5.8 Minimal String Feature

P5.8 keeps the K3-TB honesty boundary and adds a real language feature: checked `String` bootstrap type, source string literals, Core `lit.str` typing in the trusted kernel, JS execution, TypeScript compile/run, `by rfl` smoke, and fail-closed negative tests. Full Lean String internals, Unicode APIs, concatenation/library functions, and String pattern matching remain deferred.


## P5.11 Minimal Int Arithmetic Feature

P5.11 keeps the K3-TB honesty boundary and adds a real language feature: checked `Int` bootstrap type, source positive/negative integer literals, Core `lit.int` typing in the trusted kernel, JS execution, TypeScript compile/run, `by rfl` smoke, and fail-closed negative tests. Full Lean Int arithmetic, ordering, conversion APIs, OfNat/Neg typeclass elaboration, and Int internals remain deferred.


## P5.12 Array(Nat) Feature

P5.12 adds expected-type-directed `Array(Nat)` literals using the canonical PSC-1 pipeline. Source `[]` and `[1, 2, 3]` parse as array literal terms, elaborate only when the expected type is `Array(A)`, lower to checked `Array.mk(A, List...)` Core, replay through the K3-TB kernel, and emit through the existing JS/TypeScript constructor encoding. This is not the full Lean Array API.


## P5.13 Except(E, A) Feature

P5.13 adds a bounded Result-style `Except(E, A)` feature using the canonical PSC-1 pipeline. Source calls to `Except.error(E, A, error)` and `Except.ok(E, A, value)` elaborate to checked Core constructor applications from the checked bootstrap, exhaustive `Except(String, Nat)` matches lower through the existing non-indexed recursor path, and JS/TypeScript emission uses the existing tagged-record constructor encoding. This is not the full Lean Except API and it is not JavaScript exception semantics. IO exception conversion, monadic do support, broader polymorphic library functions, and full Lean equivalence remain deferred.

## P5.14 Array.size / Array.get? Feature

P5.14 adds bounded Array access through the canonical PSC-1 pipeline. Source `Array.size(A, xs)` and `Array.get?(A, xs, index)` parse as ordinary calls with Lean-style `?` identifier tails, elaborate to checked bootstrap constants, replay through the K3-TB kernel, and execute only after Core checking. Kernel reduction is intentionally narrow: it computes only for checked `Array.mk(A, finite List(A))` payloads and Nat indices. This is not the full Lean Array API; mutation, push/pop, dependent get, bounds proofs, ForIn, and persistent-array internals remain deferred.


## P5.15 Option.map / Except.map Feature

P5.15 adds explicit `Option.map(A, B, f, value)` and `Except.map(E, A, B, f, value)` support over checked constructor values. P5.16 adds explicit `Option.bind(A, B, value, f)` and `Except.bind(E, A, B, value, f)` support over checked constructor values. This remains K3-TB trusted-boundary evidence, not a formal Lean 4 equivalence proof.


## P5.14 Array.size / Array.get? Feature

P5.14 added bounded `Array.size(A, xs)` and `Array.get?(A, xs, index)` over checked `Array.mk`/`List` payloads. This historical section is retained for production-readiness continuity.


## P5.16 Option.bind / Except.bind Feature

P5.16 adds explicit `Option.bind(A, B, value, f)` and `Except.bind(E, A, B, value, f)` support over checked constructor values. It reuses the existing application syntax, elaborates to ordinary checked Core applications, checks the bootstrap declarations, reduces only checked constructor-shaped values in the K3-TB kernel, and emits JS/TypeScript helpers only after Core checking. Full Monad/typeclass support, inferred bind syntax, and full Lean do-notation remain deferred. P5.17 adds only minimal checked sugar over explicit bind.

Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.


## P5.17 Minimal Do-Notation Feature

P5.17 adds minimal `do { x <- value; body }` notation over checked `Option.bind` and `Except.bind`. The parser creates a `do` surface term, the elaborator requires an expected `Option(A)` or `Except(E, A)` result type, checks each bound value as the same monad family, and lowers the block to ordinary checked Core applications of `Option.bind` or `Except.bind` with kernel-checked lambda bodies. JS/TypeScript backend emission uses the existing bind helpers only after Core checking.

This is intentionally not full Lean do-notation, Monad typeclass elaboration, IO, `return`, generalized statement sequencing, or inferred monad syntax. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.


## P5.18 Array.map Feature

P5.18 adds explicit `Array.map(A, B, f, xs)` over checked finite `Array.mk(A, List...)` payloads. The checked bootstrap declares the API, the K3-TB kernel validates the application before reducing it to `Array.mk(B, mapped List...)`, and JS/TypeScript emission uses a runtime helper only after Core checking. This is not full Lean Array/Functor semantics. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.


## P5.19 List.map Feature

P5.19 adds explicit `List.map(A, B, f, xs)` over checked finite `List(A)` constructor payloads. The checked bootstrap declares the API, the K3-TB kernel validates the application before reducing it to a rebuilt `List(B)`, and JS/TypeScript emission uses a runtime helper only after Core checking. This is not full Lean List/Functor/typeclass semantics. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.


## P5.20 List.foldl Feature

P5.20 adds explicit `List.foldl(A, B, f, init, xs)` over checked finite `List(A)` constructor payloads. The checked bootstrap declares the API, the K3-TB kernel validates the full application before reducing it by applying the already-checked curried function left-to-right, and JS/TypeScript emission uses `List_foldl` only after Core checking. This is not full Lean List/Foldable/Functor/typeclass semantics. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## P5.22 Array.foldl Feature
- P5.22 List.filter / Array.filter Feature

P5.22 adds explicit `Array.foldl(A, B, f, init, xs)` over checked finite `Array.mk(A, List(A))` payloads. The checked bootstrap declares the API, the K3-TB kernel validates the full application before reducing it by applying the already-checked curried function left-to-right over the Array backing list, and JS/TypeScript emission uses `Array_foldl` only after Core checking. This is not full Lean Array/Foldable/Functor/typeclass semantics. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.


## P5.21 Array.foldl Feature

Retained from the previous controlled baseline.

## P5.23 List.append / Array.append Feature

P5.23 adds explicit `List.append(A, left, right)` and `Array.append(A, left, right)` over checked finite `List` constructor payloads and `Array.mk(A, List(A))` payloads. The checked bootstrap declares the APIs, the K3-TB kernel validates complete applications before reducing by concatenating finite payloads, and JS/TypeScript emission uses `List_append` / `Array_append` only after Core checking. This is not full Lean Append/Monoid/Foldable/Functor/typeclass semantics. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## P5.24 List.length / Array.isEmpty Feature

P5.24 adds explicit `List.length(A, xs)` and `Array.isEmpty(A, xs)` over checked finite `List` constructor payloads and `Array.mk(A, List(A))` payloads. The checked bootstrap declares the APIs, the K3-TB kernel validates complete applications before reducing to a Nat literal or Bool constructor, and JS/TypeScript emission uses `List_length` / `Array_isEmpty` only after Core checking. This is not full Lean collection/typeclass/library support. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.


## P5.25 List.reverse / Array.reverse Feature

P5.25 adds explicit `List.reverse(A, xs)` and `Array.reverse(A, xs)` over checked finite `List` constructor payloads and `Array.mk(A, List(A))` payloads. The checked bootstrap declares the APIs, the K3-TB kernel validates complete applications before reversing finite payloads, and JS/TypeScript emission uses `List_reverse` / `Array_reverse` only after Core checking. This is not full Lean collection/typeclass/library support. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## P5.26 List.any / List.all / Array.any / Array.all Feature

P5.26 adds explicit `List.any(A, p, xs)`, `List.all(A, p, xs)`, `Array.any(A, p, xs)`, and `Array.all(A, p, xs)` over checked finite `List` constructor payloads and `Array.mk(A, List(A))` payloads. The checked bootstrap declares the APIs, the K3-TB kernel validates complete applications before traversing finite payloads, predicates must already type-check as `A -> Bool`, and JS/TypeScript emission uses `List_any`, `List_all`, `Array_any`, and `Array_all` only after Core checking. Empty cases follow Lean-style collection conventions for this explicit bounded primitive: `any = false`, `all = true`. This is not full Lean collection/typeclass/library support. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.


## P5.27 TypeScript Source Migration

P5.27 migrates repository-owned JavaScript/MJS/CJS source scripts and config examples to TypeScript/CTS while preserving the P5.26 List/Array any/all language baseline. The migration is validated by `npm run test:typescript-migration`, the compact controlled release gate, and conformance smoke. Generated `dist/`, installed `node_modules/`, vendored package tarballs, and lockfile metadata are out of source-migration scope. This does not claim fully formal K3 or Lean 4 equivalence; formal Lean 4 equivalence proven obligations remain 0.


## P5.28 List.find? / Array.find? Feature

P5.28 adds explicit `List.find?(A, p, xs)` and `Array.find?(A, p, xs)` to the controlled PSC-1 path. Inputs must already type-check as `List(A)` or `Array(A)`, predicates must already type-check as `A -> Bool`, payloads must reduce to finite checked constructors, and outputs are checked `Option(A)` values. Empty payloads and no-match cases return `Option.none(A)`; the first matching element returns `Option.some(A, value)`. JS/TypeScript runtime helpers are used only after Core checking.

This is not full Lean collection/typeclass/library support and does not prove full Lean 4 equivalence. ProofScript remains K3-TB trusted-boundary, not fully formal K3, with formal Lean 4 equivalence proven obligations still exactly 0.


## P5.29 List.head? / Array.head? Feature

P5.29 adds explicit `List.head?(A, xs)` and `Array.head?(A, xs)` to the controlled PSC-1 path. Inputs must already type-check as `List(A)` or `Array(A)`, payloads must reduce to finite checked constructors, and outputs are checked `Option(A)` values. Empty payloads return `Option.none(A)`; non-empty payloads return `Option.some(A, firstValue)`. JS/TypeScript runtime helpers are used only after Core checking. This is not full Lean collection/typeclass/library support and does not prove full Lean 4 equivalence. ProofScript remains K3-TB trusted-boundary, not fully formal K3, with formal Lean 4 equivalence proven obligations still exactly 0.


## P5.30 List.tail? / Array.tail? Feature

P5.30 adds explicit `List.tail?(A, xs)` and `Array.tail?(A, xs)` to the controlled PSC-1 path. Inputs must already type-check as `List(A)` or `Array(A)`, payloads must reduce to finite checked constructors, and outputs are checked `Option(List(A))` / `Option(Array(A))` values. Empty payloads return `Option.none(List(A))` / `Option.none(Array(A))`; non-empty payloads return the remaining finite checked collection wrapped in `Option.some`. JS/TypeScript runtime helpers are used only after Core checking. This is not full Lean collection/typeclass/library support and does not prove full Lean 4 equivalence. ProofScript remains K3-TB trusted-boundary, not fully formal K3, with formal Lean 4 equivalence proven obligations still exactly 0.

## P5.31 List.isEmpty Feature

P5.31 adds explicit `List.isEmpty(A, xs)` over checked finite `List` constructor payloads. The checked bootstrap declares the API, the K3-TB kernel validates complete applications before reducing to a checked `Bool`, and JS/TypeScript emission uses `List_isEmpty` only after Core checking. This complements P5.24 `Array.isEmpty` and does not claim full Lean collection/typeclass/library support. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## P5.32 List.last? / Array.last? Feature

## P5.33 List.get? Feature

P5.33 adds explicit `List.get?(A, xs, index)` over checked finite `List(A)` payloads and checked `Nat` indices. It returns `Option.some(A, value)` for in-bounds indices and `Option.none(A)` for empty or out-of-bounds payloads. This remains K3-TB trusted-boundary evidence, not full Lean collection support or a formal Lean 4 equivalence proof.

P5.32 adds explicit `List.last?(A, xs)` and `Array.last?(A, xs)` to the controlled PSC-1 path. Inputs must already type-check as `List(A)` or `Array(A)`, payloads must reduce to finite checked constructors, and outputs are checked `Option(A)` values. Empty payloads return `Option.none(A)`; non-empty payloads return `Option.some(A, lastValue)`. JS/TypeScript runtime helpers are used only after Core checking. This is not full Lean collection/typeclass/library support and does not prove full Lean 4 equivalence. ProofScript remains K3-TB trusted-boundary, not fully formal K3, with formal Lean 4 equivalence proven obligations still exactly 0.

## P5.34 List.take / Array.take Feature

P5.34 adds explicit `List.take(A, xs, count)` and `Array.take(A, xs, count)` over checked finite `List(A)` payloads and checked `Array.mk(A, data)` payloads backed by finite lists. The `count` argument must type-check as `Nat`; zero returns the empty collection, in-range counts return the corresponding prefix, and counts larger than the payload length return the full collection. This remains K3-TB trusted-boundary evidence, not full Lean collection support or a formal Lean 4 equivalence proof.

## P5.35 List.drop / Array.drop Feature

P5.35 adds explicit `List.drop(A, xs, count)` and `Array.drop(A, xs, count)` over checked finite `List(A)` payloads and checked `Array.mk(A, data)` payloads backed by finite lists. The `count` argument must type-check as `Nat`; zero returns the original collection, in-range counts return the corresponding suffix, and counts larger than the payload length return the empty collection. This remains K3-TB trusted-boundary evidence, not full Lean collection support or a formal Lean 4 equivalence proof.


## P5.36 List.range / Array.range Feature

P5.36 adds explicit `List.range(count): List(Nat)` and `Array.range(count): Array(Nat)` over checked `Nat` counts. The kernel validates the full constant application before bounded primitive reduction; `List.range` constructs a finite checked `List(Nat)` containing `0..count-1`, and `Array.range` wraps that list in `Array.mk(Nat, data)`. This remains K3-TB trusted-boundary evidence, not full Lean collection support or a formal Lean 4 equivalence proof.


## P5.37 List.replicate / Array.replicate Feature

P5.37 adds explicit `List.replicate(A, count, value): List(A)` and `Array.replicate(A, count, value): Array(A)` over checked element types, checked `Nat` counts, and checked values. The kernel validates the full constant application before bounded primitive reduction; `List.replicate` constructs a finite checked `List(A)` containing repeated copies of the checked value, and `Array.replicate` wraps that list in `Array.mk(A, data)`. This remains K3-TB trusted-boundary evidence, not full Lean collection support or a formal Lean 4 equivalence proof.


## P5.38 List.toArray / Array.toList Feature

P5.38 adds explicit bounded collection conversion APIs: `List.toArray(A, xs): Array(A)` and `Array.toList(A, xs): List(A)`. These operate only after checked bootstrap declarations and K3-TB primitive reduction over finite constructor-shaped payloads. The feature adds JS/TypeScript runtime routing after Core checking and keeps the non-claim boundary: no full Lean collection/typeclass/library equivalence and no formal Lean 4 equivalence proof.


## P5.39 List.takeWhile / Array.takeWhile Feature

P5.39 adds explicit `List.takeWhile(A, p, xs)` and `Array.takeWhile(A, p, xs)` support over checked finite List/Array payloads. The predicate must type-check as `A -> Bool`; primitive reduction keeps the checked prefix until the first false predicate result and rebuilds a checked List or Array payload. This is a compact PSC-1 finite collection feature and not full Lean collection/typeclass/library equivalence. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## P5.40 List.dropWhile / Array.dropWhile Feature

P5.40 adds explicit `List.dropWhile(A, p, xs)` and `Array.dropWhile(A, p, xs)` support over checked finite List/Array payloads. The predicate must type-check as `A -> Bool`; primitive reduction drops the checked prefix while the predicate returns true, stops at the first false predicate result, and rebuilds the remaining suffix as a checked List or Array payload. This is a compact PSC-1 finite collection feature and not full Lean collection/typeclass/library equivalence. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## P5.41 List.countP / Array.countP Feature

P5.41 adds explicit `List.countP(A, p, xs)` and `Array.countP(A, p, xs)` support over checked finite List/Array payloads. The predicate must type-check as `A -> Bool`; primitive reduction counts checked elements whose predicate reduces to true and returns a checked `Nat` literal. This is a compact PSC-1 finite collection feature and not full Lean collection/typeclass/library equivalence. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## P5.43 Option.isSome / Option.isNone / Except.isOk / Except.isError Feature

P5.43 adds explicit `List.singleton(A, value)` and `Array.singleton(A, value)` support as checked bootstrap definitions. `List.singleton` expands to `List.cons(A, value, List.nil(A))`; `Array.singleton` expands to `Array.mk(A, List.singleton(A, value))`. JS/TypeScript runtime helpers execute only after Core checking. This milestone intentionally performs no kernel refactor, no kernel restructuring, and no new kernel primitive rule. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.


## P5.42 List.singleton / Array.singleton Feature

P5.42 supports explicit `List.singleton(A, value)` and `Array.singleton(A, value)` checked-bootstrap definitions with JS/TypeScript runtime emission after Core checking.

## P5.44 Option.getD / Except.getD Feature

P5.44 adds explicit `Option.getD(A, value, fallback)` and `Except.getD(E, A, value, fallback)` support as checked bootstrap definitions. `Option.getD` is defined over `Option.rec`; `Except.getD` is defined over `Except.rec`. JS/TypeScript runtime helpers execute only after Core checking. This milestone intentionally performs no kernel refactor, no kernel restructuring, and no new kernel primitive rule. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.


## P5.45 Option.orElse / Except.orElse Feature

P5.45 adds explicit `Option.orElse(A, value, fallback)` and `Except.orElse(E, A, value, fallback)` support as checked bootstrap definitions. `Option.orElse` is defined over `Option.rec`; `Except.orElse` is defined over `Except.rec`. JS/TypeScript runtime helpers execute only after Core checking. This milestone intentionally performs no kernel refactor, no kernel restructuring, and no new kernel primitive rule. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.


## P5.46 Option.toList / Except.toOption Feature
- P5.47 Option.toArray / Except.toList Feature

P5.46 adds explicit `Option.toList(A, value)` and `Except.toOption(E, A, value)` support as checked bootstrap definitions. `Option.toList` is defined over `Option.rec`; `Except.toOption` is defined over `Except.rec`. JS/TypeScript runtime helpers execute only after Core checking. This milestone intentionally performs no kernel refactor, no kernel restructuring, and no new kernel primitive rule. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## P5.48 Option.toExcept / Except.toArray Feature

P5.48 adds Option.toExcept and Except.toArray as checked-bootstrap conversion helpers with JS/TypeScript execution after Core checking. No kernel refactor or kernel source change is introduced.

## P5.49 Except.mapError Feature

P5.49 adds Except.mapError as a checked-bootstrap error-mapping helper with JS/TypeScript execution after Core checking. No kernel refactor or kernel source change is introduced.



## P5.50 Option.filter Feature

P5.50 adds explicit `Option.filter(A, p, value)` as a checked-bootstrap helper over existing `Option.rec` and `Bool.rec`. It preserves `some(x)` only when the checked predicate returns `Bool.true`, returns `none` for failed predicates and empty options, and executes through JS/TypeScript runtime helpers only after Core checking. The same milestone also extracts recursive typeclass synthesis helpers from `packages/elaborator/src/index.ts` into `packages/elaborator/src/typeclassSynthesis.ts`, reducing the central elaborator index while preserving behavior. This is not full Lean library/typeclass support and does not prove full Lean 4 equivalence. ProofScript remains K3-TB trusted-boundary, not fully formal K3, with formal Lean 4 equivalence proven obligations still exactly 0.

## P5.51 Option.flatten Feature

P5.51 promotes explicit `Option.flatten(A, value)` as a checked-bootstrap PSC-1 helper. It collapses `Option(Option(A))` into `Option(A)` through existing `Option.rec`, emits JS/TypeScript through `__ps.Option_flatten` only after Core checking, and does not modify or refactor the kernel. The trust status remains K3-TB trusted-boundary, not fully formal K3, not full Lean 4 equivalence, with 0 formal Lean 4 equivalence proven obligations.


## P5.52 Readiness Addendum

Current controlled PSC-1 slice: P5.52 `Except.flatten`. K3-TB remains a trusted-boundary claim, not fully formal K3 and not full Lean 4 equivalence. Feature counts: 54 tracked / 54 supported / 53 executable.


## P5.52 Except.flatten Feature

P5.52 promotes explicit `Except.flatten(E, A, value)` as a checked-bootstrap PSC-1 helper. It collapses `Except(E, Except(E, A))` into `Except(E, A)` through existing `Except.rec`, emits JS/TypeScript through `__ps.Except_flatten` only after Core checking, and does not modify or refactor the kernel. The same milestone extracts array/do elaboration helpers out of `packages/elaborator/src/index.ts`. The trust status remains K3-TB trusted-boundary, not fully formal K3, not full Lean 4 equivalence, with 0 formal Lean 4 equivalence proven obligations.

## P5.53 Except.toError Feature

P5.53 supports explicit `Except.toError(E, A, value)` as a checked-bootstrap helper with JS/TypeScript execution after Core checking. It also continues behavior-preserving elaborator decomposition.

## P5.54 Except.getErrorD Feature

P5.54 supports explicit `Except.getErrorD(E, A, value, fallback)` as a checked-bootstrap helper with JS/TypeScript execution after Core checking. It also continues behavior-preserving elaborator decomposition by moving primitive-sugar elaboration into `packages/elaborator/src/primitiveSugarElaboration.ts`. No kernel source changed; formal Lean 4 equivalence proven obligations remain 0.

## P5.55 Option.fold Feature

P5.55 supports explicit `Option.fold(A, B, none, some, value)` as a checked-bootstrap helper with JS/TypeScript execution after Core checking. It also continues behavior-preserving elaborator decomposition by moving primitive literal lowering and structure/class instance literal elaboration into dedicated modules. No kernel source changed; formal Lean 4 equivalence proven obligations remain 0.

## P5.56 Except.swap Feature

P5.56 supports explicit `Except.swap(E, A, value)` as a checked-bootstrap helper with JS/TypeScript execution after Core checking. It also continues behavior-preserving elaborator decomposition by moving class and instance declaration elaboration into `packages/elaborator/src/classElaborator.ts`. No kernel source changed; formal Lean 4 equivalence proven obligations remain 0.

## P5.57 Except.fold Feature

P5.57 supports explicit `Except.fold(E, A, B, error, ok, value)` as a checked-bootstrap helper with JS/TypeScript execution after Core checking. It also continues behavior-preserving elaborator decomposition by moving telescope/type-constructor helper elaboration into `packages/elaborator/src/telescopeElaboration.ts`. No kernel source changed; formal Lean 4 equivalence proven obligations remain 0.


## P5.58 Except.bimap Feature

P5.58 supports explicit `Except.bimap(E, F, A, B, mapError, mapOk, value)` as a checked-bootstrap helper with JS/TypeScript execution after Core checking. It also continues behavior-preserving elaborator decomposition by moving core term elaboration into `packages/elaborator/src/coreTermElaboration.ts`. No kernel source changed; formal Lean 4 equivalence proven obligations remain 0.


## P5.59 Option.any Feature

P5.59 supports explicit `Option.any(A, p, value)` as a checked-bootstrap helper with JS/TypeScript execution after Core checking. It also continues behavior-preserving elaborator decomposition by moving program/declaration orchestration into `packages/elaborator/src/programElaboration.ts`. No kernel source changed; formal Lean 4 equivalence proven obligations remain 0.

## P5.60 Reference v0.6.1 Declaration Forms Feature

P5.60 replaces the primary ProofScript language reference with the uploaded v0.6.1 compiler-ready package and supports the admitted expression-bodied `const`, `function`, and `def` declaration forms plus braced `if (c) { t } else { e }`. These frontend forms lower to existing checked Core and execute through the existing JS/TypeScript backend after Core checking. No kernel source changed; formal Lean 4 equivalence proven obligations remain 0.

## P5.61 Reference v0.6.1 Match Body Feature

P5.61 supports the v0.6.1 admitted `match value with { | pattern => body; ... }` surface form, including semicolon-separated alternatives in expression-bodied declarations. It reuses the existing checked recursor-backed match elaboration and JS/TypeScript emission after Core checking. It also extracts recursive term dispatch into `packages/elaborator/src/termElaboration.ts`. No kernel source changed; formal Lean 4 equivalence proven obligations remain 0.

## P5.62 Reference v0.6.1 Where Body Feature

P5.62 supports the v0.6.1 admitted `where { localDecls }` surface form after expression-bodied declarations for non-recursive local helpers. The parser lowers helper declarations to existing checked local `let` and lambda terms, allowing later code generation only after Core checking. Recursive, mutual, nested, or later-helper references remain fail-closed and deferred. No kernel source changed; formal Lean 4 equivalence proven obligations remain 0.

## P5.63 Reference v0.6.1 Structure Expression Bodies Feature

P5.63 supports the v0.6.1 expression-bodied declaration use of structure literals and structure updates after `:=`. The parser distinguishes `{ field := value }` and `{ base with field := value }` from legacy checked blocks, then existing structure elaboration lowers to checked Core before backend/runtime execution. Ambiguous single punned `{ field }` remains a legacy checked block; broader/dependent structure forms remain deferred. No kernel source changed; formal Lean 4 equivalence proven obligations remain 0.

## P5.64 Reference v0.6.1 Class Body Feature

P5.64 supports the next narrow v0.6.1 class-body slice: explicit class parameter binders with function-valued fields, for example `class Sized(A : Type) where { size : A -> Nat; }`, plus executable direct projection calls such as `Sized.size(Nat, sizedNat, 6)` with erased type/class parameters in the JS/TS backend. The implementation uses existing checked class/structure elaboration and raw projection Core rather than a new kernel rule. Unsupported neighboring forms remain rejected, including class method binder sugar and duplicate class fields. Formal Lean 4 equivalence proven obligations remain 0.

## P5.75 Metadata Claim Separation

P5.75 makes the trust/status boundary less ambiguous: `fullKernelComplete` is deprecated as a positive claim and must remain false. The narrower field `auditedK3TBChecklistComplete` records only bounded K3-TB checklist completion. This is not full Lean 4 kernel completion, not full Lean 4 equivalence, not the same theory as Lean 4, and not fully formal K3.

## P5.76 False / False.elim Checked Prelude

P5.76 adds Lean-style `False` and checked `False.elim` to the audited primitive prelude. `False.elim` is derived from generated `False.rec`, so the new slice is checked-bootstrap evidence over existing empty-inductive machinery rather than a new trusted axiom. This is not full Lean 4 kernel completion, not full Lean 4 equivalence, not the same theory as Lean 4, and not fully formal K3.

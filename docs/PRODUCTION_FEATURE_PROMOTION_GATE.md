# ProofScript Production Feature Promotion Gate

P4.98 makes feature addition explainable and machine-checkable. The source of truth is `config/feature-promotion-gate.json`, and the enforcement command is `node tools/check-feature-promotion.ts`.

## Current Trust Claim

ProofScript remains **K3-TB trusted-boundary**.

This gate improves engineering evidence and review discipline. It does **not** make the implementation fully formal K3, and it does **not** prove Lean 4 equivalence. Formal Lean 4 equivalence remains **0 proven obligations**.

## Production Feature Gate

A PSC-1 feature should be called production-supported only when it is recorded in `config/feature-promotion-gate.json` with enough evidence to explain:

```text
source syntax / surface form
  -> parser evidence
  -> elaborator or checked bootstrap/Core evidence
  -> kernel-impact statement
  -> backend/runtime execution evidence, if executable
  -> JS smoke
  -> TypeScript compile smoke
  -> rfl/reduction smoke when applicable
  -> negative fail-closed smoke
  -> governance or support-matrix evidence
  -> documentation/report evidence
```

The intended direction is always:

```text
checked Core or checked bootstrap first
runtime/backend execution second
```

Never:

```text
runtime/backend shortcut first
proof-validity claim second
```

## Required Evidence

For supported production features, the manifest requires these evidence slots:

```text
parserOrSyntax
elaboratorOrKernel
checkedBootstrapOrObligation
backendOrRuntime
jsExecutionSmoke
typescriptCompileSmoke
theoremOrReductionSmoke
negativeFailClosedSmoke
governanceOrMatrix
documentationReports
packageScripts
```

For non-executable features, backend/runtime, JS, and TypeScript evidence may be reduced, but the feature still needs parser/elaborator/kernel and negative evidence.

## Kernel Impact Categories

Use one of these labels:

```text
no-new-kernel-rule          feature elaborates through existing kernel rules
checked-bootstrap-only      feature adds checked std/bootstrap declarations only
new-kernel-obligation       feature changes trusted kernel rules and must cite proof obligations
non-executable-surface      feature is syntax/product-facing and not executable
fail-closed-only            feature is deliberately rejected for now
```

A `new-kernel-obligation` entry must cite a proof-obligation document. It still does not become Lean-equivalent until those obligations are actually proven.

## How to Add a Feature

1. Copy `templates/feature-promotion-entry.template.json`.
2. Give the feature a stable id such as `psc1-option-values`.
3. Write the source examples and the checked story.
4. Add parser tests first when syntax changes.
5. Add elaborator/kernel or checked bootstrap evidence before runtime/backend execution.
6. Add JS execution and TypeScript compile smokes for executable features.
7. Add `rfl` or reduction smoke when the feature should reduce definitionally.
8. Add negative fail-closed tests.
9. Add governance or matrix evidence.
10. Add the docs/report entry.
11. Run:

```text
npm run test:architecture
npm run test:pslive:language-fast
npm run test:kernel:smoke
node tools/pskernel.ts status --json
```

## Current Supported Feature Families in the Gate

```text
psc1-nat-addition
psc1-nat-multiplication
psc1-nat-subtraction
psc1-nat-boolean-comparison
psc1-bool-if-and-operators
psc1-bool-primitives
psc1-structures
psc1-user-inductives
psc1-core-proof-steps
```

These entries do not mean the entire ProofScript language is complete. They mean these feature families have explicit evidence slots and can be reviewed without reading the whole conversation history.

## Why this matters

The codebase is now easier to extend because a future feature has a repeatable route:

```text
feature idea
  -> focused source examples
  -> tests and checked story
  -> manifest entry
  -> architecture gate
  -> release report
```

This helps production quality in four ways:

```text
explainable: each supported feature has a documented path
provable direction: kernel-impact claims are explicit and conservative
safe to extend: features cannot silently rely on experimental packages
reviewable: missing tests/docs/scripts fail architecture checks
```

## P5.4 Proof-Obligation Linkage

P5.4 requires every supported production feature to include `proofObligationIds`. These IDs must refer to `config/proof-obligations-ledger.json`.

Minimum linkage rules:

```text
all supported production features:
  feature-proof-obligation-coverage
  elaborator-elaboration-soundness
  artifact-replay-soundness

executable features:
  backend-semantic-preservation
  runtime-observable-semantics

checked-bootstrap features:
  stdlib-bootstrap-soundness
  core-type-soundness

features using existing kernel rules:
  kernel-lean4-equivalence
  core-type-soundness
```

The linkage is not a formal proof. It is an enforced map from feature support to the proof work needed before stronger claims can be made.

## P5.4 Traceability Integration

P5.4 requires supported features to be visible in the production traceability bundle. A promoted feature must be connected to classified packages, existing evidence files, package scripts, and known proof obligations before it can be treated as production-supported.

## P5.6 Promoted Feature: Option

`psc1-option` is the first real feature promoted after the workflow gate. Its evidence includes checked bootstrap declarations, match elaboration, backend metadata support for erased uniform parameters, runtime execution smoke, TypeScript compile smoke, negative rejection smoke, and proof-obligation links.

## P5.7 Promoted Feature: List(Nat)

P5.7 adds `psc1-list-nat`: explicit checked `List.nil(Nat)` / `List.cons(Nat, head, tail)`, exhaustive List matches, bounded structural recursion, JS/TS smoke, and fail-closed negative tests. It reuses existing checked-bootstrap and non-indexed recursor machinery.

## P5.8 Promoted Feature: Minimal String Literals

P5.8 adds `psc1-string-literals`: source string tokenization, checked Core `lit.str`, trusted kernel typing as `String` only after the checked bootstrap provides `String`, JS/TypeScript emission, theorem smoke, and fail-closed negative tests. It is not the full Lean String API.


## P5.11 Promoted Feature: Minimal Int Arithmetic

P5.11 adds `psc1-int-literals`: source signed integer literal parsing, checked Core `lit.int`, trusted kernel typing as `Int` only after the checked bootstrap provides `Int`, JS/TypeScript BigInt emission, theorem smoke, and fail-closed negative tests. It is not the full Lean Int API.


## P5.12 Array(Nat) Feature

P5.12 adds expected-type-directed `Array(Nat)` literals using the canonical PSC-1 pipeline. Source `[]` and `[1, 2, 3]` parse as array literal terms, elaborate only when the expected type is `Array(A)`, lower to checked `Array.mk(A, List...)` Core, replay through the K3-TB kernel, and emit through the existing JS/TypeScript constructor encoding. This is not the full Lean Array API.


## P5.17 do-notation

`psc1-do-notation-option-except` is promoted as a supported production-path feature. It is bounded parser/elaborator sugar over checked `Option.bind` and `Except.bind`; it is not full Monad/typeclass/do-notation support.


## P5.18 Array.map

`psc1-array-map` is promoted as a supported production-path feature. It supports explicit checked `Array.map(A, B, f, xs)` over finite checked Array payloads; it is not full Lean Array/Functor/typeclass support.


## P5.19 List.map

`psc1-list-map` is promoted as a supported production-path feature. It supports explicit checked `List.map(A, B, f, xs)` over finite checked List constructor payloads; it is not full Lean List/Functor/typeclass support.


## P5.20 List.foldl

`List.foldl(A, B, f, init, xs)` is promoted as an explicit checked PSC-1 feature. It is backed by a checked bootstrap declaration, bounded K3-TB primitive reduction over finite constructor-shaped `List(A)` values, focused positive/negative tests, JS/TypeScript emission, and proof-obligation linkage. It does not claim full Lean `List`, `Foldable`, or typeclass semantics.

## P5.21 Array.foldl

`Array.foldl(A, B, f, init, xs)` is promoted as an explicit checked PSC-1 feature. It is backed by a checked bootstrap declaration, bounded K3-TB primitive reduction over finite `Array.mk(A, List(A))` values, focused positive/negative tests, JS/TypeScript emission, and proof-obligation linkage. It does not claim full Lean `Array`, `Foldable`, or typeclass semantics.


## P5.22 List.filter / Array.filter Feature

P5.22 supports explicit `List.filter(A, p, xs)` and `Array.filter(A, p, xs)` over checked finite payloads. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## P5.23 List.append / Array.append Feature

P5.23 promotes explicit `List.append(A, left, right)` and `Array.append(A, left, right)` as supported PSC-1 features with parser/elaborator/bootstrap/kernel/backend/runtime evidence. Full Lean Append/Monoid/typeclass semantics remain deferred. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## P5.24 List.length / Array.isEmpty Feature

P5.24 promotes explicit `List.length(A, xs)` and `Array.isEmpty(A, xs)` as supported PSC-1 features with parser/elaborator/bootstrap/kernel/backend/runtime evidence. Full Lean collection/typeclass semantics remain deferred. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## P5.31 List.isEmpty Feature

P5.31 promotes explicit `List.isEmpty(A, xs)` as a supported PSC-1 feature with parser/elaborator/bootstrap/kernel/backend/runtime evidence. Full Lean collection/typeclass semantics remain deferred. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.


## P5.47 Option.toArray / Except.toList Feature

P5.47 adds Option.toArray and Except.toList as checked-bootstrap conversion helpers with JS/TypeScript execution after Core checking. No kernel refactor or kernel source change is introduced.

## P5.48 Option.toExcept / Except.toArray Feature

P5.48 adds Option.toExcept and Except.toArray as checked-bootstrap conversion helpers with JS/TypeScript execution after Core checking. No kernel refactor or kernel source change is introduced.

## P5.49 Except.mapError Feature

P5.49 adds Except.mapError as a checked-bootstrap error-mapping helper with JS/TypeScript execution after Core checking. No kernel refactor or kernel source change is introduced.



## P5.50 Option.filter Feature and Elaborator Split

P5.50 adds explicit `Option.filter(A, p, value)` as a checked-bootstrap PSC-1 helper over existing `Option.rec` and `Bool.rec`, with JS/TypeScript execution after Core checking. It also extracts recursive typeclass synthesis helpers from `packages/elaborator/src/index.ts` into `packages/elaborator/src/typeclassSynthesis.ts`; this is a behavior-preserving elaborator structure improvement, not a kernel refactor. Trust remains K3-TB, not fully formal K3, not full Lean 4 equivalence, and formal Lean 4 equivalence proven obligations remain 0.

## P5.51 Option.flatten Promotion

`psc1-option-flatten` is promoted as a checked-bootstrap executable PSC-1 feature. Evidence includes `tools/pslive-option-flatten-tests.ts`, `packages/std/src/Bootstrap/Foundation.ps`, `packages/std/core/bootstrap.pscore.json`, `packages/backend-typescript/src/termEmitter.ts`, `packages/runtime/src/source.ts`, and `docs/reports/p5/PRODUCTION_P5_51_OPTION_FLATTEN_FEATURE_REPORT.md`.


## P5.52 Except.flatten Promotion

P5.52 promotes `psc1-except-flatten` as a supported checked-bootstrap PSC-1 feature. It is executable after Core checking, uses `Except.rec` in the standard bootstrap, and has focused positive/negative/runtime evidence in `tools/pslive-except-flatten-tests.ts`. Feature count: 54 tracked / 54 supported / 53 executable.


## P5.52 Except.flatten Feature

`psc1-except-flatten` is promoted as a checked-bootstrap executable PSC-1 feature. Evidence includes `tools/pslive-except-flatten-tests.ts`, `packages/std/src/Bootstrap/Foundation.ps`, `packages/std/core/bootstrap.pscore.json`, `packages/backend-typescript/src/termEmitter.ts`, `packages/runtime/src/source.ts`, and `docs/reports/p5/PRODUCTION_P5_52_EXCEPT_FLATTEN_FEATURE_REPORT.md`.

## P5.53 Except.toError Feature

`Except.toError` follows the production feature gate: red test first, checked-bootstrap implementation, backend/runtime execution only after Core checking, governance updates, and no kernel refactor.

## P5.54 Except.getErrorD Feature

`Except.getErrorD` is promoted only after a focused red/green PSLive test, checked-bootstrap definition, backend/runtime hook, feature-promotion entry, verification-matrix claim, traceability source links, and proof-obligation links. It is checked-bootstrap support, not a new kernel primitive.

## P5.55 Option.fold Feature

`Option.fold` is promoted only after a focused red/green PSLive test, checked-bootstrap definition, backend/runtime hook, feature-promotion entry, verification-matrix claim, traceability source links, and proof-obligation links. It is checked-bootstrap support over existing `Option.rec`, not a new kernel primitive.

## P5.56 Except.swap Feature

`Except.swap` is promoted only after a focused red/green PSLive test, checked-bootstrap definition, backend/runtime hook, feature-promotion entry, verification-matrix claim, traceability source links, and proof-obligation links. It is checked-bootstrap support over existing `Except.rec`, not a new kernel primitive.

## P5.57 Except.fold Feature

`Except.fold` is promoted only after a focused red/green PSLive test, checked-bootstrap definition, backend/runtime hook, feature-promotion entry, verification-matrix claim, traceability source links, and proof-obligation links. It is checked-bootstrap support over existing `Except.rec`, not a new kernel primitive.

## P5.60 Reference v0.6.1 Declaration Forms Feature

P5.60 promotes the v0.6.1 compiler-ready language reference as the primary ProofScript reference and admits expression-bodied `const`, `function`, and `def` declarations plus braced if syntax. The feature is parser/lowering evidence over existing Core and runtime semantics; no kernel refactor or new kernel rule is introduced.

## P5.61 Reference v0.6.1 Match Body Feature

P5.61 promotes `psc1-reference-v061-match-body`. The feature accepts v0.6.1 match-with braced bodies, preserves existing legacy parenthesized match syntax for old PSC-1 sources, rejects call-style constructor pattern sugar, and routes all semantics through existing checked Core match elaboration.

## P5.62 Reference v0.6.1 Where Body Feature

P5.62 promotes `psc1-reference-v061-where-body`. The feature accepts the v0.6.1 `where { localDecls }` surface after expression-bodied declarations for a non-recursive local-helper slice, lowers helpers to existing checked `let`/lambda Core elaboration, and rejects recursive/mutual/later-helper local where references. This is parser/lowering evidence under K3-TB, not a new kernel rule and not a formal Lean 4 equivalence proof.

## P5.63 Reference v0.6.1 Structure Expression Bodies Feature

P5.63 promotes `psc1-reference-v061-structure-expression-bodies`. The feature accepts explicit structure literals and structure updates as expression-bodied declaration values after `:=`, disambiguates those braces from legacy checked declaration-body blocks, and routes them through existing checked structure elaboration before JS/TS emission. This is parser/lowering evidence under K3-TB, not a new kernel rule and not a formal Lean 4 equivalence proof.


## P5.64 Reference v0.6.1 Class Body Feature

P5.64 promotes `psc1-reference-v061-class-body`. The feature accepts the v0.6.1 `class C(...) where { field : T; }` body spelling for the explicit-parameter class slice, including function-valued fields such as `size : A -> Nat`. Class elaboration now generates checked raw-projection definitions for class fields instead of relying on the conservative simple recursor synthesizer, and JS/TS emission erases explicit type parameters for direct projection calls such as `Sized.size(Nat, sizedNat, 6)`. This is parser/lowering/backend evidence under K3-TB, not a new kernel rule and not a formal Lean 4 equivalence proof.

## P5.75 Metadata Claim Separation

The metadata-claim-separation0 feature is governance/status hardening only. It uses existing kernel rules and fail-closed checks to prevent overclaiming.

## P5.76 False / False.elim Checked Prelude

The kernel-false-elim-active0 feature is checked-bootstrap prelude work. It installs `False : Prop`, uses the existing empty-inductive recursor generator for `False.rec`, and derives `False.elim` as a checked reducible definition. It does not add a new axiom, kernel-codec version, or formal Lean-equivalence proof.

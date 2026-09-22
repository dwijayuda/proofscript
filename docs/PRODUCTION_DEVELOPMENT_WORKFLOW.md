# Production Development Workflow

This document defines the canonical workflow for adding or promoting ProofScript PSC-1 features.
It is enforced by `config/development-workflow.json` and `tools/check-development-workflow.ts`.

## Trust Status

ProofScript remains **K3-TB trusted-boundary**. This workflow improves discipline and traceability, but it does not prove full Lean 4 equivalence.

## Feature Implementation Steps

Every production-path feature must follow this sequence:

1. Propose the feature with scope, non-goals, target packages, and proof-obligation IDs.
2. Choose the trust level and kernel impact before implementation.
3. Write the failing regression test first and verify that it fails for the expected reason.
4. Implement parser and elaborator/Core/checked-bootstrap behavior before backend/runtime shortcuts.
5. Add backend/runtime behavior only after checked Core exists.
6. Add negative fail-closed tests.
7. Link the feature to `config/proof-obligations-ledger.json`.
8. Update feature promotion, verification matrix, traceability, docs, and report evidence.
9. Run the focused matrix and fresh-extract smoke before claiming support.

## Proof Obligations

A promoted feature must list `proofObligationIds` from `config/proof-obligations-ledger.json`.
Executable features normally need backend semantic preservation and runtime observable semantics obligations.
Checked-bootstrap features need stdlib/bootstrap and Core/type-soundness obligations.
Existing-kernel-rule features must keep the kernel Lean-equivalence obligation visible.

## Templates

Use these files when adding a feature:

- `templates/feature-implementation-plan.template.md`
- `templates/feature-regression-test.template.ts`
- `templates/feature-promotion-entry.template.json`
- `templates/feature-report.template.md`

## Planned Feature Queue

The current planned PSC-1 feature queue has promoted Option, List, String, Int, Array, and Except through focused P5 gates. The next controlled feature candidates are Array size/get, broader String/Int library slices, and CLI verification cleanup; none are supported until promoted through the feature-promotion gate and linked to proof obligations.

## What This Does Not Prove

This workflow discipline is not itself a formal proof. It does not prove full K3, Lean 4 equivalence, backend semantic preservation, or runtime correctness. It makes the required evidence explicit and prevents accidental overclaims.

## P5.6 Workflow Validation

P5.6 uses the development workflow for a real feature. `psc1-option` is no longer merely planned; the planned queue now continues with List, String, Int, and Result/Except.

## P5.7 Workflow Validation

P5.7 uses the existing workflow for a real feature without adding new meta-gates. `psc1-list-nat` is promoted; the planned queue continues with String, Int, Result/Except, and broader List library support.

## P5.8 Workflow Validation

P5.8 uses the existing controlled feature workflow for minimal String literals without adding new meta-gates. The next feature queue continues with Int, Result/Except, and broader collection/string library support.


## P5.11 Workflow Validation

P5.11 uses the existing controlled feature workflow for minimal Int literals without adding new meta-gates. The next feature queue continues with Result/Except and broader Int/String library support.


## P5.12 Array(Nat) Feature

P5.12 adds expected-type-directed `Array(Nat)` literals using the canonical PSC-1 pipeline. Source `[]` and `[1, 2, 3]` parse as array literal terms, elaborate only when the expected type is `Array(A)`, lower to checked `Array.mk(A, List...)` Core, replay through the K3-TB kernel, and emit through the existing JS/TypeScript constructor encoding. This is not the full Lean Array API.


## P5.13 Except(E, A) Feature

P5.13 uses the existing controlled feature workflow for a bounded Result-style feature without adding another meta-gate. `psc1-except` is promoted for explicit checked constructors and exhaustive `Except(String, Nat)` matches; broader Except library APIs, IO exception conversion, and monadic do support remain planned future work.


## P5.17 minimal do-notation

The previously planned minimal do-notation slice is implemented in P5.17. Future work must still use the feature templates and proof-obligation linkage before expanding to full Monad/typeclass or IO semantics.


## P5.18 Array.map

The Array.map slice is implemented as a small checked-Core-first feature. Future collection work should reuse this pattern and avoid broad collection/typeclass machinery until the corresponding checked story is ready.


## P5.19 List.map

The List.map slice is implemented as a small checked-Core-first feature. Future collection work should reuse this pattern and avoid broad collection/typeclass machinery until the corresponding checked story is ready.


## P5.20 List.foldl

This slice follows the controlled feature workflow: add a focused red test, implement the smallest checked Core/kernel/runtime path, update manifests and reports, run compact gates, then package a source-only artifact.

## P5.21 Array.foldl

The Array.foldl slice is implemented as a small checked-Core-first feature. Future collection work should reuse this pattern and avoid broad collection/typeclass machinery until the corresponding checked story is ready.


## P5.22 List.filter / Array.filter Feature

P5.22 supports explicit `List.filter(A, p, xs)` and `Array.filter(A, p, xs)` over checked finite payloads. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## P5.23 List.append / Array.append Feature

P5.23 supports explicit `List.append(A, left, right)` and `Array.append(A, left, right)` over checked finite payloads. The feature followed the red-test → checked bootstrap/kernel → backend/runtime → governance/report workflow. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## P5.24 List.length / Array.isEmpty Feature

P5.24 supports explicit `List.length(A, xs)` and `Array.isEmpty(A, xs)` over checked finite payloads. The feature followed the red-test → checked bootstrap/kernel → backend/runtime → governance/report workflow. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## P5.31 List.isEmpty Feature

P5.31 supports explicit `List.isEmpty(A, xs)` over checked finite List payloads. The feature followed the red-test → checked bootstrap/kernel → backend/runtime → governance/report workflow. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.


## P5.47 Option.toArray / Except.toList Feature

P5.47 adds Option.toArray and Except.toList as checked-bootstrap conversion helpers with JS/TypeScript execution after Core checking. No kernel refactor or kernel source change is introduced.

## P5.48 Option.toExcept / Except.toArray Feature

P5.48 adds Option.toExcept and Except.toArray as checked-bootstrap conversion helpers with JS/TypeScript execution after Core checking. No kernel refactor or kernel source change is introduced.

## P5.49 Except.mapError Feature

P5.49 adds Except.mapError as a checked-bootstrap error-mapping helper with JS/TypeScript execution after Core checking. No kernel refactor or kernel source change is introduced.



## P5.50 Option.filter Feature and Elaborator Split

P5.50 adds explicit `Option.filter(A, p, value)` as a checked-bootstrap PSC-1 helper over existing `Option.rec` and `Bool.rec`, with JS/TypeScript execution after Core checking. It also extracts recursive typeclass synthesis helpers from `packages/elaborator/src/index.ts` into `packages/elaborator/src/typeclassSynthesis.ts`; this is a behavior-preserving elaborator structure improvement, not a kernel refactor. Trust remains K3-TB, not fully formal K3, not full Lean 4 equivalence, and formal Lean 4 equivalence proven obligations remain 0.

## P5.51 Option.flatten Feature

P5.51 adds explicit `Option.flatten(A, value)` as a checked-bootstrap PSC-1 helper over existing `Option.rec`, with JS/TypeScript execution after Core checking. This continues the compact no-kernel-change Option/Except feature path and preserves the P5.50 behavior-preserving elaborator split.


## P5.52 Workflow Addendum

P5.52 followed the controlled workflow: red test for `Except.flatten`, checked-bootstrap implementation, backend/runtime hook only after Core checking, governance updates, and fresh verification. The workflow now records 30 planned/implemented feature-tracking entries.


## P5.52 Except.flatten Feature

P5.52 adds explicit `Except.flatten(E, A, value)` as a checked-bootstrap PSC-1 helper over existing `Except.rec`, with JS/TypeScript execution after Core checking. The same milestone extracts array literal and do-notation lowering into `packages/elaborator/src/arrayDoElaboration.ts`.

## P5.53 Except.toError Feature and Elaborator Split

P5.53 adds explicit `Except.toError(E, A, value)` as a checked-bootstrap PSC-1 helper over existing `Except.rec`, with JS/TypeScript execution after Core checking. The same milestone extracts structure update, constructor shorthand, and dotted projection sugar from `packages/elaborator/src/index.ts` into `packages/elaborator/src/structureSugarElaboration.ts`.

## P5.54 Except.getErrorD Feature and Primitive-Sugar Extraction

P5.54 follows the same controlled workflow: red test for `Except.getErrorD`, checked-bootstrap implementation, backend/runtime hook only after Core checking, governance updates, fresh verification, and source-artifact packaging. The same milestone extracts primitive-sugar elaboration from `packages/elaborator/src/index.ts` without changing kernel source.

## P5.55 Option.fold Feature and Elaborator Extraction

P5.55 follows the controlled workflow: red test for `Option.fold`, checked-bootstrap implementation, backend/runtime hook only after Core checking, governance updates, fresh verification, and source-artifact packaging. The same milestone extracts additional primitive/structure elaboration helpers from `packages/elaborator/src/index.ts` without changing kernel source.

## P5.56 Except.swap Feature and Class/Instance Extraction

P5.56 follows the controlled workflow: red test for `Except.swap`, checked-bootstrap implementation, backend/runtime hook only after Core checking, governance updates, fresh verification, and source-artifact packaging. The same milestone extracts class and instance declaration elaboration from `packages/elaborator/src/index.ts` without changing kernel source.

## P5.57 Except.fold Feature and Telescope Extraction

P5.57 follows the controlled workflow: red test for `Except.fold`, checked-bootstrap implementation, backend/runtime hook only after Core checking, governance updates, fresh verification, and source-artifact packaging. The same milestone extracts telescope/type-constructor helper elaboration from `packages/elaborator/src/index.ts` without changing kernel source.

## P5.60 Development Workflow Addendum

P5.60 follows the red-green workflow for reference-governed syntax: the focused v0.6.1 declaration test first failed under the old checked-block-only parser, then passed after adding expression-bodied declaration parsing and braced-if lowering. Future PSC-1 work should prioritize remaining v0.6.1 conformance gaps before adding more library helpers.

## P5.61 Development Workflow Addendum

P5.61 follows the red-green workflow for reference-governed match syntax: the focused v0.6.1 match test first failed under the legacy parenthesized-match-only parser, then passed after accepting `match value with { ... }` and case semicolons. The elaborator refactor was behavior-preserving and covered by focused dispatch/extraction tests.

## P5.62 Development Workflow Addendum

P5.62 follows the red-green workflow for reference-governed local where syntax: the focused v0.6.1 where test first failed under the previous parser at the `where` token, then passed after adding bounded non-recursive helper lowering. Parser maintainability was improved by extracting the where-body helper parser/lowering logic to `packages/parser/src/whereBodyParser.ts`.

## P5.63 Development Workflow Addendum

P5.63 follows the red-green workflow for reference-governed structure expression bodies: the focused v0.6.1 structure-expression test first failed under the previous parser at the explicit field assignment inside `{ ... }`, then passed after adding brace disambiguation and preserving legacy checked blocks. Parser maintainability was improved by extracting the decision helper to `packages/parser/src/definitionBodyParser.ts`.

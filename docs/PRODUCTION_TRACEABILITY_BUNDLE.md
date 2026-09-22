# Production Traceability Bundle

P5.4 adds a machine-checked traceability bundle for the canonical PSC-1 production path.

The purpose is to make the codebase production-grade, explainable, provable in direction, and easy to extend. The bundle does not add language features. It connects the existing production architecture gates into one auditable map.

## K3-TB Trust Claim

The project remains **K3-TB trusted-boundary**.

The traceability bundle explicitly preserves these non-claims:

- not fully formal K3
- not proven equivalent to Lean 4
- not a complete Lean 4 implementation
- not self-hosting
- traceability is not itself a formal proof

Formal Lean 4 equivalence remains **0 proven obligations**.

## Sources

The source of truth is `config/production-traceability-bundle.json`.

It links these production architecture sources:

- `config/package-classification.json`
- `config/feature-promotion-gate.json`
- `config/verification-matrix.json`
- `config/proof-obligations-ledger.json`
- `docs/PRODUCTION_PACKAGE_CLASSIFICATION.md`
- `docs/PRODUCTION_FEATURE_PROMOTION_GATE.md`
- `docs/PRODUCTION_VERIFICATION_MATRIX.md`
- `docs/PRODUCTION_PROOF_OBLIGATION_LEDGER.md`
- `docs/PRODUCTION_CANONICAL_PACKAGE_GUIDE.md`
- `docs/PRODUCTION_READINESS_STATUS.md`

## Links

The checker verifies the important production links:

- packages-to-classification
- packages-to-local-docs
- features-to-packages
- features-to-proof-obligations
- features-to-evidence-files
- claims-to-commands
- claims-to-docs
- proof-obligations-to-evidence
- trust-claims-consistent
- non-overclaim-enforced

This means a supported feature cannot become production-supported while disconnected from package classification, evidence files, verification commands, and the proof-obligation ledger.

## Commands

Run the focused check:

```sh
npm run test:production-traceability
```

Run the architecture gate:

```sh
npm run test:architecture
```

Emit JSON:

```sh
node tools/check-production-traceability.ts --json
```

## What This Proves

This proves only that the repository's production architecture metadata is internally connected and non-overclaiming:

- canonical PSC-1 packages are classified and documented
- supported feature families link to known proof obligations
- required verification claims exist and point to commands
- formal trust claims stay K3-TB / not-proven

## What This Does Not Prove

This does **not** prove that the TypeScript kernel is equivalent to Lean 4.

It does **not** prove backend semantic preservation.

It does **not** prove runtime observable semantics.

It does **not** prove elaborator soundness.

Those remain proof obligations in `config/proof-obligations-ledger.json`.

## How to Use for New Features

When adding a new feature such as `Option`, `List`, `String`, or `Int`:

1. Add parser/elaborator/backend/runtime tests as needed.
2. Add or update checked bootstrap/Core evidence.
3. Add a feature entry in `config/feature-promotion-gate.json`.
4. Link the feature to `proofObligationIds`.
5. Add commands to the verification matrix if the feature creates a new claim.
6. Run `npm run test:architecture`.

If any link is missing, `tools/check-production-traceability.ts` should fail before the feature is treated as production-supported.


## P5.5 Development Workflow Link

P5.5 extends traceability with `config/development-workflow.json`.
The bundle now links production packages, supported features, proof obligations, verification claims, and the contributor feature workflow templates.

This link is an audit aid. It is not itself a formal proof.

## P5.6 Option Traceability

P5.6 adds `psc1-option` to the supported feature graph. The feature links to canonical packages, verification claims, smoke tests, checked bootstrap files, backend/runtime files, and proof obligations.

## P5.7 List(Nat) Traceability

P5.7 adds `psc1-list-nat` to the supported feature graph. The feature links to canonical packages, checked bootstrap files, pslive smoke tests, backend/runtime files, verification claims, and proof obligations.

## P5.8 String Literal Traceability

P5.8 links `psc1-string-literals` to syntax, parser, elaborator, checked bootstrap, trusted kernel literal typing, TypeScript backend emission, runtime profile, verification claims, and proof obligations.


## P5.11 Int Literal Traceability

P5.11 links `psc1-int-literals` to syntax, parser, elaborator, checked bootstrap, trusted kernel literal typing, TypeScript backend emission, runtime profile, verification claims, and proof obligations.

## P5.11 Int Arithmetic Traceability

P5.11 links bounded Int primitive arithmetic to bootstrap declarations, trusted kernel literal reduction, TypeScript backend helpers, runtime helpers, feature promotion, verification matrix, and proof-obligation tracking. It does not claim the full Lean Int API.


## P5.12 Array(Nat) Feature

P5.12 adds expected-type-directed `Array(Nat)` literals using the canonical PSC-1 pipeline. Source `[]` and `[1, 2, 3]` parse as array literal terms, elaborate only when the expected type is `Array(A)`, lower to checked `Array.mk(A, List...)` Core, replay through the K3-TB kernel, and emit through the existing JS/TypeScript constructor encoding. This is not the full Lean Array API.


P5.17 links `psc1-do-notation-option-except` to syntax, parser, elaborator lowering, existing checked bind declarations, kernel checked reduction evidence, JS/TypeScript emission, focused positive/negative tests, and the proof-obligation ledger.


## P5.18 Array.map Traceability

P5.18 links `psc1-array-map` to checked bootstrap declarations, K3-TB kernel bounded primitive reduction, JS/TypeScript runtime helpers, focused positive/negative tests, verification-matrix claims, and proof-obligation tracking.


## P5.19 List.map Traceability

P5.19 links `psc1-list-map` to checked bootstrap declarations, K3-TB kernel bounded primitive reduction, JS/TypeScript runtime helpers, focused positive/negative tests, verification-matrix claims, and proof-obligation tracking.


## P5.20 List.foldl Traceability

P5.20 links `psc1-list-foldl` to checked bootstrap declarations, K3-TB kernel bounded primitive reduction, JS/TypeScript runtime helpers, focused positive/negative tests, verification-matrix claims, and proof-obligation tracking.

## P5.21 Array.foldl Traceability

P5.21 links `psc1-array-foldl` to checked bootstrap declarations, K3-TB kernel bounded primitive reduction, JS/TypeScript runtime helpers, focused positive/negative tests, verification-matrix claims, and proof-obligation tracking.


## P5.22 List.filter / Array.filter Feature

P5.22 supports explicit `List.filter(A, p, xs)` and `Array.filter(A, p, xs)` over checked finite payloads. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## P5.23 List.append / Array.append Feature

P5.23 supports explicit `List.append(A, left, right)` and `Array.append(A, left, right)` over checked finite payloads. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## P5.24 List.length / Array.isEmpty Feature

P5.24 supports explicit `List.length(A, xs)` and `Array.isEmpty(A, xs)` over checked finite payloads. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## P5.31 List.isEmpty Feature

P5.31 supports explicit `List.isEmpty(A, xs)` over checked finite List payloads. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.


## P5.47 Option.toArray / Except.toList Feature

P5.47 adds Option.toArray and Except.toList as checked-bootstrap conversion helpers with JS/TypeScript execution after Core checking. No kernel refactor or kernel source change is introduced.

## P5.48 Option.toExcept / Except.toArray Feature

P5.48 adds Option.toExcept and Except.toArray as checked-bootstrap conversion helpers with JS/TypeScript execution after Core checking. No kernel refactor or kernel source change is introduced.

## P5.49 Except.mapError Feature

P5.49 adds Except.mapError as a checked-bootstrap error-mapping helper with JS/TypeScript execution after Core checking. No kernel refactor or kernel source change is introduced.



## P5.50 Option.filter Feature and Elaborator Split

P5.50 adds explicit `Option.filter(A, p, value)` as a checked-bootstrap PSC-1 helper over existing `Option.rec` and `Bool.rec`, with JS/TypeScript execution after Core checking. It also extracts recursive typeclass synthesis helpers from `packages/elaborator/src/index.ts` into `packages/elaborator/src/typeclassSynthesis.ts`; this is a behavior-preserving elaborator structure improvement, not a kernel refactor. Trust remains K3-TB, not fully formal K3, not full Lean 4 equivalence, and formal Lean 4 equivalence proven obligations remain 0.

## P5.51 Option.flatten Traceability

The P5.51 feature is linked through the feature-promotion gate, verification matrix, proof-obligation ledger, runtime/backend evidence, focused PSLive test, and feature report. It adds no formal Lean 4 equivalence proof and does not alter the K3-TB trust boundary.


## P5.52 Traceability Addendum

The traceability bundle now includes `tools/pslive-except-flatten-tests.ts` and `docs/reports/p5/PRODUCTION_P5_52_EXCEPT_FLATTEN_FEATURE_REPORT.md`. It tracks 54 supported features, 62 verification claims, 170 commands, and 10 proof obligations under the same K3-TB non-overclaim policy.


## P5.52 Except.flatten Feature

The P5.52 feature is linked through the feature-promotion gate, verification matrix, proof-obligation ledger, runtime/backend evidence, focused PSLive test, feature report, and elaborator extraction report. It adds no formal Lean 4 equivalence proof and does not alter the K3-TB trust boundary.

## P5.53 Except.toError Traceability

P5.53 connects the `Except.toError` source test, checked bootstrap definition, backend/runtime helper, verification claim, and feature-promotion entry in the traceability bundle.

## P5.54 Traceability Addendum

The traceability bundle now includes `tools/pslive-except-geterrord-tests.ts`, `docs/reports/p5/PRODUCTION_P5_54_EXCEPT_GETERRORD_FEATURE_REPORT.md`, and `packages/elaborator/src/primitiveSugarElaboration.ts`. The supported feature remains linked to existing proof obligations, with 0 formal Lean 4 equivalence proven obligations.

## P5.55 Traceability Addendum

The traceability bundle now includes `tools/pslive-option-fold-tests.ts`, `docs/reports/p5/PRODUCTION_P5_55_OPTION_FOLD_FEATURE_REPORT.md`, the checked bootstrap updates, backend/runtime hooks, and elaborator extraction evidence. The supported feature remains linked to existing proof obligations, with 0 formal Lean 4 equivalence proven obligations.

## P5.56 Traceability Addendum

The traceability bundle now includes `tools/pslive-except-swap-tests.ts`, `docs/reports/p5/PRODUCTION_P5_56_EXCEPT_SWAP_FEATURE_REPORT.md`, `packages/elaborator/src/classElaborator.ts`, checked bootstrap updates, backend/runtime hooks, and governance evidence. The supported feature remains linked to existing proof obligations, with 0 formal Lean 4 equivalence proven obligations.

## P5.57 Traceability Addendum

P5.57 links `Except.fold` from feature gate to proof obligations, verification matrix, focused PSLive test, checked bootstrap source/artifact, backend/runtime evidence, and `packages/elaborator/src/telescopeElaboration.ts`.


## P5.58 Traceability Addendum

P5.58 links `Except.bimap` from feature gate to proof obligations, verification matrix, focused PSLive test, checked bootstrap source/artifact, backend/runtime evidence, and `packages/elaborator/src/coreTermElaboration.ts`.


## P5.59 Traceability Addendum

P5.59 links `Option.any` from feature gate to proof obligations, verification matrix, focused PSLive test, checked bootstrap source/artifact, backend/runtime evidence, and `packages/elaborator/src/programElaboration.ts`.

## P5.60 Traceability Addendum

P5.60 links the v0.6.1 language reference package, `tools/pslive-reference-v061-declaration-tests.ts`, parser implementation, feature gate, verification matrix, production traceability bundle, and the P5.60 report. This traceability records reference adoption and frontend lowering evidence; it is not a formal proof of Lean 4 equivalence.

## P5.61 Traceability Addendum

P5.61 links the v0.6.1 language reference package, `tools/pslive-reference-v061-match-tests.ts`, parser implementation, `packages/elaborator/src/termElaboration.ts`, feature gate, verification matrix, production traceability bundle, and the P5.61 report. This traceability records reference-governed match lowering evidence; it is not a formal proof of Lean 4 equivalence.

## P5.62 Traceability Addendum

P5.62 links the v0.6.1 language reference package, `tools/pslive-reference-v061-where-tests.ts`, parser implementation, `packages/parser/src/whereBodyParser.ts`, feature gate, verification matrix, production traceability bundle, and the P5.62 report. This traceability records reference-governed local where lowering evidence; it is not a formal proof of Lean 4 equivalence.

## P5.63 Traceability Addendum

P5.63 links the v0.6.1 language reference package, `tools/pslive-reference-v061-structure-expr-tests.ts`, `packages/parser/src/definitionBodyParser.ts`, existing structure elaboration, feature gate, verification matrix, production traceability bundle, and the P5.63 report. This traceability records reference-governed structure-expression evidence; it is not a formal proof of Lean 4 equivalence.


## P5.64 Traceability Addendum

P5.64 links the v0.6.1 language reference package, `tools/pslive-reference-v061-class-body-tests.ts`, `packages/parser/src/index.ts`, `packages/elaborator/src/classElaborator.ts`, `packages/backend-typescript/src/declarationAnalysis.ts`, `packages/backend-typescript/src/moduleEmitter.ts`, `packages/backend-typescript/src/termEmitter.ts`, the feature gate, verification matrix, production traceability bundle, and the P5.64 report. This traceability records reference-governed class-body parsing/projection/runtime evidence; it is not a formal proof of Lean 4 equivalence.


## P5.72 kernel-iff-eliminators-active0 traceability

The P5.72 release links `tools/kernel-iff-eliminators-active0-tests.ts`, `packages/kernel/src/PSKernel/Primitive.ts`, and `docs/reports/p5/PRODUCTION_P5_72_KERNEL_IFF_ELIMINATORS_ACTIVE0_REPORT.md` to the required verification claim `kernel-iff-eliminators-active0`. The claim remains K3-TB trusted-boundary evidence and does not prove full Lean 4 equivalence.

## P5.73 kernel-iff-basic-theorems-active0 traceability

The P5.73 release links `tools/kernel-iff-basic-theorems-active0-tests.ts`, `packages/kernel/src/PSKernel/Primitive.ts`, and `docs/reports/p5/PRODUCTION_P5_73_KERNEL_IFF_BASIC_THEOREMS_ACTIVE0_REPORT.md` to the required verification claim `kernel-iff-basic-theorems-active0`. The claim remains K3-TB trusted-boundary evidence and does not prove full Lean 4 equivalence.

## P5.74 kernel-classical-choice-active0 traceability

The P5.74 release links `tools/kernel-classical-choice-active0-tests.ts`, `packages/kernel/src/PSKernel/Primitive.ts`, and `docs/reports/p5/PRODUCTION_P5_74_KERNEL_CLASSICAL_CHOICE_ACTIVE0_REPORT.md` to the required verification claim `kernel-classical-choice-active0`. The claim remains K3-TB trusted-boundary evidence and does not prove full Lean 4 equivalence.

## P5.75 Metadata Claim Separation

Traceability now includes a machine-checkable guard that separates audited K3-TB checklist completion from full Lean 4 kernel completion/equivalence claims.

## P5.76 False / False.elim Checked Prelude

Traceability adds `tools/kernel-false-elim-active0-tests.ts`, `packages/kernel/src/PSKernel/Primitive.ts`, and the P5.76 release report as evidence for the checked False/False.elim prelude slice. The feature remains proof-obligation-linked and K3-TB bounded.

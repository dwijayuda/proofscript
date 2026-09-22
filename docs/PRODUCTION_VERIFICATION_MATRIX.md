# Production Verification Matrix

The production verification matrix is the machine-readable map from ProofScript claims to the commands that support those claims.

The source of truth is:

```txt
config/verification-matrix.json
```

The checker is:

```txt
node tools/check-verification-matrix.ts
```

## Claims to Commands

Each claim records:

```txt
id
claim type
whether it is required for release
a conservative trust impact label
package scripts or allowlisted raw commands
evidence files
documentation references
```

This makes production status explainable: a maintainer can ask, "what command supports this claim?" and the answer is in one file.

## Required Release Claims

Required claims currently cover:

```txt
build integrity
trust-boundary architecture
package classification
feature promotion
verification matrix self-check
PSC-1 language smoke
reference governance
K3-TB kernel smoke/status
backend/runtime compatibility
```

These are engineering gates. They improve reliability and reviewability, but they do not make the implementation formally equivalent to Lean 4.

## K3-TB

All verification-matrix trust metadata must remain:

```txt
K3-TB trusted-boundary
fullyFormalK3 = false
lean4Equivalent = false
formalLean4EquivalenceProvenObligations = 0
```

Changing those values requires actual formal obligations to be proved first. The checker intentionally rejects accidental upgrades.

## What This Does Not Prove

The verification matrix does not prove:

```txt
formal Lean 4 kernel equivalence
soundness of the TypeScript implementation
semantic preservation of the parser/elaborator/backend
correctness of JavaScript or Node runtime behavior
```

It provides auditable command evidence for the current production-engineering claims.

## How to Use

Fast architecture gate:

```sh
npm run test:architecture
```

Verification-matrix gate only:

```sh
npm run test:verification-matrix
```

JSON summary:

```sh
node tools/check-verification-matrix.ts --json
```

When adding a feature or changing a trust claim, update the relevant feature-promotion entry and then update this matrix only when there is a concrete command that proves the new claim.

## P5.1 Canonical Package Docs Claim

P5.1 adds the `canonical-package-docs-enforced` claim. The claim is supported by:

```text
npm run test:canonical-package-docs
npm run test:architecture:package-docs
```

This connects package-level explainability to the production verification matrix. It is an architecture and documentation evidence claim, not a formal Lean 4 equivalence proof.

## P5.2 Proof Obligation Ledger

P5.2 adds `config/proof-obligations-ledger.json` and `tools/check-proof-obligations.ts`.
The verification matrix now treats proof-obligation visibility as a required production architecture claim.
This does not prove Lean 4 equivalence; it prevents accidental overclaims and records the proof work required before the K3-TB label can be upgraded.

## P5.4 Feature Proof-Obligation Linkage Claim

P5.4 adds the `feature-proof-obligation-linkage-enforced` verification claim. The claim is supported by:

```text
test:feature-proof-obligation-linkage
test:architecture:feature-proof-obligation-linkage
```

This claim proves only that supported feature entries are linked to proof-obligation ledger IDs. It does not prove those obligations themselves.

## P5.4 Production Traceability Claim

P5.4 adds the `production-traceability-enforced` verification claim. The claim is supported by:

- `npm run test:production-traceability`
- `npm run test:architecture:production-traceability`

This claim links the package classification, feature promotion gate, verification matrix, proof-obligation ledger, and canonical package documentation into one auditable bundle. It does not prove Lean 4 equivalence.


## P5.5 Development Workflow Claim

P5.5 adds the `development-workflow-enforced` verification claim.
The claim is supported by `npm run test:development-workflow` and `npm run test:architecture:development-workflow`.
It checks the feature implementation workflow, templates, planned feature queue, proof-obligation links, and K3-TB non-claims.

## P5.6 Option Feature Claim

P5.6 adds the `psc1-option-feature-supported` verification claim. The claim is supported by `npm run test:pslive:option`, `npm run test:pslive:language-fast`, and `npm run test:feature-promotion`.

## P5.7 List(Nat) Feature Claim

P5.7 adds the `psc1-list-nat-feature-supported` verification claim. The claim is supported by `npm run test:pslive:list`, `npm run test:pslive:language-fast`, and `npm run test:feature-promotion`.

## P5.8 String Literal Feature Claim

P5.8 adds the `psc1-string-literals-feature-supported` verification claim. The claim is supported by `npm run test:pslive:string`, `npm run test:pslive:language-fast`, and `npm run test:feature-promotion`.


## P5.11 Int Literal Feature Claim

P5.11 adds the `psc1-int-literals-feature-supported` verification claim. The claim is supported by `npm run test:pslive:int`, `npm run test:pslive:language-fast`, and `npm run test:feature-promotion`.

## P5.11 Int Arithmetic Feature Claim

P5.11 extends the Int feature claim with `tools/pslive-int-arith-tests.ts`, covering checked literal reductions, JS/TypeScript execution, `by rfl` smoke, and fail-closed bad payload tests.


## P5.12 Array(Nat) Feature

P5.12 adds expected-type-directed `Array(Nat)` literals using the canonical PSC-1 pipeline. Source `[]` and `[1, 2, 3]` parse as array literal terms, elaborate only when the expected type is `Array(A)`, lower to checked `Array.mk(A, List...)` Core, replay through the K3-TB kernel, and emit through the existing JS/TypeScript constructor encoding. This is not the full Lean Array API.


## P5.17 do-notation claim

`psc1-do-notation-feature-supported` is required for release and is evidenced by `tools/pslive-do-notation-tests.ts`, `test:pslive:language-fast`, and `test:feature-promotion`.


## P5.18 Array.map claim

`psc1-array-map-feature-supported` is required for release and is evidenced by `tools/pslive-array-map-tests.ts`, `test:pslive:language-fast`, and `test:feature-promotion`.


## P5.19 List.map claim

`psc1-list-map-feature-supported` is required for release and is evidenced by `tools/pslive-list-map-tests.ts`, `test:pslive:language-fast`, and `test:feature-promotion`.


## P5.20 List.foldl claim

Claim `psc1-list-foldl-feature-supported` is verified by `tools/pslive-list-foldl-tests.ts`, `test:pslive:language-fast`, feature-promotion checks, and the compact P5 controlled-release gate.

## P5.21 Array.foldl claim

Claim `psc1-array-foldl-feature-supported` is verified by `tools/pslive-array-foldl-tests.ts`, `test:pslive:language-fast`, feature-promotion checks, and the compact P5 controlled-release gate.


## P5.22 List.filter / Array.filter Feature

P5.22 supports explicit `List.filter(A, p, xs)` and `Array.filter(A, p, xs)` over checked finite payloads. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## P5.23 List.append / Array.append Feature

P5.23 verifies explicit `List.append(A, left, right)` and `Array.append(A, left, right)` through `tools/pslive-list-array-append-tests.ts`, the compact P5 controlled-release gate, and conformance smoke. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## P5.24 List.length / Array.isEmpty Feature

P5.24 verifies explicit `List.length(A, xs)` and `Array.isEmpty(A, xs)` through `tools/pslive-list-array-length-empty-tests.ts`, the compact P5 controlled-release gate, and conformance smoke. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## P5.31 List.isEmpty Feature

P5.31 verifies explicit `List.isEmpty(A, xs)` through `tools/pslive-list-isempty-tests.ts`, the compact P5 controlled-release gate, and conformance smoke. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.


## P5.47 Option.toArray / Except.toList Feature

P5.47 adds Option.toArray and Except.toList as checked-bootstrap conversion helpers with JS/TypeScript execution after Core checking. No kernel refactor or kernel source change is introduced.

## P5.48 Option.toExcept / Except.toArray Feature

P5.48 adds Option.toExcept and Except.toArray as checked-bootstrap conversion helpers with JS/TypeScript execution after Core checking. No kernel refactor or kernel source change is introduced.

## P5.49 Except.mapError Feature

P5.49 adds Except.mapError as a checked-bootstrap error-mapping helper with JS/TypeScript execution after Core checking. No kernel refactor or kernel source change is introduced.



## P5.50 Option.filter Feature and Elaborator Split

P5.50 adds explicit `Option.filter(A, p, value)` as a checked-bootstrap PSC-1 helper over existing `Option.rec` and `Bool.rec`, with JS/TypeScript execution after Core checking. It also extracts recursive typeclass synthesis helpers from `packages/elaborator/src/index.ts` into `packages/elaborator/src/typeclassSynthesis.ts`; this is a behavior-preserving elaborator structure improvement, not a kernel refactor. Trust remains K3-TB, not fully formal K3, not full Lean 4 equivalence, and formal Lean 4 equivalence proven obligations remain 0.

## P5.51 Option.flatten Claim

`psc1-option-flatten-feature-supported` records the checked-bootstrap support claim for explicit `Option.flatten(A, value)` calls. Required verification includes `test:pslive:option-flatten`, `test:pslive:language-fast`, and `test:feature-promotion`.


## P5.52 Except.flatten Verification Claim

P5.52 adds required claim `psc1-except-flatten-feature-supported`, linked to `test:pslive:except-flatten`, `test:pslive:language-fast`, and `test:feature-promotion`. Matrix count: 62 claims, 60 required claims, 170 tracked commands, 2 raw commands.


## P5.52 Except.flatten Feature

`psc1-except-flatten-feature-supported` records the checked-bootstrap support claim for explicit `Except.flatten(E, A, value)` calls. Required verification includes `test:pslive:except-flatten`, `test:pslive:language-fast`, and `test:feature-promotion`.

## P5.53 Except.toError Claim

The P5.53 verification matrix links `Except.toError` support to the focused pslive test, checked bootstrap, runtime/backend evidence, baseline checks, and the existing proof-obligation ledger.

## P5.54 Except.getErrorD Claim

The verification matrix includes `psc1-except-geterrord-feature-supported`, backed by `tools/pslive-except-geterrord-tests.ts`, the checked bootstrap source/artifact, backend/runtime helpers, and this report set. The claim is engineering evidence only and adds no formal Lean 4 equivalence proof.

## P5.55 Option.fold Claim

The verification matrix includes `psc1-option-fold-feature-supported`, backed by `tools/pslive-option-fold-tests.ts`, the checked bootstrap source/artifact, backend/runtime helpers, and the P5.55 report set. The claim is engineering evidence only and adds no formal Lean 4 equivalence proof.

## P5.56 Except.swap Claim

The verification matrix includes `psc1-except-swap-feature-supported`, backed by `tools/pslive-except-swap-tests.ts`, the checked bootstrap source/artifact, backend/runtime helpers, the class/instance elaborator extraction evidence, and the P5.56 report set. The claim is engineering evidence only and adds no formal Lean 4 equivalence proof.

## P5.57 Except.fold Claim

The verification matrix includes `psc1-except-fold-feature-supported`, backed by `tools/pslive-except-fold-tests.ts`, the checked bootstrap source/artifact, backend/runtime helpers, the telescope elaborator extraction evidence, and the P5.57 report set. The claim is engineering evidence only and adds no formal Lean 4 equivalence proof.


## P5.58 Except.bimap Claim

The verification matrix includes `psc1-except-bimap-feature-supported`, backed by `tools/pslive-except-bimap-tests.ts`, the checked bootstrap source/artifact, backend/runtime helpers, the core term elaborator extraction evidence, and the P5.58 report set. The claim is engineering evidence only and adds no formal Lean 4 equivalence proof.


## P5.59 Option.any Claim

The verification matrix includes `psc1-option-any-feature-supported`, backed by `tools/pslive-option-any-tests.ts`, the checked bootstrap source/artifact, backend/runtime helpers, the program/declaration elaborator extraction evidence, and the P5.59 report set. The claim is engineering evidence only and adds no formal Lean 4 equivalence proof.

## P5.60 Reference v0.6.1 Declaration Forms Claim

The verification matrix includes `psc1-reference-v061-declaration-forms-feature-supported`, backed by `tools/pslive-reference-v061-declaration-tests.ts`, the v0.6.1 language reference package under `docs/reference/`, parser changes, backend/runtime post-Core execution evidence, and the P5.60 report. The claim is engineering evidence only and adds no formal Lean 4 equivalence proof.

## P5.61 Reference v0.6.1 Match Body Claim

The verification matrix includes `psc1-reference-v061-match-body-feature-supported`, backed by `tools/pslive-reference-v061-match-tests.ts`, parser changes in `packages/parser/src/index.ts` and `packages/parser/src/patternParser.ts`, the extracted `termElaboration.ts` dispatcher, the existing match elaborator, runtime profile documentation, and this P5.61 report. The claim is engineering evidence only and adds no formal Lean 4 equivalence proof.

## P5.62 Reference v0.6.1 Where Body Claim

The verification matrix includes `psc1-reference-v061-where-body-feature-supported`, backed by `tools/pslive-reference-v061-where-tests.ts`, parser changes in `packages/parser/src/index.ts`, the extracted `packages/parser/src/whereBodyParser.ts`, existing let/lambda elaboration, runtime profile documentation, and the P5.62 report. The claim is engineering evidence only and adds no formal Lean 4 equivalence proof.

## P5.63 Reference v0.6.1 Structure Expression Bodies Claim

The verification matrix includes `psc1-reference-v061-structure-expression-bodies-feature-supported`, backed by `tools/pslive-reference-v061-structure-expr-tests.ts`, parser changes in `packages/parser/src/index.ts`, the extracted `packages/parser/src/definitionBodyParser.ts`, existing structure elaboration, runtime profile documentation, and the P5.63 report. The claim is engineering evidence only and adds no formal Lean 4 equivalence proof.


## P5.72 kernel-iff-eliminators-active0

`test:kernel:iff-eliminators-active0` verifies that the checked primitive prelude installs Lean 4.33.1-style `Iff.mp` and `Iff.mpr` theorem definitions derived from `Iff.rec`, not as new trusted axioms. This is K3-TB trusted-boundary evidence only, not formal Lean 4 equivalence.

## P5.73 kernel-iff-basic-theorems-active0

`test:kernel:iff-basic-theorems-active0` verifies that the checked primitive prelude installs Lean 4.33.1-style `Iff.refl`, `Iff.symm`, and `Iff.trans` theorem definitions derived from existing checked Iff declarations, not as new trusted axioms. This is K3-TB trusted-boundary evidence only, not formal Lean 4 equivalence.

## P5.74 kernel-classical-choice-active0

`test:kernel:classical-choice-active0` verifies that the optional classical primitive prelude installs Lean 4.33.1-style `Nonempty`, generated `Nonempty.rec`, and trusted primitive axiom `Classical.choice`. This is K3-TB trusted-boundary evidence only, not formal Lean 4 equivalence, and not executable runtime support for arbitrary choice.

## P5.75 Metadata Claim Separation

P5.75 adds `test:kernel:metadata-claim-separation0` to ensure K3-TB checklist completion is not represented as `positive fullKernelComplete claim`. Full Lean 4 equivalence and formal K3 remain unproved.

## P5.76 False / False.elim Checked Prelude

P5.76 adds `test:kernel:false-elim-active0` to verify Lean-style `False : Prop` and checked `False.elim.{u} : {C : Sort u} → False → C`. Exact Lean 4.33.1 checks are evidence for this audited slice only; full Lean 4 equivalence and formal K3 remain unproved.

## P5.83 Arena Transparent Recursive Field0 Smoke

P5.83 adds `test:arena:smoke` to verify a minimal Lean Kernel Arena NDJSON adapter skeleton. The smoke test covers one tiny accepted axiom fixture, one semantically rejected definition fixture, one malformed JSON fixture, and one explicitly unsupported inductive fixture. This is adapter/tooling evidence only: the full Arena tutorial suite is not yet run or claimed, projection/structure tutorial cases remain expected blockers, and full Lean 4 equivalence remains unproved.

# ProofScript Production Architecture Status

This document describes the current practical production path after P4.96.

## Current Canonical Path

```text
.ps source
  -> packages/parser
  -> packages/elaborator
  -> checked Core declarations
  -> packages/kernel K3-TB check
  -> .pscore artifact / packages/kernel-codec
  -> packages/verifier replay
  -> packages/backend-typescript
  -> packages/runtime
```

## Current Trust Claim

The implementation is K3-TB: a trusted-boundary standalone implementation with executable artifacts, replay/certificate checks, architecture guards, and regression evidence.

It is not fully formal K3 and is not proven equivalent to Lean 4. Formal Lean 4 equivalence remains 0 proven obligations.

## Production-Path Packages

```text
packages/syntax
packages/parser
packages/elaborator
packages/std
packages/environment
packages/kernel
packages/kernel-codec
packages/certificates
packages/verifier
packages/backend-typescript
packages/runtime
```

## Product/Tooling Packages

```text
packages/frontend
packages/project
packages/cli
packages/lsp
```

## Experimental or Bridge Packages

These packages contain future architecture, integration, or broader ecosystem work. They should not redefine the canonical trust claim without an explicit promotion gate.

```text
packages/frontend-next
packages/unified-bridge
packages/compiler
packages/semantic-ir
packages/macro
packages/tactics-core
packages/oracle-lean
packages/lean-export
plugins/*
```

## Feature Addition Rule

Every new feature should follow this path:

```text
1. Surface syntax/parser support if needed.
2. Elaboration into checked Core or checked std/bootstrap declarations.
3. Kernel acceptance through existing Core rules, or explicit new kernel obligation.
4. Backend/runtime execution only after Core checking.
5. JS smoke, TS compile smoke, theorem/rfl smoke when reducible.
6. Negative fail-closed tests.
7. Reference-governance or support-matrix update.
```

Backend or runtime code must not become the source of proof validity. They execute already-checked Core only.

## Elaborator Extension Points After P4.96

```text
packages/elaborator/src/globalEnvironment.ts     global metadata, namespace lookup, pending recursive head inference
packages/elaborator/src/coreUtils.ts             shared Core-shape helpers
packages/elaborator/src/proofElaborator.ts       by/rfl/exact/assumption/apply/intro proof elaboration
packages/elaborator/src/inductiveElaborator.ts   structure and inductive declaration elaboration
packages/elaborator/src/matchElaborator.ts       match, constructor cases, Nat literal match lowering, equation theorems
packages/elaborator/src/index.ts                 orchestration and remaining generic term/typeclass elaboration
```

## Next Architecture Goal

P4.97 should add package classification and enforce which packages are production, experimental, bridge, legacy, or trusted. This will make the repository explainable to contributors and future agents before adding larger features such as Option, List, String, Int, and modules.

## P4.97 Package Classification Gate

P4.97 adds a machine-readable package classification manifest at `config/package-classification.json` and the checker `tools/check-package-classification.ts`.

`npm run test:architecture` now runs both:

```text
node tools/check-boundaries.ts
node tools/check-package-classification.ts
```

This makes the canonical PSC-1 production path explicit and enforced. Stable PSC-1 packages must remain canonical and must have tier `trusted`, `language`, or `execution`. Bridge and experimental packages remain useful, but they cannot silently become part of the trust claim.

The K3-TB trust claim remains unchanged: trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## P4.98 Feature Promotion Gate

P4.98 adds a machine-readable production feature promotion manifest at `config/feature-promotion-gate.json` and the checker `tools/check-feature-promotion.ts`.

`npm run test:architecture` now runs:

```text
node tools/check-boundaries.ts
node tools/check-package-classification.ts
node tools/check-feature-promotion.ts
```

A supported PSC-1 feature must now carry explicit evidence for parser/syntax, elaborator or checked Core/bootstrap behavior, kernel-impact statement, backend/runtime execution when executable, JS smoke, TypeScript compile smoke, rfl/reduction smoke when applicable, negative fail-closed tests, governance/matrix evidence, package scripts, and documentation reports.

This is an architecture gate for explainability and safer future feature work. The trust claim remains K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## P4.99 Verification Matrix

P4.99 adds `config/verification-matrix.json` as the canonical claim-to-command map for production status.

The architecture gate now enforces four machine-checkable layers:

```txt
trust-boundary dependency checks
package classification checks
feature promotion evidence checks
verification matrix claim-to-command checks
```

This improves explainability and release discipline. It does not prove Lean 4 equivalence; the trust label remains K3-TB trusted-boundary with zero formal Lean 4 equivalence obligations proven.

## P5.2 Proof Obligation Ledger

The production architecture gate now includes a proof-obligation ledger. This gives the trusted-boundary architecture a concrete formal roadmap: kernel equivalence, Core soundness, elaborator soundness, std bootstrap soundness, backend preservation, runtime semantics, artifact replay, and feature proof-obligation coverage.

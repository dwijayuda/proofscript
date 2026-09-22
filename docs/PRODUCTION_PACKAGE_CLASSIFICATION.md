# ProofScript Production Package Classification

P4.97 makes package status explicit and machine-checkable. The source of truth is `config/package-classification.json`; `npm run test:architecture` now includes `tools/check-package-classification.ts` so the classification is an enforced architecture gate.

## Trust Claim

The current implementation remains **K3-TB trusted-boundary**.

It is **not** fully formal K3, and it is **not** proven equivalent to Lean 4. Formal Lean 4 equivalence remains **0 proven obligations**.

## Canonical PSC-1 Production Path

These packages form the current stable path from `.ps` source to checked Core, verification, and JS/TypeScript execution:

```text
packages/syntax
packages/parser
packages/recursion
packages/typeclass
packages/elaborator
packages/std
packages/environment
packages/frontend
packages/kernel
packages/kernel-codec
packages/certificates
packages/verifier
packages/backend-typescript
packages/runtime
```

A package in this path must be classified as `canonical` and must have tier `trusted`, `language`, or `execution`. Experimental or bridge packages are not allowed in the stable PSC-1 path without explicit promotion.

## Trusted Packages

```text
packages/kernel
packages/kernel-codec
packages/certificates
packages/verifier
```

Trusted packages are TCB-adjacent. They must stay dependency-limited and must not import runtime, backend, product, plugin, bridge, or experimental layers except for the explicitly allowed trusted dependencies in `config/package-classification.json`.

## Language Packages

```text
packages/syntax
packages/parser
packages/recursion
packages/typeclass
packages/elaborator
packages/std
packages/environment
packages/frontend
```

These define and elaborate the current PSC-1 language. They may produce Core candidates, checked bootstrap artifacts, or product-facing pipeline orchestration, but the kernel remains the authority for trusted Core checking.

## Execution Packages

```text
packages/runtime
packages/backend-typescript
```

Execution packages run or emit already-checked programs. They must not become proof validators. Adding a runtime shortcut without a checked Core or checked bootstrap story is not production-grade.

## Product and Plugin Infrastructure

```text
packages/diagnostics
packages/formatter
packages/project
packages/cli
packages/lsp
packages/plugin-api
packages/plugin-host
```

These packages support the user-facing product, editor/tooling, project configuration, and plugin loading. They may orchestrate workflows but must not redefine the K3-TB trust claim.

## Experimental and Bridge Packages

```text
packages/lean-export
packages/oracle-lean
packages/unified-bridge
packages/compiler
packages/semantic-ir
packages/frontend-next
packages/macro
packages/tactics-core
plugins/official/*
plugins/examples/*
```

Bridge packages can provide correspondence evidence or migration paths. Experimental packages are feature reservoirs or prototypes. They are useful, but they are not the canonical PSC-1 production path until promoted through the gate below.

## Feature Promotion Gate

A feature is production-grade only when it has:

```text
1. Parser tests when syntax changes.
2. Elaboration into checked Core or checked bootstrap declarations.
3. A kernel obligation entry if trusted rules change.
4. JS execution smoke and TypeScript compile smoke for executable features.
5. Theorem/rfl smoke when reduction should be definitional.
6. Negative fail-closed tests for unsupported or unsafe forms.
7. Reference-governance and package-classification updates if support or boundaries change.
```

## Why this matters

Before P4.97, the repo had a good practical pipeline, but new contributors and future agents could still confuse canonical PSC-1 packages with large experimental tracks such as `frontend-next`, `semantic-ir`, `compiler`, and plugin prototypes. P4.97 turns that distinction into executable policy.

The intended rule is simple:

```text
canonical source feature
  -> parser/elaborator/std/kernel path
  -> checked artifact/verifier path
  -> backend/runtime execution path
```

Not:

```text
experimental plugin/backend/runtime behavior
  -> claimed as proof validity
```

## P4.98 Link: Feature Promotion Gate

Package classification says which packages are canonical, trusted, execution, product, bridge, plugin infrastructure, or experimental. P4.98 adds a second gate at `config/feature-promotion-gate.json` to say when a specific feature may be called production-supported.

Together, the two gates enforce two different questions:

```text
package classification: may this package participate in the canonical PSC-1 path?
feature promotion: does this feature have enough parser/elaborator/kernel/runtime/test/doc evidence?
```

Both keep the same trust claim: K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

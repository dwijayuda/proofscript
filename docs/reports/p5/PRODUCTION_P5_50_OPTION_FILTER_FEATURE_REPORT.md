# P5.50 Option.filter Feature and Elaborator Split Report

## Summary

P5.50 adds explicit `Option.filter(A, p, value)` support as a checked-bootstrap PSC-1 helper. The helper keeps `Option.some(A, x)` only when the checked predicate `p(x)` evaluates to `Bool.true`; it returns `Option.none(A)` for `Option.none(A)` and for `some` payloads whose predicate returns `Bool.false`.

P5.50 also refactors `packages/elaborator/src/index.ts` by extracting recursive typeclass synthesis helpers into `packages/elaborator/src/typeclassSynthesis.ts`. The split is behavior-preserving: it keeps the same elaboration entry points, preserves hidden-prefix synthesis and recursive instance-search behavior, and reduces the central elaborator index from 1321 lines to 1119 lines.

## Kernel impact

No kernel source changed. `packages/kernel/src` and `packages/kernel-codec/src` remain untouched by this feature and refactor. `Option.filter` is implemented as a checked bootstrap definition over existing `Option.rec` and `Bool.rec`; JS/TypeScript backend helpers execute only after Core checking.

## Scope

Supported explicit form:

```text
Option.filter(A, p, value): Option(A)
```

Required checked types:

```text
A: Type
p: A -> Bool
value: Option(A)
```

Behavior:

```text
Option.filter(A, p, Option.none(A))      = Option.none(A)
Option.filter(A, p, Option.some(A, x))   = if p(x) then Option.some(A, x) else Option.none(A)
```

## Verification

Focused tests:

- `tools/pslive-option-filter-tests.ts`
- `tools/k1d-foundation-tests.ts`

Governance and release checks updated:

- `config/feature-promotion-gate.json`
- `config/verification-matrix.json`
- `config/production-traceability-bundle.json`
- `config/development-workflow.json`
- `config/proof-obligations-ledger.json`
- `config/package-classification.json`
- `tools/verify-p5-controlled-release.ts`
- `tools/create-p5-source-release.ts`
- `tools/p5-controlled-baseline-tests.ts`
- `tools/production-status.ts`

## Trust boundary

P5.50 remains K3-TB trusted-boundary engineering evidence. It is not fully formal K3, not full Lean 4 equivalence, and it proves zero formal Lean 4 equivalence obligations.

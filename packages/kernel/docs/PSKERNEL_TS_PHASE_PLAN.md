# pskernel TypeScript Kernel Phase Plan

## Phase 0 — Findings/map

Completion: 5%.

Deliverables:

```txt
docs/PSKERNEL_TS_REWRITE_FINDINGS.md
docs/PSKERNEL_TS_PORTING_MAP.md
docs/PSKERNEL_TS_PHASE_PLAN.md
```

## Phase 1 — Skeleton mirror

Completion target: 12%.

Create `packages/kernel/src/PSKernel/**/*.ts` for every uploaded pskernel source file. Keep unsupported files fail-closed.

## Phase 2 — Core ADTs

Completion target: 25%.

Implement Name, Level, Expr/Term, Declaration, LocalContext, Environment/Basic, FuelConfig, Instantiate, and traversal helpers.

## Phase 3 — TypeChecker core

Completion target: 40%.

Implement partial `inferType`, `whnf`, `isDefEq`, `ensureSort`, `ensureForall`, beta, zeta, simple delta, and universe checks.

## Phase 4 — Environment admission active

Completion target: 55%.

Implement declaration admission for axiom/definition/theorem/opaque/example and the safe skeleton for inductive/quotient declarations.

## Phase 5 — Quotients, primitives, inductives

Completion target: 70%.

Port quotient and inductive reduction/admission slices. Do not overclaim full inductive support.

## Phase 6 — Replay and CLI

Completion target: 78%.

Port replay and `pskernel` commands for inventory/status/check-core/replay/obligations.

## Phase 7 — Surrounding packages

Completion target: 85%.

Rewrite kernel-codec, verifier, environment, elaborator, compiler, frontend, semantic-ir, lean-export, cli, lsp around the new kernel.

## Phase 8 — Parser/elaborator alignment

Completion target: 92%.

Align with command-by-command dynamic parser and elaborator boundary.

## Phase 9 — Proof-obligation system

Completion target: 97%.

Create machine-readable theorem/proof obligations for every ported function. Formal equivalence remains a separate future gate.

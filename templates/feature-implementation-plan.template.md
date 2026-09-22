# <Feature Name> Implementation Plan

> Required execution skill: use TDD/red-green-refactor. Do not add production code before the failing regression exists.

## Goal

Describe the smallest supported behavior in one sentence.

## Scope

- Lifecycle: planned / experimental / supported
- Trust level: parser-only / checked-bootstrap / existing-kernel-rules / trusted-kernel-change / execution-only-after-core
- Kernel impact: no-new-kernel-rule / checked-bootstrap-only / new-kernel-obligation / non-executable-surface / fail-closed-only

## Feature Implementation Steps

1. Write the red regression test and record the expected failure.
2. Add parser/syntax support, if needed.
3. Add elaborator/Core lowering or checked bootstrap definitions.
4. Add backend/runtime execution only after checked Core exists.
5. Add negative fail-closed tests.
6. Add feature-promotion entry with proofObligationIds.
7. Update verification matrix or traceability if the claim surface changes.
8. Run the focused matrix and fresh-extract smoke.

## Proof Obligations

List every obligation ID from `config/proof-obligations-ledger.json` that this feature depends on.

## Evidence

List parser, elaborator/kernel, backend/runtime, JS smoke, TS compile, rfl/reduction, negative, governance, and docs evidence.

## Non-Claims

State that the feature does not prove full Lean 4 equivalence unless a formal proof artifact exists.

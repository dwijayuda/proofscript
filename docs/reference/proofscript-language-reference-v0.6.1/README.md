# ProofScript Language Reference v0.6.1

Status: **Authoritative draft v0.6.1 — Compiler-Ready Reference Package**

Semantic baseline: **Lean 4.33.1** (`819816b2e0a3bf405af45ae5c7af2491d8f5bee6`).

v0.6.1 continues the v0.6.0 language reference and adds implementation-facing conformance artifacts. The language philosophy remains:

> **TypeScript-friendly syntax where it helps; Lean semantics wherever it matters.**

## What v0.6.1 adds

- machine-readable feature registry;
- JSON Schema for the registry;
- positive, negative, and lowering conformance cases;
- expected canonical Lean lowerings;
- compiler milestone plan;
- parser/lowering API contract;
- compiler-readiness audit.

## Main reference

- `ProofScript_Language_Reference_v0.6.1_authoritative_draft.md`

## Appendices

- `appendices/A-complete-feature-registry.md`
- `appendices/B-lean-reference-coverage-map.md`
- `appendices/C-formal-proof-obligations.md`
- `appendices/D-typescript-runtime-profile.md`
- `appendices/E-error-and-diagnostic-catalog.md`
- `appendices/F-version-manifest-template.md`
- `appendices/G-conformance-suite.md`
- `appendices/H-implementation-milestone-plan.md`
- `appendices/I-parser-lowering-api-contract.md`

## Conformance artifacts

- `conformance/feature-registry.json`
- `conformance/feature-registry.schema.json`
- `conformance/cases/positive.jsonl`
- `conformance/cases/negative.jsonl`
- `conformance/cases/lowering.jsonl`
- `conformance/expected/positive-lowerings.lean`

## Claim ceiling

This package is **S1 specified**. It is not S2 reference-proved until the exact pinned Lean toolchain executes the relevant parser/lowering proofs.

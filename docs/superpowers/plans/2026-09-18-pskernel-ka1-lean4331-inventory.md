# PSKernel KA-1 Lean 4.33.1 Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first assurance layer that turns “PSKernel equivalent to Lean 4 theory” into machine-readable inventory, trust classification, proof obligations, gap tracking, and theorem targets.

**Architecture:** Keep trusted kernel semantics frozen. Add assurance-only artifacts under `assurance/ka1/`, a validation gate under `tools/`, and package metadata that identifies this as public version `1.0.0-pskernel.3`.

**Tech Stack:** TypeScript validation scripts executed through Node `--experimental-strip-types`; JSON assurance ledgers; Lean theorem-target skeleton as non-trusted planning artifact.

**Spec:** `assurance/ka1/KA1_REPORT.md`

## Global Constraints

- Do not change `packages/kernel/src/PSKernel` semantics.
- Do not change kernel codec semantics.
- Do not claim full Lean 4 equivalence.
- Do not count Arena evidence as a formal theorem.
- Keep serialized Core artifact format at `71`.
- Keep certificate format at `2`.
- Preserve active kernel name `PSKernel`.

---

## Tasks

- [x] Write failing KA-1 assurance test requiring inventory/spec/obligation/gap/skeleton files.
- [x] Verify the test fails before implementation.
- [x] Add Lean 4.33.1 kernel inventory JSON.
- [x] Add PSCore v71 trust-classification spec JSON.
- [x] Add proof-obligation ledger JSON.
- [x] Add gap matrix JSON.
- [x] Add translation/soundness theorem target skeleton.
- [x] Add `assurance:ka1` validator and `test:pskernel:ka1` test command.
- [x] Update version metadata to `1.0.0-pskernel.3`.
- [x] Run KA-1 gate and selected regression tests.

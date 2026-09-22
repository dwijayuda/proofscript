# PSKernel KA-3 Non-Inductive Soundness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first formal assurance layer that binds the KA-2 translation relation to a Lean-shaped non-inductive soundness skeleton without changing trusted kernel semantics.

**Architecture:** Keep KA-3 entirely under `assurance/ka3` and `tools/pskernel-ka3-soundness.ts`. The gate reads KA-1/KA-2 artifacts, classifies non-inductive declarations, verifies representative translation samples, and records that this is a skeleton rather than a machine-checked Lean proof.

**Tech Stack:** TypeScript run by Node `--experimental-strip-types`, JSON assurance manifests, self-contained Lean skeleton text.

**Spec:** `assurance/ka3/reference-model.json` and `assurance/ka3/noninductive-soundness.json`.

## Global Constraints

- Do not change `packages/kernel`, `packages/kernel-codec`, `packages/verifier`, or `packages/certificates` semantics.
- Keep Core artifact format at `71`.
- Keep `fullLean4Equivalence=false`, `sameTheoryAsFullLean4=false`, and `formalLean4EquivalenceProvenObligations=0`.
- Mark `leanCheckedHere=false` unless a real Lean executable compiles the skeleton.
- Exclude quotient and inductive declarations from the KA-3 non-inductive slice.

---

## Tasks

- [x] Add failing KA-3 tests for missing assurance files and missing tool.
- [x] Add KA-3 JSON artifacts for the reference model and proof obligation delta.
- [x] Add self-contained Lean skeleton with no `sorry`.
- [x] Add `tools/pskernel-ka3-soundness.ts` classifier and assurance gate.
- [x] Update package scripts and version metadata.
- [x] Run KA-1, KA-2, KA-3, Arena, kernel smoke, and conformance gates.
- [x] Package a frozen source ZIP and reports.

# PSKernel KA-4 Lean Toolchain Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a strict/soft Lean 4.33.1 machine-check gate for the KA-3 non-inductive soundness skeleton without changing trusted kernel semantics.

**Architecture:** KA-4 lives entirely under `assurance/ka4` plus a small Node gate in `tools/`. The trusted PSKernel implementation and Core v71 codec are not modified.

**Tech Stack:** Node 22 TypeScript strip-types runner, JSON assurance artifacts, Lean 4.33.1 when available.

**Spec:** `assurance/ka4/lean-toolchain-gate.json`

## Global Constraints

- Preserve Core artifact format 71.
- Do not change `packages/kernel` semantics.
- Do not claim machine-checked Lean proofs unless `npm run lean:ka4:check` passes with Lean 4.33.1.
- Keep full Lean 4 equivalence false until theorem obligations are proven.

---

## Tasks

- [x] Add KA-4 proof-check scope artifacts.
- [x] Add strict and soft Lean gate commands.
- [x] Add tests for missing-Lean and artifact integrity behavior.
- [x] Preserve KA-1/KA-2/KA-3 compatibility.
- [ ] Mount Lean 4.33.1 and run `npm run lean:ka4:check` in a future environment.
- [ ] Replace the self-contained model with a pinned Lean4Lean import after strict Lean checking is available.

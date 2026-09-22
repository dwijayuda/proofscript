# PSKernel KA-6 Lean4Lean-Compatible Binding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first machine-checked Lean4Lean-compatible reference binding for PSKernel's non-inductive translation slice without changing trusted kernel semantics.

**Architecture:** Keep the trusted TypeScript kernel untouched. Add assurance-only Lean and TypeScript gate files under `assurance/ka6` and `tools/` that machine-check a compatibility interface and record the remaining gap to a real pinned Lean4Lean import.

**Tech Stack:** Lean 4.33.1, Node 22, TypeScript strip-types runner, JSON release gates.

**Spec:** `assurance/ka6/lean4lean-reference-binding.json`

## Global Constraints

- Do not change trusted kernel semantics.
- Do not change Core artifact format 71.
- Do not claim full Lean 4 equivalence.
- Do not claim imported Lean4Lean proof until a pinned dependency is actually imported and checked.

---

- [x] Add failing `test:pskernel:ka6` gate.
- [x] Add KA-6 Lean reference-binding file.
- [x] Add KA-6 JSON manifest and obligation delta.
- [x] Add TypeScript assurance/check scripts.
- [x] Update package scripts and version metadata.
- [x] Run strict Lean 4.33.1 check.
- [x] Run regression suite and package checkpoint.

# PSKernel KA-12 Direct Lean4Lean Binding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the first compatibility-only reference interface with a direct imported Lean4Lean theory binding for the non-inductive assurance slice.

**Architecture:** Keep trusted PSKernel code unchanged. Reuse KA-11 offline Lean4Lean+batteries materialization, build `Lean4Lean.Theory.VDecl`, and machine-check a Lean file translating PSKernel assurance shapes to actual Lean4Lean theory structures.

**Tech Stack:** Node.js TypeScript strip-types runner, Lean 4.33.1, Lake, Lean4Lean uploaded source, offline Batteries v4.33.0-rc2.

**Spec:** `assurance/ka12/direct-lean4lean-binding.json`

## Global Constraints

- Do not change trusted kernel semantics.
- Do not change kernel codec or Core artifact format; Core remains 71.
- Do not claim full Lean 4 equivalence.
- Do not claim formal equivalence obligations are proven; count remains 0.
- Strict gate must fail if Lean4Lean source or direct import check fails.

---

- [x] Add direct Lean4Lean theory import Lean file.
- [x] Add KA-12 metadata and obligation delta.
- [x] Add executable strict gate.
- [x] Add regression tests.
- [x] Run build and assurance checks.
- [x] Package final checkpoint.

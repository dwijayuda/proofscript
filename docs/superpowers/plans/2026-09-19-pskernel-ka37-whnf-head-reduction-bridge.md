# PSKernel KA-37 WHNF Head-Reduction Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a narrow, machine-checked Lean4Lean WHNF/head-reduction bridge without changing trusted PSKernel semantics.

**Architecture:** Keep KA-37 as an assurance-only checkpoint. Import `Lean4Lean.Theory.Typing.HeadReduction`, prove wrapper lemmas over existing Lean4Lean theorems, and gate them with a strict Node tool.

**Tech Stack:** Lean 4.33.1, Lean4Lean offline source, TypeScript Node strip-types gate scripts, npm scripts.

**Spec:** `assurance/ka37/whnf-head-reduction-bridge.json`

## Global Constraints

- Active kernel remains PSKernel.
- Core artifact format remains 71.
- Certificate format remains 2.
- No trusted semantic rule is changed.
- No kernel codec behavior is changed.
- Do not claim full Lean4 equivalence or executable PSKernel WHNF refinement.

# PSKernel KA-38 WHNF Preservation Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a narrow direct Lean4Lean WHNF preservation bridge and report conservative kernel-feature-equivalence progress percentages.

**Architecture:** KA-38 imports Lean4Lean's existing theory-level head-reduction lemmas and wraps them in PSKernel assurance lemmas. It does not alter PSKernel trusted semantics, Core format, codec behavior, or executable runtime code.

**Tech Stack:** Lean 4.33.1, Lean4Lean, TypeScript gate scripts, npm offline verification.

**Spec:** `assurance/ka38/whnf-preservation-bridge.json`

## Global Constraints

- Active kernel remains PSKernel.
- Core artifact format remains 71.
- Certificate format remains 2.
- No trusted semantic change.
- No kernel codec change.
- No full Lean4 equivalence claim.
- Progress percentages are checkpoint estimates, not formal equivalence theorems.

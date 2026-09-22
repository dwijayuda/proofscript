# PSKernel KA-7 Real Lean4Lean Import Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a strict, honest gate that binds PSKernel assurance work to an actual pinned Lean4Lean source tree when available.

**Architecture:** Keep the trusted PSKernel code unchanged. Add source discovery, version-policy checks, a generated Lean import check, and release metadata that reports missing source as a blocked gate instead of an equivalence claim.

**Tech Stack:** Node TypeScript with `--experimental-strip-types`, Lean 4.33.1 materialized by KA-5, Lake when a Lean4Lean source tree is mounted.

**Spec:** `assurance/ka7/lean4lean-source-manifest.json`

## Global Constraints

- Do not change trusted kernel semantics.
- Do not change Core artifact format 71.
- Do not claim full Lean 4 equivalence.
- Do not claim actual Lean4Lean import binding unless `npm run lean:ka7:import` passes.

---

## Tasks

- [ ] Add KA-7 manifest and release gate.
- [ ] Add source-discovery tool.
- [ ] Add strict import gate that fails when source is absent.
- [ ] Add tests for local missing-source status.
- [ ] Run build, KA-1..KA-7 assurance, Lean KA-6 check, Arena, kernel smoke.

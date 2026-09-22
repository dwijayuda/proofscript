# PSKernel KA-8 Lean4Lean Source Intake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an operational source-intake layer that can accept a future Lean4Lean archive and route it into the strict KA-7 import gate.

**Architecture:** KA-8 remains outside the trusted kernel. It discovers archives, extracts them into a stable `/mnt/data/lean4lean-intake` location, then delegates to KA-7 for the actual source/import check.

**Tech Stack:** Node.js TypeScript strip-types runner, Lean 4.33.1 toolchain from KA-5, existing KA-7 import gate.

**Spec:** `assurance/ka8/lean4lean-source-intake.json`

## Global Constraints

- Do not change PSKernel trusted semantics.
- Do not change Core artifact format 71.
- Do not claim full Lean 4 equivalence.
- Strict mode must fail if no real Lean4Lean source is available.

---

## Tasks

- [x] Add KA-8 spec, report, release gate, and obligation delta.
- [x] Extend KA-7 source candidates with stable KA-8 intake paths.
- [x] Add source archive discovery/extraction tool.
- [x] Add soft and strict commands.
- [x] Add tests that validate honest missing-source behavior.
- [x] Run build, KA gates, Arena, and kernel smoke.

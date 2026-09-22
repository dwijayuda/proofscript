# PSKernel KA-9 Lean4Lean Compatibility Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Intake the uploaded Lean4Lean source archive, audit compatibility against the PSKernel Lean 4.33.1 baseline, and keep the strict import gate honest.

**Architecture:** Add an assurance-only KA-9 gate above the trusted kernel boundary. The gate detects numbered upload filenames, extracts Lean4Lean source to a stable path, checks required files/toolchain/dependencies, attempts the real build path, and classifies blockers without claiming equivalence.

**Tech Stack:** Node/TypeScript scripts, Lean 4.33.1 materialized by KA-5, Lake, JSON assurance metadata.

**Spec:** `assurance/ka9/lean4lean-compat-audit.json`

## Global Constraints

- Do not change PSKernel trusted semantics.
- Do not change Core artifact format 71.
- Do not claim full Lean 4 equivalence.
- Strict import must fail until actual Lean4Lean import passes.

---

- [x] Add KA-9 metadata and report files.
- [x] Add numbered archive discovery and extraction.
- [x] Add toolchain/dependency compatibility classification.
- [x] Add test and assurance scripts.
- [x] Run build, KA gates, Arena, and package verification.

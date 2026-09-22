# PSKernel KA-5 Lean 4.33.1 Strict Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Materialize Lean 4.33.1 from uploaded archives and make the strict KA-4 proof-file check pass.

**Architecture:** Keep trusted PSKernel semantics unchanged. Add a toolchain materialization script and a KA-5 gate that calls the KA-4 strict Lean checker after discovering the materialized Lean binary.

**Tech Stack:** Node 22 strip-types scripts, Lean 4.33.1 Linux archive, 7zz, tar+zstd.

**Spec:** `assurance/ka5/toolchain-materialization.json`

## Global Constraints

- Do not modify `packages/kernel` semantics.
- Do not change Core format 71.
- Do not claim full Lean 4 equivalence.
- Machine-checked claim is limited to `assurance/ka4/noninductive-soundness-machine-check.lean`.

---

## Tasks

- [x] Add KA-5 materialization metadata.
- [x] Teach KA-4 discovery known `/mnt/data` Lean 4.33.1 paths.
- [x] Add `tools/pskernel-ka5-toolchain.ts`.
- [x] Add strict and soft npm scripts.
- [x] Run strict Lean check with Lean 4.33.1.
- [x] Run regression gates.

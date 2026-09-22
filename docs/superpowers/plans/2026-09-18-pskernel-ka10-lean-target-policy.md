# PSKernel KA-10 Lean Target Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Relax the external Lean4Lean source toolchain acceptance policy from exact `leanprover/lean4:v4.33.1` to `leanprover/lean4:v4.33.x` or later while preserving honest proof/equivalence boundaries.

**Architecture:** Add a KA-10 assurance layer above the trusted kernel. Keep PSKernel Core format and trusted semantics unchanged. Separate source toolchain compatibility, local proof-check toolchain, and dependency materialization.

**Tech Stack:** Node.js TypeScript scripts, JSON assurance manifests, npm package gates, existing Lean 4.33.1 materialization.

**Spec:** `assurance/ka10/lean-target-policy.json`

## Global Constraints

- No trusted kernel semantic change.
- No kernel codec change.
- No Core artifact format change; remain on Core format 71.
- Do not claim full Lean 4 equivalence or same theory as full Lean 4.
- Strict Lean4Lean import may only pass after actual dependencies are materialized and `lake build Lean4Lean` succeeds.

---

- [x] Add KA-10 target-policy manifest.
- [x] Add executable target-policy gate.
- [x] Add tests proving v4.33.0-rc2 is accepted by source policy.
- [x] Audit uploaded `batteries-main.zip` as a dependency archive, but do not treat it as exact `v4.33.0-rc2`.
- [x] Run build, KA tests, Arena, kernel smoke, and fresh-extract smoke.

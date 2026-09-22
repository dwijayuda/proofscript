# PSKernel KA-24 NonDef Env No-Overwrite Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the next narrow Lean4Lean bridge proving theorem/opaque `addConst` freshness and unrelated constant-lookup preservation.

**Architecture:** Keep PSKernel runtime semantics unchanged. Add one Lean proof file importing KA-23 and one TypeScript gate that compiles the proof against the cached offline Lean4Lean build.

**Tech Stack:** Lean 4.33.1, Lean4Lean offline source, TypeScript gate scripts, npm offline verification.

**Spec:** `assurance/ka24/nondef-env-no-overwrite-bridge.json`

## Global Constraints

- Public version: `1.0.0-pskernel.27`.
- Checkpoint: `proofscript-v1-ka24-nondef-env-no-overwrite-bridge0`.
- Core artifact format remains `71`.
- Certificate format remains `2`.
- No trusted PSKernel semantic change.
- No kernel codec change.
- No new trusted computation rule.
- Full Lean 4 equivalence remains false.
- Same-theory-as-full-Lean4 remains false.
- Fully formal K3 remains false.

---

### Task 1: Add KA-24 bridge artifacts

**Files:**
- Create: `assurance/ka24/nondef-env-no-overwrite-bridge.lean`
- Create: `assurance/ka24/nondef-env-no-overwrite-bridge.json`
- Create: `assurance/ka24/obligation-delta.json`
- Create: `tools/pskernel-ka24-nondef-env-no-overwrite-bridge.ts`
- Create: `tools/pskernel-ka24-nondef-env-no-overwrite-bridge-tests.ts`

**Interfaces:**
- Consumes: KA-23 imported Lean4Lean bridge modules.
- Produces: `runKA24NonDefEnvNoOverwriteBridgeGate({ strict: true })`.

- [x] Write failing test requiring KA-24 files and strict gate.
- [x] Run failing test and verify missing tool failure.
- [x] Implement Lean bridge lemmas.
- [x] Implement TypeScript strict assurance gate.
- [x] Run focused test until pass.

### Task 2: Release metadata and verification

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `versions.json`
- Create: `assurance/ka24/KA24_REPORT.md`
- Create: `assurance/ka24/KA24_RELEASE_GATE.json`
- Create: `assurance/ka24/KA24_VERIFICATION_SUMMARY.json`

**Interfaces:**
- Consumes: focused KA-24 strict result.
- Produces: release ZIP and SHA-256.

- [x] Bump version to `1.0.0-pskernel.27`.
- [x] Add npm scripts for KA-24.
- [x] Run focused and release verification commands.
- [x] Package final ZIP and SHA-256.

# PSKernel KA-25 Non-Definition Environment DefEq Preservation Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the smallest direct Lean4Lean bridge proving non-definition theorem/opaque declaration additions preserve or add `VEnv.defeqs` evidence.

**Architecture:** Reuse KA-24 as the baseline. Add a KA-25 Lean module importing `Lean4Lean.Theory.Typing.Env` and `PSKernelKA24NonDefEnvNoOverwriteBridge`, plus a strict TypeScript gate that compiles the Lean module in the cached offline Lean4Lean tree.

**Tech Stack:** Lean 4.33.1, Lean4Lean offline source, Node 22 TypeScript strip-types scripts, JSON release gates.

**Spec:** `assurance/ka25/nondef-env-defeq-preservation-bridge.json`

## Global Constraints

- PSKernel trusted semantics unchanged.
- Core artifact format remains 71.
- Certificate format remains 2.
- No full Lean 4 equivalence claim.
- No same-theory claim.
- No fully formal K3 claim.

---

### Task 1: Red test

**Files:**
- Create: `tools/pskernel-ka25-nondef-env-defeq-preservation-bridge-tests.ts`

**Interfaces:**
- Consumes: `runKA25NonDefEnvDefEqPreservationBridgeGate({ strict: true })`
- Produces: a failing test until KA-25 artifacts exist.

- [x] Write failing test.
- [x] Run it and confirm `ERR_MODULE_NOT_FOUND` for the KA-25 tool.

### Task 2: Lean bridge and gate

**Files:**
- Create: `assurance/ka25/nondef-env-defeq-preservation-bridge.lean`
- Create: `tools/pskernel-ka25-nondef-env-defeq-preservation-bridge.ts`

**Interfaces:**
- Produces: `runKA25NonDefEnvDefEqPreservationBridgeGate` returning checkpoint metadata and strict Lean check status.

- [x] Add Lean theorem obligations.
- [x] Add strict TypeScript gate.
- [x] Run `npm run test:pskernel:ka25` until it passes.

### Task 3: Release metadata and packaging

**Files:**
- Create: `assurance/ka25/KA25_RELEASE_GATE.json`
- Create: `assurance/ka25/KA25_REPORT.md`
- Create: `assurance/ka25/KA25_VERIFICATION_SUMMARY.json`

- [x] Update package and version metadata to `1.0.0-pskernel.28`.
- [x] Run verification gates.
- [x] Package final ZIP and SHA file.

# PSKernel KA-33 Inductive Env Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first conditional Lean4Lean inductive environment bridge without changing PSKernel trusted semantics.

**Architecture:** Keep KA-12's ordinary `translateDecl?` unchanged. Introduce a KA-33 bridge-only `translateInductDecl?` and prove conditional facts against real Lean4Lean `VDecl.WF`, `VEnv.WF`, `VEnv.Ordered`, and `VEnv.addInduct`.

**Tech Stack:** Lean 4.33.1, Lean4Lean source, TypeScript gate scripts, npm release scripts.

**Spec:** `assurance/ka33/inductive-env-bridge.json`

## Global Constraints

- No trusted PSKernel semantic change.
- No Core format change; remain on Core artifact format 71.
- No kernel codec change.
- Do not claim full Lean 4 equivalence.
- Do not claim inductive semantic soundness.

---

### Task 1: Red test and KA-33 artifacts

**Files:**
- Create: `tools/pskernel-ka33-inductive-env-bridge-tests.ts`
- Create: `tools/pskernel-ka33-inductive-env-bridge.ts`
- Create: `assurance/ka33/inductive-env-bridge.lean`
- Create: `assurance/ka33/inductive-env-bridge.json`
- Create: `assurance/ka33/obligation-delta.json`
- Modify: `package.json`, `package-lock.json`, `versions.json`

**Interfaces:**
- Consumes: KA-32 feature audit and KA-31 bridge modules.
- Produces: `runKA33InductiveEnvBridgeGate({ strict?: boolean; soft?: boolean })`.

- [x] Write the failing test for missing KA-33 tool/artifacts.
- [x] Run the test and confirm it fails for the missing tool.
- [x] Implement the Lean bridge and TypeScript gate.
- [x] Run the focused gate and strict Lean check.

### Task 2: Release evidence

**Files:**
- Create: `assurance/ka33/KA33_RELEASE_GATE.json`
- Create: `assurance/ka33/KA33_REPORT.md`
- Create: `assurance/ka33/KA33_VERIFICATION_SUMMARY.json`

- [x] Run build and focused verification.
- [x] Run fresh extract validation.
- [x] Package ZIP and SHA-256.

# PSKernel KA-27 Quotient No-Overwrite Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a narrow Lean4Lean quotient no-overwrite bridge proving successful `addQuot` freshness and unrelated lookup preservation.

**Architecture:** Keep PSKernel trusted semantics unchanged. Add one Lean proof module under `assurance/ka27`, one strict TypeScript gate, release metadata, and package scripts.

**Tech Stack:** Lean 4.33.1, imported Lean4Lean theory, Node/TypeScript stripped execution.

**Spec:** `assurance/ka27/quot-env-no-overwrite-bridge.json`

## Global Constraints

- Core artifact format remains 71.
- Certificate format remains 2.
- No trusted PSKernel semantic change.
- No kernel codec change.
- No new trusted computation rule.
- Do not claim full Lean 4 equivalence, same theory, fully formal K3, or quotient semantic soundness.

---

### Task 1: Red test

**Files:**
- Create: `tools/pskernel-ka27-quot-env-no-overwrite-bridge-tests.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run test:pskernel:ka27`

- [x] **Step 1:** Add the KA-27 test expecting the new gate and artifacts.
- [x] **Step 2:** Run `npm run test:pskernel:ka27` and confirm it fails because the gate is missing.

### Task 2: Lean bridge and strict gate

**Files:**
- Create: `assurance/ka27/quot-env-no-overwrite-bridge.lean`
- Create: `tools/pskernel-ka27-quot-env-no-overwrite-bridge.ts`
- Create: `assurance/ka27/quot-env-no-overwrite-bridge.json`
- Create: `assurance/ka27/obligation-delta.json`

**Interfaces:**
- Produces: `runKA27QuotEnvNoOverwriteBridgeGate({ strict: true })`

- [x] **Step 1:** Prove quotient freshness and unrelated lookup preservation over real Lean4Lean `VEnv.addQuot`.
- [x] **Step 2:** Compile the bridge through offline Lean4Lean.
- [x] **Step 3:** Ensure strict gate returns blocked reasons on any failed imported check.

### Task 3: Release metadata and packaging

**Files:**
- Create: `assurance/ka27/KA27_RELEASE_GATE.json`
- Create: `assurance/ka27/KA27_REPORT.md`
- Create: `assurance/ka27/KA27_VERIFICATION_SUMMARY.json`
- Modify: `versions.json`, `package.json`, `package-lock.json`

**Interfaces:**
- Produces: final ZIP, SHA, report, release gate, verification summary.

- [x] **Step 1:** Record claim boundaries and verification results.
- [x] **Step 2:** Build final ZIP and SHA file.
- [x] **Step 3:** Run ZIP integrity and SHA verification.

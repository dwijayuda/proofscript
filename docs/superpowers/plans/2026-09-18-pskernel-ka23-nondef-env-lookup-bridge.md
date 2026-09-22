# PSKernel KA-23 Nondef Env Lookup Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a narrow KA-23 assurance checkpoint proving conditional Lean4Lean environment lookup/defeq-membership facts for translated theorem and opaque declarations.

**Architecture:** Reuse KA-12 through KA-22 bridge modules and import real `Lean4Lean.Theory.Typing.Env`. Add one Lean module with three bridge lemmas, one TypeScript strict gate that compiles the module against the offline Lean4Lean source, and release/report metadata that preserves claim boundaries.

**Tech Stack:** Lean 4.33.1, Lean4Lean offline source, Node.js TypeScript strip-types scripts, npm package gates.

**Spec:** `assurance/ka23/nondef-env-lookup-bridge.json`

## Global Constraints

- Core artifact format remains `71`.
- Certificate format remains `2`.
- Public version is `1.0.0-pskernel.26`.
- Baseline is `proofscript-v1-ka22-nondef-env-extension-bridge0`.
- No trusted PSKernel semantic change.
- No kernel codec change.
- No new trusted computation rule.
- Do not claim full Lean 4 equivalence, same theory as full Lean 4, fully formal K3, or executable PSKernel refinement.

---

### Task 1: KA-23 Red Test

**Files:**
- Create: `tools/pskernel-ka23-nondef-env-lookup-bridge-tests.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `versions.json`

**Interfaces:**
- Consumes: expected `runKA23NonDefEnvLookupBridgeGate({ strict: true })`
- Produces: failing test until the KA-23 gate and assurance files exist

- [x] **Step 1: Write the failing test**
- [x] **Step 2: Run `npm run test:pskernel:ka23` and verify failure with `ERR_MODULE_NOT_FOUND`**

### Task 2: Lean Bridge Module

**Files:**
- Create: `assurance/ka23/nondef-env-lookup-bridge.lean`
- Create: `assurance/ka23/nondef-env-lookup-bridge.json`
- Create: `assurance/ka23/obligation-delta.json`

**Interfaces:**
- Consumes: KA-17 lookup helpers and KA-22 nondef extension bridge
- Produces: `PSKernelKA23.translated_theorem_env_lookup`, `PSKernelKA23.translated_theorem_env_defeq_member`, `PSKernelKA23.translated_opaque_env_lookup`

- [x] **Step 1: Implement Lean theorem module**
- [x] **Step 2: Define KA-23 spec and obligation delta**

### Task 3: Strict Gate and Release Evidence

**Files:**
- Create: `tools/pskernel-ka23-nondef-env-lookup-bridge.ts`
- Create: `assurance/ka23/KA23_RELEASE_GATE.json`
- Create: `assurance/ka23/KA23_REPORT.md`
- Create: `assurance/ka23/KA23_VERIFICATION_SUMMARY.json`

**Interfaces:**
- Consumes: offline Lean4Lean source/cache, KA-23 Lean module and JSON spec
- Produces: strict gate result with no claim-boundary expansion

- [x] **Step 1: Implement strict gate**
- [x] **Step 2: Run focused KA-23 test and Lean check**
- [x] **Step 3: Package and verify final ZIP**

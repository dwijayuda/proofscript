# PSKernel KA-30 Ordinary Environment Aggregate Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a direct Lean4Lean ordinary declaration aggregate bridge for axiom, definition, theorem, and opaque declarations.

**Architecture:** KA-30 is a proof/assurance-only checkpoint. It imports the already checked KA-25 ordinary declaration bridge chain and packages existing Lean4Lean facts into aggregate theorems without changing PSKernel runtime, Core format, or codec behavior.

**Tech Stack:** Lean 4.33.1, Lean4Lean offline source, Node/TypeScript assurance gate, npm scripts.

**Spec:** `assurance/ka30/ordinary-env-aggregate-bridge.json`

## Global Constraints

- No trusted PSKernel semantic change.
- No kernel codec change.
- No new trusted computation rule.
- Core artifact format remains 71.
- Do not claim full Lean 4 equivalence, same theory as full Lean 4, fully formal K3, executable refinement, or quotient semantic soundness.

---

### Task 1: KA-30 red/green assurance gate

**Files:**
- Create: `assurance/ka30/ordinary-env-aggregate-bridge.lean`
- Create: `tools/pskernel-ka30-ordinary-env-aggregate-bridge.ts`
- Create: `tools/pskernel-ka30-ordinary-env-aggregate-bridge-tests.ts`
- Modify: `package.json`, `package-lock.json`, `versions.json`

**Interfaces:**
- Produces: `runKA30OrdinaryEnvAggregateBridgeGate(options)` returning strict bridge evidence.

- [x] **Step 1: Write failing test**
- [x] **Step 2: Verify it fails because the KA-30 tool is missing**
- [x] **Step 3: Add Lean aggregate theorem file and Node gate**
- [x] **Step 4: Run focused test and strict Lean check**
- [x] **Step 5: Package only after verification**

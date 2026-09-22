# KA-58 Expression Translator Invariant Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one strict Lean4Lean bridge slice for expression translator source invariants without changing PSKernel semantics.

**Architecture:** KA-58 follows the KA-57 pattern: one Lean bridge module, one focused TypeScript gate, one focused test, and compact report/progress/release artifacts. It references existing Lean4Lean theorems only.

**Tech Stack:** Lean 4.33.1, Lean4Lean, Node TypeScript strip-types, npm workspace packaging.

**Spec:** KA-57 release metadata and Lean4Lean `Lean4Lean.Verify.Typing.Lemmas` source invariants.

## Global Constraints

- Preserve Core artifact format 71.
- Preserve certificate format 2.
- Do not touch trusted PSKernel semantic packages or kernel-codec.
- Do not claim full Lean4 equivalence, fully formal K3, or executable PSKernel refinement proof.
- Use TDD: focused test fails before KA-58 implementation exists, then passes after strict Lean4Lean bridge compiles.

## Review Focus

- Missing KA-58 gate must fail before implementation.
- Strict Lean4Lean bridge must compile under the local Lean4Lean/Batteries workspace.
- Obligation accounting must add exactly 4, from 163 to 167.
- Anti-spaghetti gate must keep KA-58 focused and avoid semantic package edits.
- Release artifacts must preserve boundary claims.

---

### Task 1: KA-58 strict bridge/gate/report slice

**Files:**
- Create: `assurance/ka58/executable-expression-translator-invariant-refinement-bridge.lean`
- Create: `tools/pskernel-ka58-executable-expression-translator-invariant-refinement.ts`
- Create: `tools/pskernel-ka58-executable-expression-translator-invariant-refinement-tests.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `versions.json`
- Modify: `implementation-status.json`

**Interfaces:**
- Consumes: KA-57 checkpoint `proofscript-v1-ka57-executable-expression-translator-source-transform-refinement0` and formal obligations `163`.
- Produces: KA-58 checkpoint `proofscript-v1-ka58-executable-expression-translator-invariant-refinement0` and formal obligations `167`.

- [ ] **Step 1: Write the failing focused test**
- [ ] **Step 2: Run the focused test and verify it fails because the KA-58 tool/bridge is missing**
- [ ] **Step 3: Add the Lean bridge wrappers and gate**
- [ ] **Step 4: Run `npm run test:pskernel:ka58` and verify pass**
- [ ] **Step 5: Run bounded release gates and package clean ZIP**

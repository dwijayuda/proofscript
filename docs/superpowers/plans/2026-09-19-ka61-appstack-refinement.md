# KA-61 AppStack Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the next strict Lean4Lean bridge slice for executable expression translator AppStack/rebuild facts.

**Architecture:** Follow KA-60's focused gate pattern: one Lean bridge module, one TypeScript gate, one focused test, metadata/report updates only. Do not modify trusted PSKernel semantics, codec, Core format, or certificate format.

**Tech Stack:** Lean 4.33.1, Lean4Lean offline workspace, Node TypeScript scripts with experimental strip-types, npm workspace packaging.

**Spec:** Existing KA-60 release gate and Lean4Lean `Lean4Lean.Verify.Typing.Lemmas` AppStack/rebuild theorem surface.

## Global Constraints

- Core artifact format remains exactly `71`.
- Certificate format remains exactly `2`.
- Active kernel remains `PSKernel`.
- Trusted semantic packages must not be touched.
- Count only strict Lean4Lean modules that compile with the offline Lean4Lean workspace.
- Do not claim full Lean4 equivalence, same theory as Lean4, fully formal K3, or executable PSKernel refinement proof.

## Review Focus

- Lean wrappers must be direct theorem wrappers over existing Lean4Lean facts, not admitted or weakened claims.
- Obligation accounting must increment from 175 to 179 exactly.
- Anti-spaghetti guard must find no KA-61 oversized files and at most two KA-61 tool files.
- Fresh extract must run the focused gate and Lean check.
- Arena wrapper timeouts, if any, must be recorded as not counted.

---

### Task 1: KA-61 AppStack strict bridge

**Files:**
- Create: `assurance/ka61/executable-expression-translator-appstack-refinement-bridge.lean`
- Create: `tools/pskernel-ka61-executable-expression-translator-appstack-refinement.ts`
- Create: `tools/pskernel-ka61-executable-expression-translator-appstack-refinement-tests.ts`
- Modify: `package.json`, `package-lock.json`, `versions.json`, `implementation-status.json`
- Create reports under `assurance/ka61/`

**Interfaces:**
- Consumes: KA-60 checkpoint metadata and Lean4Lean `Typing.Lemmas` AppStack/rebuild theorems.
- Produces: KA-61 checkpoint `proofscript-v1-ka61-executable-expression-translator-appstack-refinement0` with 4 new strict obligations.

- [ ] **Step 1: Write failing focused test**
- [ ] **Step 2: Run it and observe failure because KA-61 tool is absent**
- [ ] **Step 3: Add minimal Lean bridge and TypeScript gate**
- [ ] **Step 4: Run focused gate, strict Lean check, and release verification commands**
- [ ] **Step 5: Package clean ZIP and SHA artifacts**

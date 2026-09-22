# KA-57 Expression Translator Source-Transform Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the next strict Lean4Lean bridge checkpoint for source expression transform preservation used by executable expression translation.

**Architecture:** Create one focused Lean bridge under `assurance/ka57`, one focused TypeScript gate under `tools`, and one focused TDD test. The checkpoint must not touch trusted PSKernel semantic packages, kernel codec, Core format, or certificate format.

**Tech Stack:** Lean 4.33.1, Lean4Lean, TypeScript executed through Node `--experimental-strip-types`, npm workspace verification.

**Spec:** Previous checkpoint `proofscript-v1-ka56-executable-expression-translator-source-condition-refinement0` and KA-56 release boundary.

## Global Constraints

- Preserve Core artifact format `71`.
- Preserve certificate format `2`.
- Preserve active kernel `PSKernel`.
- Do not edit `packages/kernel/src/PSKernel/`, `packages/kernel-codec/src/`, `packages/frontend-next/src/core/`, or `packages/unified-bridge/src/`.
- Do not claim full Lean4 equivalence, same-theory equivalence, fully formal K3, executable PSKernel refinement proof, or full executable expression translator refinement.
- Use red-green TDD for the focused gate.

## Review Focus

- Missing KA-57 tool/Lean bridge should make the focused test fail before implementation.
- Lean theorem wrappers must compile through local Lean4Lean using offline Batteries.
- Release reports must count exactly four new formal obligations.
- Anti-spaghetti gate must reject oversized KA-57 files or trusted semantic package edits.
- Final ZIP must contain no `node_modules`, `dist`, `*.tsbuildinfo`, nested ZIPs, or package tarballs.

---

### Task 1: KA-57 strict source-transform bridge

**Files:**
- Create: `assurance/ka57/executable-expression-translator-source-transform-refinement-bridge.lean`
- Create: `tools/pskernel-ka57-executable-expression-translator-source-transform-refinement.ts`
- Create: `tools/pskernel-ka57-executable-expression-translator-source-transform-refinement-tests.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: KA-56 checkpoint metadata and local Lean4Lean offline workspace.
- Produces: `npm run test:pskernel:ka57`, `npm run assurance:ka57`, and `npm run lean:ka57:check`.

- [ ] **Step 1: Write the failing test**

Create a focused test asserting the KA-57 tool and Lean bridge exist, strict gate passes, checkpoint name is `proofscript-v1-ka57-executable-expression-translator-source-transform-refinement0`, total obligations are `163`, and new obligations are `4`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tools/pskernel-ka57-executable-expression-translator-source-transform-refinement-tests.ts`

Expected: FAIL because the KA-57 gate tool and Lean bridge are absent.

- [ ] **Step 3: Write minimal implementation**

Add Lean wrappers for:
- `translated_fvars_abstract1_wf`
- `translated_fvars_instantiate1_wf`
- `translated_fvars_instantiateList_wf`
- `translated_closed_abstract1_wf`

Add a TypeScript gate mirroring KA-56 style, with checkpoint metadata, strict Lean check, anti-spaghetti check, release/report/progress/spec writers, and exact claim boundaries.

- [ ] **Step 4: Run focused test and strict gate**

Run:
- `npm run test:pskernel:ka57`
- `npm run assurance:ka57`
- `npm run lean:ka57:check`

Expected: all pass.

- [ ] **Step 5: Run bounded release verification and package**

Run build, smoke/conformance, Arena gates, npm pack SHA, fresh extract smoke, final ZIP test, and SHA check.

Expected: all explicit pass statuses recorded; any timed-out wrapper is not counted as passed.

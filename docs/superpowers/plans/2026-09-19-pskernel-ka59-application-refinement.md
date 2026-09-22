# KA-59 Executable Expression Translator Application Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a narrow strict Lean4Lean bridge checkpoint for expression application-list/free-variable preservation facts used by executable expression translation.

**Architecture:** Add one Lean bridge module under `assurance/ka59`, one focused TypeScript gate under `tools`, one focused TDD test, and release/progress/spec outputs. Do not modify trusted PSKernel semantics, kernel codec, Core format, or certificate format.

**Tech Stack:** Lean 4.33.1, Lean4Lean local workspace, Node/TypeScript strip-types scripts, npm workspace packaging.

**Spec:** `assurance/ka58/executable-expression-translator-invariant-refinement-bridge-spec.json` as immediate predecessor plus Lean4Lean `Verify/Typing/Lemmas.lean` source facts.

## Global Constraints

- Preserve Core artifact format `71`.
- Preserve certificate format `2`.
- Preserve active kernel `PSKernel`.
- Do not edit `packages/kernel/src/PSKernel`, `packages/kernel-codec/src`, `packages/frontend-next/src/core`, or `packages/unified-bridge/src`.
- Count only strict Lean4Lean-compiled wrapper theorems as new formal obligations.
- Do not claim full Lean4 equivalence, same theory as full Lean4, fully formal K3, or executable PSKernel refinement proof.

## Review Focus

- Application list preservation facts must compile against Lean4Lean, not merely be named in JSON.
- Obligation count must increase exactly from 167 to 171.
- Package and implementation metadata must name KA-59/version `1.0.0-pskernel.62`.
- Fresh-extract smoke must not rely on generated `node_modules`, `dist`, `*.tgz`, `*.tsbuildinfo`, or nested release ZIP residue.
- Any Arena wrapper timeout must be recorded as not counted.

---

### Task 1: KA-59 strict bridge/gate/release artifacts

**Files:**
- Create: `assurance/ka59/executable-expression-translator-application-refinement-bridge.lean`
- Create: `tools/pskernel-ka59-executable-expression-translator-application-refinement.ts`
- Create: `tools/pskernel-ka59-executable-expression-translator-application-refinement-tests.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `versions.json`
- Modify: `implementation-status.json`

**Interfaces:**
- Consumes: KA-58 package/release metadata, Lean4Lean local `Lean4Lean.Verify.Typing.Lemmas` facts.
- Produces: npm scripts `test:pskernel:ka59`, `assurance:ka59`, `lean:ka59:check`, and checkpoint reports/spec/progress artifacts.

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails because the KA-59 gate is absent**
- [ ] **Step 3: Add the Lean bridge and gate implementation**
- [ ] **Step 4: Run focused KA-59 test and strict Lean check**
- [ ] **Step 5: Run bounded release verification and package artifacts**

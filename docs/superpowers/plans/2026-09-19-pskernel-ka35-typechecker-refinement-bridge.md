# KA-35 TypeChecker Refinement Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a narrow direct Lean4Lean TypeChecker bridge for core executable checker proof surfaces without changing trusted PSKernel semantics.

**Architecture:** KA-35 imports `Lean4Lean.Verify.TypeChecker` and wraps existing Lean4Lean `WF` theorems for `whnf`, `whnfCore`, `inferType`, `checkType`, and `isDefEq`. The TypeScript gate builds the real Lean4Lean verification module, checks the KA-35 Lean file, emits release metadata, and preserves all no-equivalence claim boundaries.

**Tech Stack:** Lean 4.33.1, Lean4Lean, Node/TypeScript gate scripts, npm offline verification.

**Spec:** `assurance/ka35/typechecker-refinement-bridge.json`

## Global Constraints

- Public version: `1.0.0-pskernel.38`.
- Checkpoint: `proofscript-v1-ka35-typechecker-refinement-bridge0`.
- Baseline: `proofscript-v1-ka34-mutual-def-env-bridge0`.
- Core artifact format remains `71`.
- Certificate format remains `2`.
- No trusted PSKernel semantic change.
- No kernel codec change.
- No new trusted computation rule.
- Do not claim full Lean 4 equivalence, same theory, fully formal K3, executable PSKernel refinement proof, or typechecker semantic completeness.

---

### Task 1: Red test and bridge files

**Files:**
- Create: `tools/pskernel-ka35-typechecker-refinement-bridge-tests.ts`
- Create: `assurance/ka35/typechecker-refinement-bridge.lean`
- Create: `assurance/ka35/typechecker-refinement-bridge.json`
- Create: `assurance/ka35/obligation-delta.json`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `versions.json`

**Interfaces:**
- Produces: `runKA35TypeCheckerRefinementBridgeGate({ strict?: boolean, soft?: boolean })`.
- Produces scripts: `test:pskernel:ka35`, `assurance:ka35`, `lean:ka35:check`, `lean:ka35:check:soft`.

- [x] Write failing test before implementation.
- [x] Verify failure is missing KA-35 bridge tool.
- [x] Implement Lean wrapper lemmas over real Lean4Lean TypeChecker WF theorems.
- [x] Implement TypeScript gate and release metadata.
- [x] Run focused strict test and Lean check.

### Task 2: Release verification

**Files:**
- Generated: `assurance/ka35/KA35_RELEASE_GATE.json`
- Generated: `assurance/ka35/KA35_REPORT.md`
- Generated: `assurance/ka35/KA35_VERIFICATION_SUMMARY.json`

- [x] Run `npm run build -- --pretty false`.
- [x] Run `npm run test:pskernel:ka35`.
- [x] Run `npm run assurance:ka35`.
- [x] Run `npm run lean:ka35:check`.
- [x] Run kernel smoke and PSC checks.
- [x] Run Arena component gates as time permits.
- [x] Package ZIP and SHA.

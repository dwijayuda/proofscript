# KA-45 Inductive Recursor Refinement Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the narrowest Lean4Lean-backed inductive recursor refinement bridge without modifying PSKernel trusted semantics or creating spaghetti code.

**Architecture:** KA-45 is assurance-only. It adds one Lean bridge module, one focused gate tool, one focused test file, and JSON/Markdown assurance artifacts. It must not edit semantic packages under `packages/kernel/src/PSKernel`, `packages/kernel-codec/src`, `packages/frontend-next/src/core`, or `packages/unified-bridge/src`.

**Tech Stack:** Lean 4.33.1, Lean4Lean offline source, Node TypeScript strip-types runner, existing PSKernel assurance layout.

**Spec:** `assurance/ka45/inductive-recursor-refinement-bridge.json`

## Global Constraints

- Active kernel remains PSKernel.
- Core artifact format remains 71.
- Certificate format remains 2.
- No trusted kernel semantic change.
- No kernel codec change.
- No new trusted computation rule.
- No full Lean4 equivalence claim.
- KA-45 new source files must remain small and focused.

### Task 1: Red test

- [x] Add `tools/pskernel-ka45-inductive-recursor-refinement-bridge-tests.ts` expecting missing KA-45 bridge artifacts and gate.
- [x] Run `npm run test:pskernel:ka45` and verify failure before implementation.

### Task 2: Lean bridge

- [x] Add `assurance/ka45/inductive-recursor-refinement-bridge.lean` importing `Lean4Lean.Verify.TypeChecker.WHNF` and `Lean4Lean.Inductive.Reduce`.
- [x] Prove wrapper obligations for `reduceRecursor.WF`, `whnfCore'.WF`, `whnf'.WF`, and the imported `inductiveReduceRec` surface.

### Task 3: Gate and no-spaghetti check

- [x] Add one focused KA-45 gate tool.
- [x] Add architecture checks for new KA-45 file size and forbidden semantic-package edits.
- [x] Generate release gate, report, progress report, and verification summary.

### Task 4: Verify and package

- [x] Run build, KA-45 gates, smoke checks, Arena direct gates, fresh extraction, ZIP integrity, and SHA validation.

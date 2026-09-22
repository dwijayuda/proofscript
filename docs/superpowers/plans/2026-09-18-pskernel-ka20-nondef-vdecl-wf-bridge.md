# KA-20 Non-definition VDecl.WF Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a direct imported Lean4Lean `VDecl.WF` bridge for translated theorem, example, and opaque declarations.

**Architecture:** Preserve PSKernel semantics and Core format 71. Add a conditional Lean theorem file plus a TypeScript assurance gate that materializes offline Lean4Lean, compiles dependency modules, and checks the KA-20 file.

**Tech Stack:** TypeScript Node scripts, Lean 4.33.1, offline Lean4Lean + Batteries dependency, existing KA-19 gate.

**Spec:** `assurance/ka20/nondef-vdecl-wf-bridge.json`

## Global Constraints

- No trusted PSKernel semantic change.
- No kernel codec change.
- No new trusted computation rule.
- Core artifact format remains `71`.
- Do not claim full Lean 4 equivalence.
- Count only machine-checked Lean theorem obligations.

---

### Task 1: Add KA-20 theorem file and gate

**Files:**
- Create: `assurance/ka20/nondef-vdecl-wf-bridge.lean`
- Create: `tools/pskernel-ka20-nondef-vdecl-wf-bridge.ts`
- Create: `tools/pskernel-ka20-nondef-vdecl-wf-bridge-tests.ts`
- Modify: `package.json`
- Modify: `versions.json`

**Interfaces:**
- Consumes: `runKA19EnvDefEqPreservationBridgeGate({ strict: true })`
- Produces: `runKA20NonDefVDeclWFBridgeGate({ strict: true })`

- [x] **Step 1: Write failing test**

Run: `node /tmp/ka20-red-test.mjs <repo-root>`
Expected: FAIL with missing KA-20 files.

- [x] **Step 2: Implement minimal bridge**

Create three Lean lemmas for theorem/example/opaque over real `Lean4Lean.VDecl.WF`.

- [ ] **Step 3: Run focused gate**

Run: `npm run test:pskernel:ka20`
Expected: PASS.

- [ ] **Step 4: Run release verification**

Run the KA/Lean/kernel/Arena/fresh-extract gates and record exact results.

# PSKernel KA-36 Expression Tag Coverage Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a direct Lean4Lean `TrExprS` constructor-surface bridge for expression tag coverage.

**Architecture:** Add a Lean module that imports `Lean4Lean.Verify.Typing.Expr` and proves one conditional wrapper lemma per `TrExprS` constructor. Add a strict TypeScript gate that builds/checks the Lean module and records a release boundary that does not claim raw metavariable or executable translator equivalence.

**Tech Stack:** Lean 4.33.1, Lean4Lean, Node TypeScript stripped mode, existing PSKernel KA gate pattern.

**Spec:** `assurance/ka36/expression-tag-coverage-bridge.json`

## Global Constraints

- Public version: `1.0.0-pskernel.39`.
- Checkpoint: `proofscript-v1-ka36-expression-tag-coverage-bridge0`.
- Baseline: `proofscript-v1-ka35-typechecker-refinement-bridge0`.
- Core artifact format remains `71`.
- Certificate format remains `2`.
- No trusted PSKernel semantic change.
- No kernel codec change.
- No new trusted computation rule.
- No full Lean4 equivalence claim.

---

### Task 1: Expression Tag Bridge

**Files:**
- Create: `assurance/ka36/expression-tag-coverage-bridge.lean`
- Create: `assurance/ka36/expression-tag-coverage-bridge.json`
- Create: `assurance/ka36/obligation-delta.json`
- Create: `tools/pskernel-ka36-expression-tag-coverage-bridge.ts`
- Create: `tools/pskernel-ka36-expression-tag-coverage-bridge-tests.ts`

**Interfaces:**
- Produces: `runKA36ExpressionTagCoverageBridgeGate(options)` returning checkpoint, version, covered tags, formal lemmas, and claim boundary.

- [x] **Step 1: Write failing test**

Run: `npm run test:pskernel:ka36`
Expected: FAIL before implementation because script/tool/artifacts are missing.

- [x] **Step 2: Implement minimal Lean bridge**

Create wrapper lemmas for `bvar`, `fvar`, `sort`, `const`, `app`, `lam`, `forallE`, `letE`, `lit`, `mdata`, and `proj`.

- [x] **Step 3: Implement strict gate**

Run Lean4Lean build/check for `Lean4Lean.Verify.Typing.Expr` and the copied KA36 module.

- [x] **Step 4: Verify**

Run focused and release gates.

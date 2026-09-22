# KA-60 Executable Expression Translator Beta Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a narrow strict Lean4Lean bridge for beta-reduction and cheapBetaReduce facts used by executable expression translation.

**Architecture:** Reuse the existing KA gate pattern. Add one Lean bridge module under `assurance/ka60`, one focused TypeScript gate, one focused red/green test, and update release metadata only. Do not touch trusted PSKernel semantics, kernel codec, Core format, or certificate format.

**Tech Stack:** Lean 4.33.1, Lean4Lean, TypeScript scripts run by Node strip-types, npm workspace packaging.

**Spec:** `assurance/ka59/executable-expression-translator-application-refinement-bridge-spec.json` plus inherited KA boundary.

## Global Constraints

- Core artifact format remains `71`.
- Certificate format remains `2`.
- Active kernel remains `PSKernel`.
- No edits under `packages/kernel/src/PSKernel/`.
- No edits under `packages/kernel-codec/src/`.
- No edits under `packages/frontend-next/src/core/`.
- No edits under `packages/unified-bridge/src/`.
- Do not claim full Lean4 equivalence, fully formal K3, or executable PSKernel refinement proof.
- Use TDD: focused test must fail before the KA-60 gate exists.

## Review Focus

- Lean wrapper signatures must match imported Lean4Lean lemmas exactly.
- Obligation count must increase from 171 to 175 only if strict Lean4Lean check passes.
- Release gate must record no trusted semantic package touch.
- Aggregated wrapper timeouts must not be counted as passed.
- Final ZIP must not contain `node_modules`, `dist`, `*.tsbuildinfo`, nested `*.tgz`, or nested `*.zip`.

---

### Task 1: KA-60 strict beta refinement bridge

**Files:**
- Create: `assurance/ka60/executable-expression-translator-beta-refinement-bridge.lean`
- Create: `tools/pskernel-ka60-executable-expression-translator-beta-refinement.ts`
- Create: `tools/pskernel-ka60-executable-expression-translator-beta-refinement-tests.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `versions.json`
- Modify: `implementation-status.json`

**Interfaces:**
- Consumes: KA-59 checkpoint metadata and Lean4Lean `Lean4Lean.Verify.Typing.Lemmas`.
- Produces: KA-60 report, release gate, verification summary, bridge spec, progress JSON/report, and scripts `test:pskernel:ka60`, `assurance:ka60`, `lean:ka60:check`.

- [ ] **Step 1: Write the failing test**

Create a focused TypeScript test that requires the KA-60 gate tool and Lean bridge to exist and pass with 175 total obligations / 4 new obligations.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tools/pskernel-ka60-executable-expression-translator-beta-refinement-tests.ts`

Expected: FAIL because the KA-60 gate tool is missing.

- [ ] **Step 3: Write minimal implementation**

Create the Lean bridge wrappers for:

- `FVarsBelow.betaReduce`
- `BetaReduce.cheapBetaReduce`
- `FVarsBelow.cheapBetaReduce`
- `TrExpr.cheapBetaReduce`

Create the KA-60 gate using the KA-59 pattern, update package/version/status metadata, and emit release/report/progress files.

- [ ] **Step 4: Run focused verification**

Run:

- `npm install --offline --no-audit --no-fund`
- `npm run build -- --pretty false`
- `npm run test:pskernel:ka60`
- `npm run assurance:ka60`
- `npm run lean:ka60:check`

Expected: all pass.

- [ ] **Step 5: Run release verification and package**

Run the bounded smoke/conformance/Arena/package/fresh-extract/ZIP SHA gates and record exact pass/timeout status.

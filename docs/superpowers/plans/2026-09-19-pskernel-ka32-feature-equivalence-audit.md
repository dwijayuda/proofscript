# PSKernel KA-32 Feature-Equivalence Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compare actual PSKernel source/features against uploaded Lean4Lean source and create a release-gated feature-equivalence matrix that prevents overclaiming full Lean4 equivalence.

**Architecture:** KA-32 is an audit/checkpoint layer, not a trusted kernel semantic change. A TypeScript gate scans local PSKernel source and Lean4Lean source, writes JSON/Markdown parity artifacts, and asserts the claim boundary remains false for full Lean equivalence until required gaps are closed.

**Tech Stack:** TypeScript tool scripts, Node strip-types runner, JSON release gates, Markdown reports.

**Spec:** User request: “deeply research and analyze, PSKernel features and Lean4 kernel features, makes PS Kernel Features equivalent to Lean4 kernel features.”

## Global Constraints

- Do not claim full Lean4 equivalence unless formally proven.
- Keep Core artifact format 71.
- Keep certificate format 2.
- Do not change trusted PSKernel semantics.
- Do not change kernel codec behavior.
- Use actual uploaded Lean4Lean source when available.

---

### Task 1: Feature-equivalence audit gate

**Files:**
- Create: `tools/pskernel-ka32-feature-equivalence-audit.ts`
- Create: `tools/pskernel-ka32-feature-equivalence-audit-tests.ts`
- Create/update: `assurance/ka32/*`
- Modify: `package.json`, `package-lock.json`, `versions.json`

**Interfaces:**
- Produces: `runKA32FeatureEquivalenceAuditGate({ strict?: boolean; soft?: boolean })`
- Consumes: KA-31 release gate and uploaded/cached Lean4Lean source.

- [x] **Step 1: Write failing test**

Run: `node --experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tools/pskernel-ka32-feature-equivalence-audit-tests.ts`

Expected: FAIL with missing `pskernel-ka32-feature-equivalence-audit.ts`.

- [x] **Step 2: Implement minimal audit gate**

The gate scans source files, emits feature matrix artifacts, and prevents equivalence overclaims.

- [ ] **Step 3: Run verification**

Run: `npm run test:pskernel:ka32 && npm run assurance:ka32 && npm run build -- --pretty false`.

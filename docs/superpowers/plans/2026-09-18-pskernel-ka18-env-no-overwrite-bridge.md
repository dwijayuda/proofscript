# KA-18 Env No-Overwrite Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a narrow KA-18 assurance checkpoint proving direct Lean4Lean `VEnv.addConst` freshness and no-overwrite lookup preservation facts for translated PSKernel axioms and definitions.

**Architecture:** Keep PSKernel trusted semantics unchanged. Add one Lean assurance module, one JSON spec, one obligation delta, one TypeScript gate, and one test. The gate compiles the KA-12/13/15/16/17 dependency modules and then checks KA-18 through the offline Lean4Lean+Batteries setup inherited from KA-11.

**Tech Stack:** TypeScript/Node scripts, Lean 4.33.x offline toolchain, Lean4Lean source, Batteries v4.33.0-rc2 offline dependency.

**Spec:** `assurance/ka18/env-no-overwrite-bridge.json`

## Global Constraints

- Trusted PSKernel semantic change: `false`.
- Kernel codec change: `false`.
- New trusted computation rule: `false`.
- Core artifact format remains `71`.
- Do not claim full Lean 4 equivalence.
- Formal obligation count may increase only for Lean theorems that strictly compile.

---

### Task 1: Red test for missing KA-18 gate

**Files:**
- Create: `tools/pskernel-ka18-env-no-overwrite-bridge-tests.ts`

**Interfaces:**
- Consumes: `runKA18EnvNoOverwriteBridgeGate({ strict: true })`
- Produces: failing test until the KA-18 gate and assurance artifacts exist.

- [x] **Step 1: Write failing test**
- [x] **Step 2: Run test to verify it fails**

Run:

```bash
node --experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tools/pskernel-ka18-env-no-overwrite-bridge-tests.ts
```

Expected: `ERR_MODULE_NOT_FOUND` for `tools/pskernel-ka18-env-no-overwrite-bridge.ts`.

### Task 2: Add KA-18 Lean bridge

**Files:**
- Create: `assurance/ka18/env-no-overwrite-bridge.lean`
- Create: `assurance/ka18/env-no-overwrite-bridge.json`
- Create: `assurance/ka18/obligation-delta.json`
- Create: `assurance/ka18/KA18_REPORT.md`

**Interfaces:**
- Produces Lean theorem obligations:
  - `PSKernelKA18.translated_axiom_fresh_before_add`
  - `PSKernelKA18.translated_definition_fresh_before_add`
  - `PSKernelKA18.translated_axiom_preserves_other_lookup`
  - `PSKernelKA18.translated_definition_preserves_other_lookup`

- [x] **Step 1: Implement helper lemmas over real `VEnv.addConst`**
- [x] **Step 2: Lift helper lemmas to translated PSKernel axiom/definition cases**

### Task 3: Add KA-18 gate and scripts

**Files:**
- Create: `tools/pskernel-ka18-env-no-overwrite-bridge.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `versions.json`

**Interfaces:**
- Produces: `runKA18EnvNoOverwriteBridgeGate(options)`
- Scripts:
  - `test:pskernel:ka18`
  - `assurance:ka18`
  - `lean:ka18:check`
  - `lean:ka18:check:soft`

- [x] **Step 1: Implement gate by extending KA-17's module-copy/compile sequence**
- [x] **Step 2: Update package and versions metadata**

### Task 4: Verify and package

**Files:**
- Create: `assurance/ka18/KA18_RELEASE_GATE.json`
- Create: `/mnt/data/KA18_ENV_NO_OVERWRITE_BRIDGE_REPORT.md`
- Create: `/mnt/data/KA18_ENV_NO_OVERWRITE_BRIDGE_RELEASE_GATE.json`
- Create: `/mnt/data/KA18_ENV_NO_OVERWRITE_BRIDGE_VERIFICATION_SUMMARY.json`
- Create: `/mnt/data/proofscript-v1-ka18-env-no-overwrite-bridge0.zip`

- [ ] **Step 1: Run focused KA-18 test and strict Lean check**
- [ ] **Step 2: Run broader regression gates**
- [ ] **Step 3: Fresh extract smoke test**
- [ ] **Step 4: Zip and integrity-check final artifact**

# KA-19 Env DefEq Preservation Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a narrow KA-19 assurance checkpoint proving conditional preservation of Lean4Lean `VEnv.defeqs` across translated axiom/definition additions.

**Architecture:** This checkpoint only adds Lean assurance files, gate tooling, package scripts, reports, and release metadata. It imports the previous KA-18 bridge and real Lean4Lean environment theory. It does not change PSKernel trusted semantics, the codec, or Core format 71.

**Tech Stack:** TypeScript gate tools under Node 22 with `--experimental-strip-types`, Lean 4.33.1, offline Lean4Lean + local Batteries.

**Spec:** `assurance/ka19/env-defeq-preservation-bridge.json`

## Global Constraints

- Keep Core artifact format exactly `71`.
- Keep certificate format exactly `2`.
- Do not change trusted PSKernel computation rules.
- Do not claim full Lean 4 equivalence, same theory as full Lean 4, fully formal K3, or executable PSKernel refinement.
- Count only Lean theorem obligations that compile under the strict KA-19 gate.

---

### Task 1: Red test for KA-19 gate

**Files:**
- Create: `tools/pskernel-ka19-env-defeq-preservation-bridge-tests.ts`

**Interfaces:**
- Consumes: `runKA19EnvDefEqPreservationBridgeGate({ strict: true })`
- Produces: failing test until KA-19 gate and files exist

- [x] **Step 1:** Write the test expecting KA-19 files, checkpoint metadata, relations, and 16 obligations.
- [x] **Step 2:** Run `node --experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tools/pskernel-ka19-env-defeq-preservation-bridge-tests.ts`.
- [x] **Step 3:** Confirm it fails because the KA-19 tool/file does not exist.

### Task 2: Lean bridge and metadata

**Files:**
- Create: `assurance/ka19/env-defeq-preservation-bridge.lean`
- Create: `assurance/ka19/env-defeq-preservation-bridge.json`
- Create: `assurance/ka19/obligation-delta.json`
- Create: `assurance/ka19/KA19_RELEASE_GATE.json`
- Create: `assurance/ka19/KA19_REPORT.md`

**Interfaces:**
- Consumes: `PSKernelKA18EnvNoOverwriteBridge`
- Produces: three Lean theorem obligations in namespace `PSKernelKA19`

- [x] **Step 1:** Prove `translated_axiom_preserves_existing_defeq`.
- [x] **Step 2:** Prove `translated_definition_preserves_existing_defeq`.
- [x] **Step 3:** Prove `translated_definition_preserves_existing_and_adds_new_defeq`.

### Task 3: Strict gate and scripts

**Files:**
- Create: `tools/pskernel-ka19-env-defeq-preservation-bridge.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `versions.json`

**Interfaces:**
- Consumes: KA-18 gate and materialized Lean4Lean/Lake path
- Produces: `test:pskernel:ka19`, `assurance:ka19`, `lean:ka19:check`

- [x] **Step 1:** Copy KA-18 compile-chain pattern and add KA-19 module compilation.
- [x] **Step 2:** Add package scripts.
- [x] **Step 3:** Update version metadata to `1.0.0-pskernel.22`.
- [x] **Step 4:** Run the focused test until green.

### Task 4: Release verification and packaging

**Files:**
- Create: `/mnt/data/proofscript-v1-ka19-env-defeq-preservation-bridge0.zip`
- Create: `/mnt/data/proofscript-v1-ka19-env-defeq-preservation-bridge0.zip.sha256`
- Create: `/mnt/data/KA19_ENV_DEFEQ_PRESERVATION_BRIDGE_REPORT.md`
- Create: `/mnt/data/KA19_ENV_DEFEQ_PRESERVATION_BRIDGE_RELEASE_GATE.json`
- Create: `/mnt/data/KA19_ENV_DEFEQ_PRESERVATION_BRIDGE_VERIFICATION_SUMMARY.json`

**Interfaces:**
- Consumes: repository verification commands
- Produces: frozen KA-19 release artifact if gates pass

- [ ] **Step 1:** Run install/build/focused KA gates.
- [ ] **Step 2:** Run Lean gates and selected standalone/Arena gates.
- [ ] **Step 3:** Perform fresh extract smoke test.
- [ ] **Step 4:** Package and run `unzip -t`.

# PSKernel KA-16 Env Extension Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a narrow KA-16 assurance checkpoint proving conditional environment-extension lemmas for translated axiom/definition declarations against imported Lean4Lean `VEnv.LE`.

**Architecture:** Reuse KA-15's real Lean4Lean materialization and compile chain. Add one Lean file importing `PSKernelKA15EnvWFBridge`, one gate tool, one test, and release metadata. Do not touch PSKernel trusted runtime semantics or Core serialization.

**Tech Stack:** TypeScript gate scripts executed with Node `--experimental-strip-types`; Lean 4.33.1; offline Lean4Lean and Batteries materialized by KA-11.

**Spec:** `assurance/ka16/env-extension-bridge.json`

## Global Constraints

- Core artifact format remains `71`.
- Certificate format remains `2`.
- Trusted PSKernel semantic change: `false`.
- Kernel codec change: `false`.
- Full Lean 4 equivalence: `false`.
- Same theory as full Lean 4: `false`.
- Formal Lean4Lean obligations increase only for machine-checked Lean theorem obligations.

---

### Task 1: Add Lean4Lean `VEnv.LE` bridge

**Files:**
- Create: `assurance/ka16/env-extension-bridge.lean`
- Create: `assurance/ka16/env-extension-bridge.json`
- Create: `assurance/ka16/obligation-delta.json`
- Create: `assurance/ka16/KA16_REPORT.md`
- Create: `assurance/ka16/KA16_RELEASE_GATE.json`

**Interfaces:**
- Consumes: `PSKernelKA15EnvWFBridge`, `Lean4Lean.VEnv.LE`
- Produces: `PSKernelKA16.translated_axiom_env_extends`, `PSKernelKA16.translated_definition_env_extends`

- [x] Write the Lean bridge lemmas for `addConst` and `addDefEq` extension.
- [x] Write the conditional translated axiom/definition extension lemmas.
- [x] Preserve the inherited inductive-blocking theorem.
- [x] Record claim boundaries in JSON and report artifacts.

### Task 2: Add executable gate and test

**Files:**
- Create: `tools/pskernel-ka16-env-extension-bridge.ts`
- Create: `tools/pskernel-ka16-env-extension-bridge-tests.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `versions.json`

**Interfaces:**
- Consumes: `runKA15EnvWFBridgeGate({ strict: true })`
- Produces: `runKA16EnvExtensionBridgeGate({ strict?: boolean, soft?: boolean })`

- [x] Write failing KA-16 test first and verify it fails because the KA-16 tool/artifacts are absent.
- [x] Implement the gate by copying KA-12/KA-13/KA-15/KA-16 Lean files into the offline Lean4Lean source tree.
- [x] Build `Lean4Lean.Theory.Typing.Env` and strict-check the KA-16 Lean module.
- [x] Update scripts: `test:pskernel:ka16`, `assurance:ka16`, `lean:ka16:check`, `lean:ka16:check:soft`.

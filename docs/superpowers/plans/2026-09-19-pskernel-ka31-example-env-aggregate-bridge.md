# PSKernel KA-31 Example Environment Aggregate Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a narrow KA-31 theorem that packages existing example declaration bridge facts into one checked Lean4Lean aggregate obligation.

**Architecture:** Reuse KA-20 through KA-22 Lean modules for examples. Do not change PSKernel trusted semantics, Core format, certificate format, or codec behavior.

**Tech Stack:** Lean 4.33.1, Lean4Lean offline source, TypeScript gate scripts, npm scripts.

**Spec:** `assurance/ka31/example-env-aggregate-bridge.json`

## Global Constraints

- Active kernel: PSKernel
- Core artifact format: 71
- Certificate format: 2
- Public version: `1.0.0-pskernel.34`
- Baseline: `proofscript-v1-ka30-ordinary-env-aggregate-bridge0`
- Full Lean 4 equivalence: no
- Same theory as full Lean 4: no
- Fully formal K3: no

---

### Task 1: KA-31 Example Aggregate Lean Bridge

**Files:**
- Create: `assurance/ka31/example-env-aggregate-bridge.lean`
- Create: `tools/pskernel-ka31-example-env-aggregate-bridge.ts`
- Create: `tools/pskernel-ka31-example-env-aggregate-bridge-tests.ts`
- Modify: `package.json`, `package-lock.json`, `versions.json`

**Interfaces:**
- Consumes: `PSKernelKA20.translated_example_vdecl_wf`, `PSKernelKA21.translated_example_env_wf`, `PSKernelKA22.translated_example_env_extends`
- Produces: `PSKernelKA31.translated_example_env_aggregate_bridge`

- [x] Write failing test importing `runKA31ExampleEnvAggregateBridgeGate`.
- [x] Verify red failure for missing KA-31 gate tool.
- [x] Implement Lean bridge and TS gate.
- [x] Verify `npm run test:pskernel:ka31` and `npm run lean:ka31:check` pass.

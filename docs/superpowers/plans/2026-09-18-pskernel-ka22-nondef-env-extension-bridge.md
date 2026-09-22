# PSKernel KA-22 Non-definition VEnv.LE Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the smallest direct Lean4Lean environment-extension bridge for translated theorem, example, and opaque declarations.

**Architecture:** Keep PSKernel trusted semantics and Core format unchanged. Add assurance-only Lean lemmas importing real `Lean4Lean.Theory.Typing.Env` and build them with the offline KA-11 Lean4Lean/Batteries setup. Gate the result with a TypeScript tool and release metadata.

**Tech Stack:** Lean 4.33.1, Lean4Lean offline source, Node.js TypeScript strip-types scripts, npm offline install/build.

**Spec:** `assurance/ka22/nondef-env-extension-bridge.json`

## Global Constraints

- Trusted PSKernel semantic change: no.
- Kernel codec change: no.
- New trusted computation rule: no.
- Core artifact format remains 71.
- Full Lean 4 equivalence remains false.
- Same theory as full Lean 4 remains false.
- Fully formal K3 remains false.

---

### Task 1: KA-22 Lean bridge and gate

**Files:**
- Create: `assurance/ka22/nondef-env-extension-bridge.lean`
- Create: `assurance/ka22/nondef-env-extension-bridge.json`
- Create: `assurance/ka22/obligation-delta.json`
- Create: `tools/pskernel-ka22-nondef-env-extension-bridge.ts`
- Create: `tools/pskernel-ka22-nondef-env-extension-bridge-tests.ts`
- Modify: `package.json`
- Modify: `versions.json`

**Interfaces:**
- Consumes: KA-21 `PSKernelKA21NonDefEnvWFBridge.lean`
- Produces: `runKA22NonDefEnvExtensionBridgeGate(options)` and Lean module `PSKernelKA22NonDefEnvExtensionBridge`

- [ ] **Step 1: Write failing test**

Run: `node --experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tools/pskernel-ka22-nondef-env-extension-bridge-tests.ts`

Expected: FAIL because `tools/pskernel-ka22-nondef-env-extension-bridge.ts` does not exist.

- [ ] **Step 2: Implement bridge and gate**

Create the Lean and TypeScript files listed above. Prove:

```lean
theorem translated_theorem_env_extends ... : env ≤ env'.addDefEq v.toDefEq
theorem translated_example_env_extends ... : env ≤ env
theorem translated_opaque_env_extends ... : env ≤ env'
```

- [ ] **Step 3: Run focused gates**

Run:

```bash
npm run build -- --pretty false
npm run test:pskernel:ka22
npm run assurance:ka22
npm run lean:ka22:check
```

Expected: all pass.

- [ ] **Step 4: Package release**

Create `proofscript-v1-ka22-nondef-env-extension-bridge0.zip`, `.sha256`, KA22 report, release gate, and verification summary.

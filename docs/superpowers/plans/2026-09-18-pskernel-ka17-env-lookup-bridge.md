# PSKernel KA-17 Env Lookup Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a narrow KA-17 Lean4Lean assurance checkpoint proving that translated axiom/definition additions are discoverable through real Lean4Lean `VEnv.constants` and `VEnv.defeqs`.

**Architecture:** Keep PSKernel runtime semantics, Core format 71, and codec unchanged. Add only assurance Lean, metadata, scripts, and tests. Build on KA-16's imported `VEnv.LE` bridge and use real `Lean4Lean.Theory.Typing.Env`.

**Tech Stack:** TypeScript gate scripts under Node 22 with `--experimental-strip-types`; Lean 4.33.1; offline Lean4Lean + Batteries path-patched source.

**Spec:** `assurance/ka17/env-lookup-bridge.json`

## Global Constraints

- Trusted PSKernel semantic change: `false`.
- Kernel codec change: `false`.
- New trusted computation rule: `false`.
- Core artifact format remains `71`.
- Full Lean 4 equivalence remains `false`.
- Same theory as full Lean 4 remains `false`.
- Fully formal K3 remains `false`.
- Count only Lean theorem obligations that compile against real imported Lean4Lean modules.

---

### Task 1: Failing KA-17 Gate Test

**Files:**
- Create: `tools/pskernel-ka17-env-lookup-bridge-tests.ts`
- Later consumed by: `package.json` script `test:pskernel:ka17`

**Interfaces:**
- Consumes: `runKA17EnvLookupBridgeGate({ strict: true })`
- Produces: a test that fails until KA-17 assurance files and gate implementation exist.

- [x] **Step 1: Write the failing test**

```ts
import { runKA17EnvLookupBridgeGate } from './pskernel-ka17-env-lookup-bridge.ts';
const gate = runKA17EnvLookupBridgeGate({ strict: true });
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tools/pskernel-ka17-env-lookup-bridge-tests.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `tools/pskernel-ka17-env-lookup-bridge.ts`.

### Task 2: Lean Bridge and Gate

**Files:**
- Create: `assurance/ka17/env-lookup-bridge.lean`
- Create: `tools/pskernel-ka17-env-lookup-bridge.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: KA-16 `runKA16EnvExtensionBridgeGate` and copied KA-12/KA-13/KA-15/KA-16 Lean modules.
- Produces: `runKA17EnvLookupBridgeGate(options): KA17GateResult`.

- [x] **Step 1: Write Lean helper and bridge lemmas**

```lean
import Lean4Lean.Theory.Typing.Env
import PSKernelKA16EnvExtensionBridge

namespace PSKernelKA17
open Lean4Lean
-- addConst lookup, addDefEq lookup preservation, addDefEq self-membership,
-- translated axiom/definition lookup bridge lemmas.
end PSKernelKA17
```

- [x] **Step 2: Implement TypeScript strict gate**

Run KA-16 strict gate, copy KA-12/13/15/16/17 Lean modules into the offline Lean4Lean source root, build `Lean4Lean.Theory.Typing.Env`, compile dependencies, then run `lake env lean` on `PSKernelKA17EnvLookupBridge.lean`.

- [x] **Step 3: Verify test passes**

Run: `npm run test:pskernel:ka17`

Expected: PASS.

### Task 3: Metadata, Release Gate, and Packaging

**Files:**
- Create: `assurance/ka17/env-lookup-bridge.json`
- Create: `assurance/ka17/obligation-delta.json`
- Create: `assurance/ka17/KA17_REPORT.md`
- Create: `assurance/ka17/KA17_RELEASE_GATE.json`
- Modify: `versions.json`, `package.json`, `package-lock.json`

**Interfaces:**
- Consumes: verification command outputs.
- Produces: frozen `proofscript-v1-ka17-env-lookup-bridge0.zip` and `.sha256`.

- [x] **Step 1: Update metadata**

Set public version `1.0.0-pskernel.20`, checkpoint `proofscript-v1-ka17-env-lookup-bridge0`, formal obligation count `9`.

- [x] **Step 2: Run verification**

Run build, KA-17 tests/assurance, selected inherited KA gates, Lean gates, standalone smoke, Arena gates, fresh extract smoke, and ZIP integrity.

- [x] **Step 3: Freeze ZIP**

Create filtered source snapshot, zip, compute SHA-256, and write release artifacts.

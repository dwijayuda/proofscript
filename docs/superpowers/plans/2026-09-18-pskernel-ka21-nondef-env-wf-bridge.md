# KA-21 Non-definition VEnv.WF Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lift KA-20 theorem/example/opaque `VDecl.WF` bridge lemmas into real imported Lean4Lean `VEnv.WF` lemmas.

**Architecture:** Add a new KA-21 assurance slice with one Lean file, one TypeScript gate, one focused test, metadata JSON, release gate, and report. Reuse the existing KA-20 direct Lean4Lean import chain and keep PSKernel trusted semantics unchanged.

**Tech Stack:** Lean 4.33.1, offline Lean4Lean + Batteries, TypeScript/Node test gates, npm scripts.

**Spec:** `assurance/ka21/nondef-env-wf-bridge.json`

## Global Constraints

- Trusted PSKernel semantic change: no.
- Kernel codec change: no.
- New trusted computation rule: no.
- Core artifact format remains 71.
- Full Lean 4 equivalence remains false.
- Same theory as full Lean 4 remains false.
- Fully formal K3 remains false.

---

### Task 1: Add KA-21 direct Lean4Lean non-definition environment-WF bridge

**Files:**
- Create: `assurance/ka21/nondef-env-wf-bridge.lean`
- Create: `assurance/ka21/nondef-env-wf-bridge.json`
- Create: `assurance/ka21/obligation-delta.json`
- Create: `tools/pskernel-ka21-nondef-env-wf-bridge.ts`
- Create: `tools/pskernel-ka21-nondef-env-wf-bridge-tests.ts`
- Modify: `package.json`
- Modify: `versions.json`

**Interfaces:**
- Consumes: KA-20 `PSKernelKA20.translated_theorem_vdecl_wf`, `translated_example_vdecl_wf`, `translated_opaque_vdecl_wf`.
- Produces: KA-21 `translated_theorem_env_wf`, `translated_example_env_wf`, `translated_opaque_env_wf`.

- [x] **Step 1: Write the failing test**

Run: `node --experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tools/pskernel-ka21-nondef-env-wf-bridge-tests.ts`
Expected: FAIL with missing KA-21 gate/tool.

- [x] **Step 2: Add minimal Lean bridge**

Use `VEnv.WF'.decl` with the KA-20 `VDecl.WF` lemmas.

- [x] **Step 3: Add strict TypeScript gate**

Copy KA-20 modules into offline Lean4Lean source, compile dependency modules to `.olean`, and run the KA-21 Lean file.

- [ ] **Step 4: Verify focused gates**

Run:

```bash
npm run test:pskernel:ka21
npm run assurance:ka21
npm run lean:ka21:check
```

Expected: all pass.

- [ ] **Step 5: Package release**

Create final ZIP, SHA-256 file, report, release gate, and verification summary.

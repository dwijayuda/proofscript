# PSKernel KA-15 Env WF Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the KA-13 direct Lean4Lean `VDecl.WF` bridge to the imported `Lean4Lean.VEnv.WF` environment well-formedness relation.

**Architecture:** KA-15 adds a proof/assurance layer only. It imports KA-13's checked bridge module and Lean4Lean's real `Typing.Env` theory, proves two conditional environment-extension lemmas, and wires the checks into repository scripts without changing PSKernel runtime semantics or Core format.

**Tech Stack:** Lean 4.33.1, Lean4Lean offline source, TypeScript Node scripts using `node --experimental-strip-types`, npm workspaces.

**Spec:** `assurance/ka15/env-wf-bridge.json`

## Global Constraints

- Keep active kernel name `PSKernel`.
- Keep Core artifact format `71`.
- Keep certificate format `2`.
- Do not change trusted kernel semantics.
- Do not change kernel codec.
- Do not claim full Lean 4 equivalence.
- Count only machine-checked Lean theorem obligations.

---

### Task 1: Red test for KA-15 artifact surface

**Files:**
- Create: `tools/pskernel-ka15-env-wf-bridge-tests.ts`

**Interfaces:**
- Consumes: KA-14 package layout.
- Produces: a failing test requiring KA-15 files, scripts, and gate result.

- [x] **Step 1: Write the failing test**

```ts
assert.ok(fs.existsSync(path.join(root, 'assurance/ka15/env-wf-bridge.lean')));
assert.equal(pkg.version, '1.0.0-pskernel.18');
const gate = runKA15EnvWFBridgeGate({ strict: true });
assert.equal(gate.formalLean4EquivalenceProvenObligations, 4);
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
node --experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tools/pskernel-ka15-env-wf-bridge-tests.ts
```

Expected: FAIL with missing `tools/pskernel-ka15-env-wf-bridge.ts`.

### Task 2: Add direct Lean4Lean environment WF bridge

**Files:**
- Create: `assurance/ka15/env-wf-bridge.lean`
- Create: `assurance/ka15/env-wf-bridge.json`
- Create: `assurance/ka15/obligation-delta.json`

**Interfaces:**
- Consumes: `PSKernelKA13.translated_axiom_vdecl_wf`, `PSKernelKA13.translated_definition_vdecl_wf`.
- Produces: `PSKernelKA15.translated_axiom_env_wf`, `PSKernelKA15.translated_definition_env_wf`.

- [x] **Step 1: Prove translated axiom environment preservation**

```lean
theorem translated_axiom_env_wf ... (hEnv : VEnv.WF env) : VEnv.WF env' := by
  rcases hEnv with ⟨prefix, hprefix⟩
  exact ⟨VDecl.axiom c :: prefix, VEnv.WF'.decl (translated_axiom_vdecl_wf ...) hprefix⟩
```

- [x] **Step 2: Prove translated definition environment preservation**

```lean
theorem translated_definition_env_wf ... (hEnv : VEnv.WF env) :
    VEnv.WF (env'.addDefEq v.toDefEq) := by
  rcases hEnv with ⟨prefix, hprefix⟩
  exact ⟨VDecl.def v :: prefix, VEnv.WF'.decl (translated_definition_vdecl_wf ...) hprefix⟩
```

### Task 3: Add KA-15 gate and scripts

**Files:**
- Create: `tools/pskernel-ka15-env-wf-bridge.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `versions.json`

**Interfaces:**
- Consumes: KA-12/KA-13 materialization gates.
- Produces: scripts `test:pskernel:ka15`, `assurance:ka15`, `lean:ka15:check`, `lean:ka15:check:soft`.

- [x] **Step 1: Copy KA-12, KA-13, and KA-15 Lean files into Lean4Lean source root.**
- [x] **Step 2: Compile KA-12 and KA-13 as imports, then check KA-15.**
- [x] **Step 3: Return a structured JSON gate result with honest claim boundary.**

### Task 4: Verify and package

**Files:**
- Create: `assurance/ka15/KA15_REPORT.md`
- Create: `assurance/ka15/KA15_RELEASE_GATE.json`
- Create: final ZIP and SHA-256.

**Interfaces:**
- Consumes: all KA gates and Arena corpus.
- Produces: frozen checkpoint candidate `proofscript-v1-ka15-env-wf-bridge0.zip` if gates pass.

- [ ] **Step 1: Run build and KA gates.**
- [ ] **Step 2: Run strict Lean4Lean gates.**
- [ ] **Step 3: Run Arena corpus gates.**
- [ ] **Step 4: Fresh extract smoke and ZIP integrity test.**

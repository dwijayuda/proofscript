# PSKernel KA-13 VDecl.WF Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a KA-13 assurance checkpoint that machine-checks the first conditional bridge from PSKernel-translated non-inductive declarations into Lean4Lean's real `VDecl.WF` relation.

**Architecture:** Preserve KA-12's direct imported Lean4Lean reference surface and add one narrow layer above it. The new Lean file imports `Lean4Lean.Theory.Typing.Env` plus the KA-12 direct-reference module, then proves conditional axiom/definition bridge lemmas using Lean4Lean's actual `VDecl.WF` constructors. TypeScript tooling runs KA-12 first, copies KA-12/KA-13 Lean files into the offline Lean4Lean source tree, and checks the new file with `lake env lean`.

**Tech Stack:** TypeScript/Node scripts with `--experimental-strip-types`; Lean 4.33.1; offline Lean4Lean source; local patched Batteries dependency.

**Spec:** `assurance/ka12/obligation-delta.json` and `assurance/ka12/KA12_REPORT.md` list declaration-checking soundness against Lean4Lean as still open. KA-13 closes only the first conditional `VDecl.WF` bridge lemmas; it does not claim executable PSKernel refinement or full Lean 4 equivalence.

## Global Constraints

- Trusted PSKernel semantic change: `false`.
- Kernel codec change: `false`.
- New trusted computation rule: `false`.
- Core artifact format remains `71`.
- Certificate format remains `2`.
- Full Lean 4 equivalence remains `false`.
- Same theory as full Lean 4 remains `false`.
- Fully formal K3 remains `false`.
- No inductive/mutual/nested soundness claim in KA-13.

---

### Task 1: KA-13 Red Test

**Files:**
- Create: `tools/pskernel-ka13-vdecl-wf-bridge-tests.ts`

**Interfaces:**
- Consumes: filesystem, `package.json` scripts, `assurance/ka13/*` artifact names.
- Produces: a failing test that names every expected KA-13 file and script.

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'assurance/ka13/vdecl-wf-bridge.lean',
  'assurance/ka13/vdecl-wf-bridge.json',
  'assurance/ka13/obligation-delta.json',
  'assurance/ka13/KA13_REPORT.md',
  'assurance/ka13/KA13_RELEASE_GATE.json',
  'tools/pskernel-ka13-vdecl-wf-bridge.ts',
  'tools/pskernel-ka13-vdecl-wf-bridge-tests.ts',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.equal(pkg.version, '1.0.0-pskernel.16');
assert.ok(pkg.scripts['test:pskernel:ka13']);
assert.ok(pkg.scripts['assurance:ka13']);
assert.ok(pkg.scripts['lean:ka13:check']);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tools/pskernel-ka13-vdecl-wf-bridge-tests.ts`

Expected: FAIL with `missing assurance/ka13/vdecl-wf-bridge.lean`.

### Task 2: Direct Lean4Lean VDecl.WF Lean File

**Files:**
- Create: `assurance/ka13/vdecl-wf-bridge.lean`

**Interfaces:**
- Consumes: `PSKernelKA12.translateDecl?`, `translateConstVal?`, `translateDefVal?` from KA-12 direct reference.
- Produces: machine-checked lemmas `translated_axiom_vdecl_wf` and `translated_definition_vdecl_wf`.

- [ ] **Step 1: Implement the Lean bridge**

```lean
import Lean4Lean.Theory.Typing.Env
import PSKernelKA12DirectReference

namespace PSKernelKA13
open Lean4Lean
open PSKernelKA12

theorem translated_axiom_vdecl_wf ... : VDecl.WF env (VDecl.axiom c) env' := by
  exact VDecl.WF.axiom hType hadd
```

- [ ] **Step 2: Check with Lean4Lean**

Copy `assurance/ka12/direct-lean4lean-reference.lean` to the Lean4Lean root as `PSKernelKA12DirectReference.lean`, copy `assurance/ka13/vdecl-wf-bridge.lean` to `PSKernelKA13VDeclWFBridge.lean`, then run: `lake env lean PSKernelKA13VDeclWFBridge.lean`.

Expected: PASS.

### Task 3: KA-13 Tooling and Metadata

**Files:**
- Create: `tools/pskernel-ka13-vdecl-wf-bridge.ts`
- Create: `assurance/ka13/vdecl-wf-bridge.json`
- Create: `assurance/ka13/obligation-delta.json`
- Create: `assurance/ka13/KA13_REPORT.md`
- Create: `assurance/ka13/KA13_RELEASE_GATE.json`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `versions.json`

**Interfaces:**
- Consumes: `runKA12ReferenceGate({ strict: true })`.
- Produces: `runKA13BridgeGate({ strict: true })` and scripts `test:pskernel:ka13`, `assurance:ka13`, `lean:ka13:check`, `lean:ka13:check:soft`.

- [ ] **Step 1: Implement the TypeScript gate**

Run KA-12 first. Build `Lean4Lean.Theory.Typing.Env`. Copy KA-12 and KA-13 Lean files into the Lean4Lean source root. Run `lake env lean PSKernelKA13VDeclWFBridge.lean`. Return machine-readable gate data and preserve all claim boundaries.

- [ ] **Step 2: Update metadata**

Version becomes `1.0.0-pskernel.16`; checkpoint becomes `proofscript-v1-ka13-vdecl-wf-bridge0`; core format remains `71`; formal Lean4 equivalence proven obligations becomes `2` only for the two conditional bridge lemmas, while full equivalence remains false.

### Task 4: Verification and Release

**Files:**
- Create final ZIP and SHA-256 in `/mnt/data`.
- Copy KA-13 report/release/verification summaries to `/mnt/data`.

**Interfaces:**
- Consumes: all scripts added in Task 3.
- Produces: `proofscript-v1-ka13-vdecl-wf-bridge0.zip` and `.sha256`.

- [ ] **Step 1: Run verification**

Run: `npm install --offline --no-audit --no-fund`, `npm run build -- --pretty false`, KA-1..KA-13 tests/assurance where time permits, `npm run lean:ka12:check`, `npm run lean:ka13:check`, kernel smoke, standalone small, psc kernel status, conformance bounded, fresh extract smoke, and `unzip -t`.

- [ ] **Step 2: Package final artifact**

Filter generated dependency/build residue where appropriate, zip the checkpoint, compute SHA-256, and verify the ZIP.

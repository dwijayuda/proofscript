# ProofScript Software Profile v0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a Go-small ProofScript Software Profile for correctness-focused software development, bound to the P5.94 audited kernel/checker baseline.

**Architecture:** Add a human-readable profile spec, a machine-readable manifest, and a consistency test. Do not change kernel computation rules; this is a language-profile/control-plane checkpoint over the existing P5.94 trusted boundary.

**Tech Stack:** TypeScript/Node test script, JSON manifest, Markdown docs, existing npm workspace scripts.

**Spec:** `docs/superpowers/specs/2026-09-17-proofscript-software-profile-v0-design.md`

## Global Constraints

- Baseline release: P5.94.
- Baseline checkpoint: `arena-nested-helper-target-validation0`.
- Baseline SHA-256: `8994a1e4317b82b07a032004eda9a66255cab76e63ee0923cb0ebee40f9d873c`.
- Full Lean 4 equivalence: NO.
- Same theory as full Lean 4: NO.
- Fully formal K3: NO.
- Formal Lean 4 equivalence obligations proven: 0.
- Smallness budget: 20-35 core constructs.
- Contracts must elaborate to ordinary obligations; they are not new kernel primitives.

---

### Task 1: Software profile consistency gate

**Files:**
- Create: `tools/software-profile-consistency-tests.ts`
- Test: `node tools/software-profile-consistency-tests.ts`

**Interfaces:**
- Consumes: `docs/profiles/PROOFSCRIPT_SOFTWARE_PROFILE_V0.md`, `config/proofscript-software-profile-v0.json`, `P5_94_FINAL_RELEASE_GATE.json`
- Produces: `PROOFSCRIPT_SOFTWARE_PROFILE_V0_CONSISTENCY=PASS`

- [x] **Step 1: Write the failing test**

Create a Node/TypeScript script that checks the profile spec, manifest, smallness budget, required constructs, forbidden constructs, deferred feature list, baseline SHA binding, and non-overclaim boundary.

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
export NODE_OPTIONS="--experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON"
node tools/software-profile-consistency-tests.ts
```

Expected failure before implementation:

```text
software profile spec must exist at docs/profiles/PROOFSCRIPT_SOFTWARE_PROFILE_V0.md
```

- [x] **Step 3: Write minimal implementation**

Add the profile spec and manifest with the required fields.

- [x] **Step 4: Run test to verify it passes**

Run the same command and expect:

```text
PROOFSCRIPT_SOFTWARE_PROFILE_V0_CONSISTENCY=PASS
```

### Task 2: Package script integration

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: `tools/software-profile-consistency-tests.ts`
- Produces: npm script `test:profile:software`

- [x] **Step 1: Add script**

Add:

```json
"test:profile:software": "export NODE_OPTIONS=\"--experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON\"; node tools/software-profile-consistency-tests.ts"
```

- [x] **Step 2: Run through npm**

Run:

```bash
npm run test:profile:software
```

Expected: pass with the same consistency marker.

### Task 3: Checkpoint report and archive

**Files:**
- Create: `P5_95_SOFTWARE_PROFILE_PLAN_REPORT.md`
- Create: `/mnt/data/proofscript-software-profile-v0-p5-95-plan0.zip`
- Create: `/mnt/data/proofscript-software-profile-v0-p5-95-plan0.zip.sha256`

**Interfaces:**
- Consumes: profile spec, manifest, consistency test, build/test output
- Produces: profile planning checkpoint artifacts

- [x] **Step 1: Run focused and bounded inherited gates**

Run:

```bash
npm run test:profile:software
npm run build -- --pretty false
npm run test:conformance
```

- [x] **Step 2: Write report**

Record baseline, created files, test evidence, and boundary.

- [x] **Step 3: Package source checkpoint**

Create a filtered source ZIP and SHA-256 sidecar.

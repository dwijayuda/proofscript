# PSKernel KA-14 Real Arena Corpus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert KA-13's Arena blocker into verified real-corpus evidence using the uploaded Arena corpus and results metadata.

**Architecture:** Keep PSKernel semantics and Core format unchanged. Add an assurance-only gate that reads existing Arena runner reports and release metadata, then records the claim boundary.

**Tech Stack:** Node.js, TypeScript strip-types execution, npm workspaces, existing `tools/arena-*` runners.

**Spec:** `assurance/ka14/arena-real-corpus.json` and `assurance/ka14/KA14_RELEASE_GATE.json`.

## Global Constraints

- Active kernel remains `PSKernel`.
- Core artifact format remains `71`.
- Certificate format remains `2`.
- No trusted kernel semantic change.
- No kernel codec change.
- Do not claim full Lean 4 equivalence, same theory as Lean 4, or fully formal K3.

---

### Task 1: Red test for KA-14 assurance

**Files:**
- Create: `tools/pskernel-ka14-real-arena-corpus-tests.ts`

**Interfaces:**
- Consumes: `runKA14ArenaRealCorpusGate` from `tools/pskernel-ka14-real-arena-corpus.ts`.
- Produces: script `test:pskernel:ka14`.

- [x] Write the failing test requiring KA-14 artifacts and version `1.0.0-pskernel.17`.
- [x] Run the test and observe failure because the KA-14 gate module is missing.

### Task 2: KA-14 assurance artifacts

**Files:**
- Create: `assurance/ka14/arena-real-corpus.json`
- Create: `assurance/ka14/obligation-delta.json`
- Create: `assurance/ka14/KA14_REPORT.md`
- Create: `assurance/ka14/KA14_RELEASE_GATE.json`
- Modify: `versions.json`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `artifacts/arena/P5_94_ARENA_STATIC_NONPERF_REPORT.json` and `artifacts/arena/P5_94_ARENA_TUTORIAL_REPORT.json`.
- Produces: JSON fields checked by `runKA14ArenaRealCorpusGate`.

- [x] Run Arena corpus preflight against `/mnt/data/arena-corpus-20260915`.
- [x] Run `test:arena:static-nonperf`, `test:arena:tutorial`, and `verify:arena`.
- [x] Write KA-14 assurance JSON and Markdown files from the verified reports.

### Task 3: KA-14 gate implementation

**Files:**
- Create: `tools/pskernel-ka14-real-arena-corpus.ts`

**Interfaces:**
- Produces: `runKA14ArenaRealCorpusGate(options?: { strict?: boolean }): KA14GateResult`.

- [x] Read package/version/release artifacts.
- [x] Assert corpus count 190 and expected Arena summary counts.
- [x] Assert no equivalence overclaims.
- [x] Expose strict CLI failure on mismatch.

### Task 4: Verification and release package

**Files:**
- Output: `proofscript-v1-ka14-real-arena-corpus0.zip`
- Output: `KA14_REAL_ARENA_CORPUS_REPORT.md`
- Output: `KA14_REAL_ARENA_CORPUS_RELEASE_GATE.json`
- Output: `KA14_REAL_ARENA_CORPUS_VERIFICATION_SUMMARY.json`

- [ ] Run install/build and KA/Arena gates.
- [ ] Fresh extract smoke test.
- [ ] `unzip -t` final ZIP.

# KA-34 Mutual Definition Environment Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the smallest conditional direct Lean4Lean bridge for mutual-definition environment behavior.

**Architecture:** KA-34 adds assurance-only Lean and TypeScript gate files. It imports real Lean4Lean typing environment lemmas and proves conditional bridge obligations over `VDecl.mutualDef`, `VEnv.addConsts`, and `VEnv.addDefEqs` without changing PSKernel trusted runtime semantics or Core format.

**Tech Stack:** Lean 4.33.1, uploaded Lean4Lean source, Node/TypeScript gate scripts.

**Spec:** `assurance/ka34/mutual-def-env-bridge.json`

## Global Constraints

- Active kernel remains PSKernel.
- Core artifact format remains 71.
- Certificate format remains 2.
- No trusted PSKernel semantic change.
- No kernel codec change.
- No new trusted computation rule.
- Full Lean4 equivalence remains false.

---

### Task 1: KA-34 red/green bridge gate

**Files:**
- Create: `assurance/ka34/mutual-def-env-bridge.lean`
- Create: `tools/pskernel-ka34-mutual-def-env-bridge.ts`
- Create: `tools/pskernel-ka34-mutual-def-env-bridge-tests.ts`
- Modify: `package.json`, `package-lock.json`, `versions.json`

**Interfaces:**
- Produces: `runKA34MutualDefEnvBridgeGate({ strict?: boolean; soft?: boolean })`
- Produces scripts: `test:pskernel:ka34`, `assurance:ka34`, `lean:ka34:check`

- [x] Write failing test for missing KA-34 gate.
- [x] Verify red failure is missing KA-34 tool/artifacts.
- [x] Implement Lean bridge and TypeScript gate.
- [x] Verify focused green with `npm run test:pskernel:ka34`.

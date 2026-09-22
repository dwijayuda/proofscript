# PSKernel KA-26 Quot Environment Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a narrow, conditional Lean4Lean bridge for the KA-12 `.quot` declaration surface.

**Architecture:** Keep PSKernel trusted runtime unchanged. Add one Lean assurance module imported into the offline Lean4Lean root and one TypeScript gate that checks package metadata, copies the dependency chain, compiles the bridge, and reports claim boundaries.

**Tech Stack:** Lean 4.33.1, Lean4Lean offline source, TypeScript/Node stripped-types runner.

**Spec:** `assurance/ka26/quot-env-bridge.json`

## Global Constraints

- Core artifact format remains 71.
- Certificate format remains 2.
- No trusted PSKernel semantic change.
- No kernel codec change.
- No new trusted computation rule.
- No full Lean 4 equivalence claim.
- No quotient semantic soundness claim.

---

### Task 1: KA-26 red/green gate

**Files:**
- Create: `tools/pskernel-ka26-quot-env-bridge-tests.ts`
- Create: `tools/pskernel-ka26-quot-env-bridge.ts`
- Create: `assurance/ka26/quot-env-bridge.lean`
- Create: `assurance/ka26/quot-env-bridge.json`
- Create: `assurance/ka26/obligation-delta.json`
- Create: `assurance/ka26/KA26_RELEASE_GATE.json`
- Create: `assurance/ka26/KA26_REPORT.md`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `versions.json`

**Interfaces:**
- Consumes: `runKA25NonDefEnvDefEqPreservationBridgeGate`
- Produces: `runKA26QuotEnvBridgeGate(options?: { strict?: boolean; soft?: boolean })`

- [x] Write failing test for missing KA-26 gate.
- [x] Implement Lean bridge and TypeScript gate.
- [x] Run `npm run test:pskernel:ka26`.
- [x] Run `npm run lean:ka26:check`.
- [x] Package verified artifact.

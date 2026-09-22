# PSKernel KA-28 Quotient DefEq Preservation Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a narrow direct Lean4Lean quotient definitional-equation preservation bridge without changing trusted PSKernel semantics.

**Architecture:** Reuse the KA-27 quotient no-overwrite bridge and KA-19 `defeqs` preservation lemmas. Add a KA-28 Lean module, strict TypeScript gate, report, release gate, and verification summary.

**Tech Stack:** Lean 4.33.1, Lean4Lean offline source, TypeScript/Node gate scripts, npm offline install.

**Spec:** `assurance/ka28/quot-env-defeq-preservation-bridge.json`

## Global Constraints

- No PSKernel trusted semantic change.
- Core artifact format remains 71.
- Certificate format remains 2.
- Full Lean 4 equivalence remains false.
- Quotient semantic soundness remains false.

---

### Task 1: Add KA-28 bridge and strict gate

**Files:**
- Create: `assurance/ka28/quot-env-defeq-preservation-bridge.lean`
- Create: `tools/pskernel-ka28-quot-env-defeq-preservation-bridge.ts`
- Create: `tools/pskernel-ka28-quot-env-defeq-preservation-bridge-tests.ts`

**Interfaces:**
- Consumes: `runKA27QuotEnvNoOverwriteBridgeGate`
- Produces: `runKA28QuotEnvDefEqPreservationBridgeGate`

- [x] Write a failing test for missing KA-28 files.
- [x] Add Lean lemmas for quotient defeq preservation.
- [x] Add strict TypeScript gate.
- [x] Run focused test and Lean check.

### Task 2: Release metadata and packaging

**Files:**
- Create: `assurance/ka28/KA28_RELEASE_GATE.json`
- Create: `assurance/ka28/KA28_VERIFICATION_SUMMARY.json`
- Create: `assurance/ka28/KA28_REPORT.md`

- [x] Update package version to `1.0.0-pskernel.31`.
- [x] Preserve claim boundaries.
- [x] Package ZIP and SHA.

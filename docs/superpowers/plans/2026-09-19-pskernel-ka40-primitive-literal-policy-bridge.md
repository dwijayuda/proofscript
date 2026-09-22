# PSKernel KA-40 Primitive/Literal Policy Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a direct Lean4Lean primitive/literal policy bridge without changing PSKernel trusted semantics.

**Architecture:** Keep KA-40 as an assurance-only milestone. The Lean file imports Lean4Lean.Verify.Primitive and proves wrapper obligations over HasPrimitives, ContainsLits, Nat/Bool literal typing, and constant translation.

**Tech Stack:** Lean 4.33.1, Lean4Lean, Node TypeScript assurance gate.

**Spec:** assurance/ka40/primitive-literal-policy-bridge.json

## Global Constraints

- Checkpoint: `proofscript-v1-ka40-primitive-literal-policy-bridge0`
- Baseline: `proofscript-v1-ka39-defeq-whnf-refinement-bridge0`
- Public version: `1.0.0-pskernel.43`
- Core artifact format remains 71.
- Certificate format remains 2.
- No trusted PSKernel semantic change.
- No kernel codec change.
- No new trusted computation rule.
- Do not claim full Lean4 equivalence.

---

### Task 1: KA-40 bridge gate

**Files:**
- Create: `assurance/ka40/primitive-literal-policy-bridge.lean`
- Create: `tools/pskernel-ka40-primitive-literal-policy-bridge.ts`
- Create: `tools/pskernel-ka40-primitive-literal-policy-bridge-tests.ts`

**Interfaces:**
- Produces: `runKA40PrimitiveLiteralPolicyBridgeGate(options)`

- [x] Write failing test for missing KA-40 gate.
- [x] Implement Lean wrapper bridge.
- [x] Implement strict Node assurance gate.
- [x] Run focused test and Lean check.

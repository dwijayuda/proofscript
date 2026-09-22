# ProofScript Canonical Package Guide

P5.1 makes the canonical PSC-1 production path explainable at package level. The source of truth for package identity is still `config/package-classification.json`; this guide explains how each canonical package participates in the current `.ps -> checked Core -> verifier -> JS/TS` pipeline.

## Current Trust Claim

ProofScript is currently **K3-TB trusted-boundary**. It is not fully formal K3 and is not proven equivalent to Lean 4. Formal Lean 4 equivalence remains **0 proven obligations**.

## Canonical Pipeline

```text
.ps source
  -> packages/syntax
  -> packages/parser
  -> packages/recursion / packages/typeclass helpers
  -> packages/elaborator
  -> packages/std / packages/environment
  -> packages/frontend
  -> packages/kernel
  -> packages/kernel-codec / packages/certificates / packages/verifier
  -> packages/backend-typescript
  -> packages/runtime
```

## Package Responsibilities

| Package | Responsibility |
| --- | --- |
| `packages/syntax` | Surface AST types for parsed ProofScript source. |
| `packages/parser` | Turns `.ps` text into syntax AST; it does not prove correctness. |
| `packages/recursion` | Source-level structural recursion analysis helpers. |
| `packages/typeclass` | Current lightweight typeclass metadata helper. |
| `packages/elaborator` | Lowers syntax into explicit Core candidates and checked declarations. |
| `packages/std` | Checked bootstrap declarations and manifest for PSC-1 foundations. |
| `packages/environment` | Loads checked bootstrap/prelude state for the frontend. |
| `packages/frontend` | Orchestrates the current canonical PSC-1 pipeline. |
| `packages/kernel` | TCB-adjacent checker for explicit Core declarations. |
| `packages/kernel-codec` | Encodes and decodes inert checked Core artifacts. |
| `packages/certificates` | Defines certificate payloads and hashes. |
| `packages/verifier` | Replays artifacts through the kernel/codec/certificate path. |
| `packages/backend-typescript` | Emits JS/TS from already-checked Core. |
| `packages/runtime` | Runtime helpers for already-checked JS/TS output. |

## How to Add a Feature

Use the feature promotion gate. A production-supported feature must have parser/syntax evidence when syntax changes, elaborator or checked bootstrap evidence, a conservative kernel-impact statement, backend/runtime evidence when executable, JS smoke, TypeScript compile smoke, rfl/reduction smoke when applicable, negative fail-closed tests, governance or matrix coverage, package scripts, and docs/reports.

The intended flow is:

```text
syntax/parser change if needed
  -> checked Core or checked bootstrap declaration
  -> kernel accepts only explicit Core rules
  -> backend/runtime execute already-checked Core
  -> feature gate + verification matrix evidence
```

Do not make backend/runtime behavior the source of proof validity.

## Package Documentation Rule

Every canonical PSC-1 package README must include:

```text
Production Role
Trust Boundary
Extension Points
Verification
Non-Claims
```

`tools/check-canonical-package-docs.ts` enforces those sections and checks that each README names the package role, tier, lifecycle, trust boundary, K3-TB status, and the non-claim that this is not fully formal K3 and not proven equivalent to Lean 4.

## What This Does Not Prove

This package guide improves explainability and contributor discipline. It does not prove parser correctness, elaborator soundness, backend semantic preservation, runtime correctness, or Lean 4 kernel equivalence.

The formal trust status remains: K3-TB trusted-boundary, not fully formal K3, not proven equivalent to Lean 4, and **0 formal Lean 4 equivalence obligations proven**.

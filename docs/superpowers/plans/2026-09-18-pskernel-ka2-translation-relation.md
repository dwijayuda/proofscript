# PSKernel KA-2 Translation Relation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an executable PSCore v71 to Lean 4.33.1 reference-shape translation scaffold without changing trusted kernel semantics.

**Architecture:** KA-2 lives in the assurance layer. Runtime checking remains in PSKernel; the new translation tool is a proof-preparation artifact and gate.

**Tech Stack:** TypeScript assurance script, JSON ledgers, Lean theorem-target skeleton.

**Spec:** `assurance/ka1/*` and `assurance/ka2/*`.

## Global Constraints

- No trusted kernel semantic change.
- Core artifact format remains 71.
- Full Lean 4 equivalence remains false.
- Formal Lean 4 equivalence proven obligations remain 0.

---

- [x] Write failing KA-2 translation tests.
- [x] Add executable translation scaffold.
- [x] Add KA-2 JSON relation and obligation delta.
- [x] Add Lean theorem-target skeleton.
- [x] Add package scripts and version metadata.
- [x] Run KA-2 and regression gates.

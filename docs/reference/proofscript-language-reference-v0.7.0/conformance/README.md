# ProofScript v0.7.0 Conformance Suite

Status: **S1 reference-contract corpus**.

This directory turns the prose language reference into implementation-facing data. The files here are not a substitute for a machine-checked Lean proof; they are the minimum corpus a parser/lowering implementation must satisfy before stronger S2/S3 claims are considered.

## Files

- `feature-registry.schema.json` — JSON Schema for the machine-readable feature registry.
- `feature-registry.json` — registered L/D/E features and X-class exclusions relevant to the Lean-verified profile.
- `cases/positive.jsonl` — source examples that should parse in the reference frontend.
- `cases/negative.jsonl` — source examples that should be rejected or deferred according to the registered policy.
- `cases/lowering.jsonl` — source-to-canonical-Lean expectations for the admitted examples.
- `expected/positive-lowerings.lean` — human-readable Lean bundle corresponding to positive lowering examples.

## Required implementation behavior

A conforming frontend must:

1. classify every ProofScript-owned feature by registry ID;
2. reject unregistered D/E ownership;
3. lower every accepted D/E case to the listed canonical Lean shape, modulo the declared canonicalization relation;
4. preserve protected Lean neighbor forms such as `f (x,y)`;
5. keep E-class exceptions local to their registered context;
6. expose canonical Lean output for inspection.

## Claim ceiling

Passing this corpus is not S2 by itself. S2 requires a pinned Lean 4.34.0 reference parser/lowering proof. Passing this corpus is a prerequisite for production-refinement work.

# Stateful Lean VC Goals v1

Status: **Lean-derived residual goal artifact; populated only after the VC tactic is reached**

Schema:

```text
proofscript.stateful-vc-goals/v1
```

This artifact is embedded in `proofscript.stateful-vc-run/v1`.

## Purpose

When a pinned Lean run reaches the generated `vcgen` / `mvcgen` request but leaves proof goals, ProofScript records those goals as stable work items rather than treating the run as an opaque failure.

Each captured goal contains:

- a deterministic ID derived from function name, ordinal, and trace hash;
- zero-based ordinal;
- exact captured Lean trace text;
- SHA-256 of that trace;
- `discharged = false`.

Example ID shape:

```text
withdraw.stateful.vc.001.a1b2c3d4e5f6
```

## Provenance

The artifact records:

- function;
- generated request theorem name;
- exact request target;
- tactic name;
- SHA-256 of the complete Lean request output;
- whether the tactic was actually reached.

`generatedFromLeanExecution = true` is required before the goals may be described as real Lean-derived verification conditions.

## Completed proofs

If the generated request is accepted by Lean with no residual goals:

```text
goals = []
semanticProofDischarge = true
```

This records completion for that concrete example/request only. It does not establish general source-to-Lean equivalence, state-model adequacy use, or correctness of other ProofScript programs.

## Non-execution

If Lean never reaches the tactic—for example because the model, emitted program, or Triple target fails to typecheck—the artifact must not present parser-generated or guessed obligations as Lean-derived VCs.

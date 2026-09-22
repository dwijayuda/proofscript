# Stateful Postcondition IR v1

Status: **normalized source/provenance IR; semantic elaboration incomplete**

Schema:

```text
proofscript.stateful-postcondition-ir/v1
```

This IR is the boundary between source-level stateful postconditions and a future model-specific Hoare/WP elaboration. It exists so ProofScript can identify the meaning-bearing roles of `old(...)` and `result` without pretending that the current KA145 Triple skeleton already implements those semantics.

## Binder roles

Every stateful postcondition is interpreted relative to three conceptual binders:

```text
entryState   -- program state before execution
result       -- successful returned value
finalState   -- program state after execution
```

The current IR records these roles as:

```json
{
  "binders": {
    "entryState": { "role": "entry-state", "suggestedName": "__ps_entry" },
    "result": { "role": "result", "suggestedName": "__ps_result" },
    "finalState": { "role": "final-state", "suggestedName": "__ps_final" }
  }
}
```

The suggested names are provenance/debug names only. They do not yet constitute generated Lean binders.

## Expression-state rule

Ordinary expressions in a stateful `ensures` clause are interpreted in the **final-state** context unless a future model-specific construct says otherwise.

`old(e)` marks `e` as an **entry-state** expression.

`result` marks the successful **result binder**.

For example:

```text
ensures debit:
  balanceOf(from) = old(balanceOf(from)) - amount
```

normalizes structurally to:

```text
left balanceOf(from)      -> final-state expression
old(balanceOf(from))      -> entry-state expression
amount                    -> ordinary program parameter
```

The balanced scanner must recognize nested calls inside `old(...)`; a simple `old([^()]*)` regex is not conforming to this IR boundary.

## Current representation

A contract artifact stores:

```json
{
  "schema": "proofscript.stateful-postcondition-ir/v1",
  "defaultExpressionState": "final-state",
  "clauses": [
    {
      "name": "post",
      "source": "...",
      "oldReferences": [
        {
          "expression": "balanceOf(from)",
          "stateRole": "entry-state",
          "startOffset": 0,
          "endOffset": 20
        }
      ],
      "resultReferences": []
    }
  ],
  "loweringStatus": "source-normalized-binder-roles-only",
  "semanticElaborationComplete": false
}
```

Offsets are relative to the normalized source proposition string recorded in the clause.

## Trust boundary

The current IR proves none of the following by itself:

- that an expression such as `balanceOf(from)` has a valid interpretation over the selected state model;
- that the selected state model's runner is adequate;
- that a `Std.Do.Triple` theorem has been generated with correct entry/result/final-state binders;
- that exceptional exits are covered;
- that `vcgen`/`mvcgen` discharged any verification condition;
- that a TypeScript/JavaScript backend preserves the verified state semantics.

Therefore:

```text
semanticElaborationComplete = false
vcgenConnected = false
semanticProofDischarge = false
```

must remain visible until later gates replace the structural skeleton with checked model-specific semantics.

## Profile rule

A contract using stateful `old(...)` or stateful `result` must **not** receive the strict `ps3-monadic-contracts0` profile while this IR remains semantically incomplete.

Such artifacts are classified as `ka144-monadic-prototype` with explicit reasons such as:

```text
stateful-old-not-modeled
stateful-result-not-modeled
```

This classification must survive:

```text
proofscript.contracts.v1
  -> proofscript.monadic-lowering.v1
  -> proofscript.monadic-preflight.v1
```

A caller that requests `--verification-profile ps3-monadic-contracts0` must fail closed rather than silently downgrade.

## Promotion gate

Stateful `old` / `result` can be promoted only after a model-specific elaborator:

1. binds entry, result, and final-state variables explicitly;
2. resolves state-reading expressions against the selected state model;
3. produces an inspectable normalized pre/post predicate;
4. covers exceptional/abrupt paths when the monad supports them;
5. binds the generated predicates to the descriptor's WP/Triple semantics;
6. generates real verification conditions;
7. checks the resulting proof terms or equivalent trusted Core;
8. preserves all profile/provenance hashes through artifacts.

Until then, this IR is an explicit semantic staging boundary, not a proof claim.

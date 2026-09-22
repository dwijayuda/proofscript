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

The `ps3-monadic-contracts0` profile is a **specified structural alpha** profile, not a semantic proof-discharge claim.

Stateful `old(...)` may receive that profile only when its entry-state meaning is structurally modeled:

1. the IR contains an explicit `entry-state` binder role;
2. every call inside `old(...)` is either call-free or resolves to a state observation declared by the selected state-model descriptor;
3. every resolved observation is rewritten against the entry-state binder;
4. observation coverage is complete.

Stateful `result` may receive that profile only when it is confined to postconditions and is rewritten to the explicit `result` binder role.

Ordinary descriptor-declared state observations in postconditions are rewritten against the explicit `final-state` binder role.

If any of those structural conditions are missing, the artifact must remain `ka144-monadic-prototype` with an explicit prototype reason, and a caller requesting `--verification-profile ps3-monadic-contracts0` must fail closed rather than silently downgrade.

This classification must survive:

```text
proofscript.contracts.v1
  -> proofscript.monadic-lowering.v1
  -> proofscript.monadic-preflight.v1
```

Even for admitted structural `V-OLD` / `V-RESULT` artifacts:

```text
semanticElaborationComplete = false
vcgenConnected = false
semanticProofDischarge = false
```

remain required until later semantic gates exist.

## Promotion gates

### Structural profile admission

Stateful `old` / `result` may enter `ps3-monadic-contracts0` when the normalized IR:

1. binds entry, result, and final-state roles explicitly;
2. resolves admitted state-reading calls against the selected descriptor;
3. records complete observation coverage for every `old(...)` reference;
4. rewrites the normalized predicate with explicit entry/result/final-state roles;
5. preserves the same profile/provenance through contracts, monadic lowering, and preflight artifacts.

This is a structural semantics claim only.

### Future semantic proof promotion

A stronger semantic verification claim additionally requires a model-specific elaborator that:

1. binds generated Lean/Core entry, result, and final-state variables;
2. type-checks the normalized predicates against the selected state model;
3. covers exceptional/abrupt paths when the monad supports them;
4. binds the predicates to the descriptor's WP/Triple semantics;
5. validates the descriptor runner/adequacy theorem connection;
6. generates real verification conditions;
7. checks the resulting proof terms or equivalent trusted Core;
8. preserves all profile/provenance hashes through artifacts.

Until those gates exist, this IR remains an explicit semantic staging boundary and must not be described as vcgen/mvcgen discharge or a completed Hoare proof.


## Normalized predicate form

When a descriptor declares a state observation with `stateArgument: "last"`, the current structural normalizer makes binder roles explicit in ProofScript-form predicates.

Example:

```text
balanceOf(from) = old(balanceOf(from)) - amount
```

normalizes to:

```text
balanceOf(from, __ps_final) = (balanceOf(from, __ps_entry)) - amount
```

and:

```text
result = result
```

normalizes to:

```text
__ps_result = __ps_result
```

The Triple skeleton wraps these bodies as a postcondition function over `__ps_result` and `__ps_final`, while `__ps_entry` is an outer captured theorem binder constrained by the precondition. This is still structural source normalization; it is not yet Lean elaboration or proof discharge.


## Downstream typed reference elaboration

The next staging layer is:

```text
proofscript.stateful-predicate-elaboration/v1
```

It consumes this normalized IR plus the selected `proofscript.state-model.v1` descriptor and binds:

- `__ps_entry` and `__ps_final` to the descriptor's state type;
- `__ps_result` to the result type extracted from the selected state monad return type;
- descriptor-declared observation signatures to explicit non-state input types, state input type, and result type;
- simple observation arguments to program-parameter or primitive-literal type evidence.

Definite arity/type mismatches are errors and prevent admission to the strict structural profile.

This layer still deliberately records:

```text
wholePredicateTypeCheckingComplete = false
wpTripleSemanticBindingComplete = false
stateModelAdequacyChecked = false
verificationConditionsGenerated = false
semanticElaborationComplete = false
vcgenConnected = false
semanticProofDischarge = false
```

Therefore typed reference binding is not a completed typed AST, a Hoare proof, or vcgen/mvcgen discharge.

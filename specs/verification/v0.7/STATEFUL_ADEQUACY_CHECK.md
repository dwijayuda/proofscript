# Stateful State-Model Adequacy Check v1

Status: **implemented execution contract; concrete Lean evidence pending the next matrix run**

Schema:

```text
proofscript.stateful-adequacy-check/v1
```

## Purpose

A state-model descriptor names a semantic runner and an adequacy theorem. Merely
recording those names does not establish that the theorem relates the selected
weakest-precondition semantics to actual model execution.

This artifact generates a Lean theorem that uses those descriptor-bound
identities at the expected type.

## Current bounded shape

The first promoted shape is:

```text
stateM-wp-run-result/v1
```

and requires:

```text
lean.monadTypeConstructor = StateM <stateType>
```

Other monad shapes fail closed. Supporting them requires a separately specified
adequacy shape rather than heuristic source generation.

Conceptually the generated theorem has this form:

```lean
theorem __ps_state_model_adequacy_check
    {α : Type}
    {result : α × State}
    {program : StateM State α}
    {initial : State}
    (hRun : runner program initial = result)
    (P : α × State → Prop)
    (hWp : (⊢ₛ wp⟦program⟧
      (⇓ value final => ⌜P (value, final)⌝)
      initial)) :
    P result := by
  exact adequacyTheorem hRun P hWp
```

The actual state type, runner, theorem name, imports, and namespaces come from
the validated state-model binding.

## Execution order

The VC runner executes:

```text
model/import check
adequacy check
program typecheck
Triple target typecheck
proof request
```

If adequacy fails, later semantic stages are not promoted.

## Evidence claim

`stateModelAdequacyChecked = true` means:

- the selected Lean model environment loaded;
- the generated adequacy wrapper typechecked;
- the descriptor-bound runner and adequacy theorem can be used at the expected
  current `StateM` WP-to-run-result shape.

It does **not** mean:

- ProofScript source-to-Lean program equivalence was proved;
- the state model is a complete model of all runtime effects;
- exceptional/abrupt paths are covered;
- runtime/backend correspondence was proved;
- full Lean equivalence was established.

## Provenance

The generated source has a deterministic SHA-256 identity:

```text
generatedAdequacyCheckSha256
```

The proof matrix requires this identity to remain equal for the same canonical
case across compatibility lanes.

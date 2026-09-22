# Stateful Predicate Elaboration v1

Status: **typed binder/reference staging layer; whole-predicate semantic elaboration incomplete**

Schema:

```text
proofscript.stateful-predicate-elaboration/v1
```

This artifact is downstream of `proofscript.stateful-postcondition-ir/v1`. It adds model-specific type information without claiming that the complete postcondition proposition has been elaborated or proved.

## Typed binders

For a descriptor with state type `σ` and a program returning `State σ α`, the artifact records:

```text
__ps_entry : σ
__ps_result : α
__ps_final : σ
```

Program parameters retain their declared ProofScript types.

## State observations

For a descriptor observation:

```text
balanceOf : AccountId -> Bank -> Nat
stateArgument = last
```

the elaboration records:

```text
non-state inputs : [AccountId]
state input      : Bank
result           : Nat
```

The descriptor is rejected if the final observation input does not match the selected state type.

Observation references in normalized postconditions are checked for arity. Simple arguments whose types are directly knowable from program parameters or primitive literals are checked against descriptor input types. A definite mismatch is recorded as an error and prevents the strict structural profile.

Expressions outside this bounded reference layer may remain `unknown`; that does not become a proof claim.

## Current scope

The current layer can establish:

- explicit state/result binder types;
- selected state-model identity/provenance;
- observation signature shape;
- observation arity;
- simple parameter/literal argument type equality;
- result-reference binder type;
- propagation through contracts -> monadic lowering -> monadic preflight.

It does **not** establish:

- a fully typed predicate AST;
- elaboration of arbitrary ProofScript expressions;
- WP/Triple semantic equivalence;
- state-model runner adequacy;
- exceptional/abrupt-path coverage;
- generated verification conditions;
- vcgen/mvcgen discharge;
- checked proof terms;
- backend runtime correspondence.

Accordingly the artifact must keep:

```text
wholePredicateTypeCheckingComplete = false
wpTripleSemanticBindingComplete = false
stateModelAdequacyChecked = false
verificationConditionsGenerated = false
semanticElaborationComplete = false
vcgenConnected = false
semanticProofDischarge = false
```

The next semantic milestone should build a real typed predicate AST and bind it to the selected WP/Triple semantics before generating verification conditions.

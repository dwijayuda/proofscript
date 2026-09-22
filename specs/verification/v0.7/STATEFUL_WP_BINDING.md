# Stateful WP / Triple Identity Binding v1

Status: **typed predicate-to-model identity binding; semantic adequacy and VC generation incomplete**

Schema:

```text
proofscript.stateful-wp-binding/v1
```

This artifact is produced by the monadic lowering layer after:

```text
proofscript.stateful-postcondition-ir/v1
  -> proofscript.stateful-predicate-elaboration/v1
  -> proofscript.stateful-predicate-ast/v1
```

It makes the selected state-model verification identities and generated predicate shapes explicit in one inspectable artifact.

## Inputs

The binding consumes:

- the selected `proofscript.state-model.v1` descriptor;
- typed monadic `requires` predicates;
- typed normalized postcondition AST clauses;
- explicit entry/result/final-state binder types.

For the strict structural profile, both requirements and postconditions must typecheck to `Prop` in the bounded `stateful-predicate-expressions0` grammar before the binding may be marked ready.

## Bound identities

The artifact records, without proving:

- state type;
- WP/Triple constant identity;
- precondition semantic type;
- postcondition semantic type;
- state-model runner identity;
- state-model adequacy theorem identity.

Example shape:

```text
triple            = Std.Do.Triple
precondition kind = Bank -> Prop
postcondition kind= α -> Bank -> Prop
runner            = runBankState
adequacy theorem  = runBankState_adequate
```

## Predicate shape

The generated Triple skeleton must source its pre/post functions from this artifact rather than independently rebuilding them.

Conceptually:

```text
entry binder:
  (__ps_entry : Bank)

pre:
  fun __ps_initial : Bank =>
    __ps_initial = __ps_entry ∧ (<typed requires>)

post:
  fun __ps_result __ps_final =>
    <typed normalized postconditions>
```

The artifact hashes the predicate function sources and the typed predicate AST for provenance.

## Readiness

`bindingReady = true` means only:

1. required descriptor identities are present;
2. monadic requirements typecheck to `Prop` in the bounded predicate AST;
3. normalized postconditions typecheck to `Prop` in the bounded predicate AST;
4. pre/post function shapes and selected WP identities are bound in one artifact.

For `ps3-monadic-contracts0`, lowering fails closed if this invariant is violated.

## Explicit non-claims

The following remain false:

```text
wpTripleSemanticEquivalenceChecked = false
stateModelAdequacyChecked = false
exceptionalPathsCovered = false
verificationConditionsGenerated = false
vcgenConnected = false
semanticProofDischarge = false
```

Binding the identity `runBankState_adequate` is not the same as checking that theorem or proving the generated Triple.

The next milestone is generation of explicit semantic verification-condition artifacts from this binding, followed only later by vcgen/mvcgen or equivalent checked proof discharge.

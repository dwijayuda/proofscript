# Stateful Lean Semantic Encoding v1

Status: **explicit Std.Do / StateM semantic source encoding; not yet Lean-checked**

Schema:

```text
proofscript.stateful-lean-semantic-encoding/v1
```

Profile:

```text
std-do-statem-pure-predicate0
```

This artifact is the boundary between ProofScript's typed logical predicates and Lean's actual `Std.Do` Hoare-logic representation for `StateM`.

The earlier structural artifacts intentionally used simple logical shapes such as:

```text
Bank -> Prop
α -> Bank -> Prop
```

Those are useful source-level descriptions, but they are not themselves the concrete Lean `Assertion` and `PostCond` terms consumed by `Std.Do.Triple`.

For a state type `Bank`, a pure ProofScript precondition is encoded as:

```lean
fun __ps_initial : Bank => ⌜<pure proposition>⌝
```

and a pure postcondition as:

```lean
⇓ __ps_result __ps_final => ⌜<pure proposition>⌝
```

The corresponding semantic types are recorded as:

```text
Assertion (.arg Bank .pure)
PostCond ResultType (.arg Bank .pure)
```

The semantic Triple target is therefore constructed from the concrete `StateM` program plus these encoded assertions, not from the older plain-function approximation.

The artifact may be marked `encodingReady = true` when this bounded translation is structurally complete. It still records:

```text
leanEnvironmentResolved = false
leanProgramTypechecked = false
tripleTargetTypechecked = false
wpTripleSemanticEquivalenceChecked = false
stateModelAdequacyChecked = false
realVerificationConditionsGenerated = false
semanticProofDischarge = false
```

Only a real Lean run may advance those claims.

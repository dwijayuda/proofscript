# Stateful Verification-Condition Plan v1

Status: **inspectable VC planning/provenance artifact; semantic VC derivation incomplete**

Schema:

```text
proofscript.stateful-vc-plan/v1
```

This artifact is downstream of:

```text
stateful predicate AST
  -> stateful WP/Triple identity binding
  -> stateful VC plan
```

It does not claim that weakest-precondition reasoning has already derived proof obligations.

## Purpose

The plan makes the future semantic verification work explicit and stable before a tactic or proof engine is connected.

For each strict-profile monadic function it records:

- the overall `Std.Do.Triple` target;
- stable source obligation IDs;
- every used state operation and its bound Triple theorem identity;
- every typed postcondition clause;
- hashes of the typed predicate AST and generated pre/post predicates;
- whether all inputs required for semantic VC derivation are present.

## Planned goals

### Operation theorem applications

Each operation call records:

```text
operation index
operation name
call source
argument list
bound Triple theorem identity
source obligation ID/hashes
theoremChecked = false
semanticDerivationComplete = false
discharged = false
```

A theorem identity is provenance, not proof. The theorem must later be resolved and checked in the selected Lean environment.

### Typed postcondition goals

Each postcondition records:

```text
stable source obligation ID
normalized predicate
inferred type = Prop
predicate type-check status
source obligation hashes
semanticDerivationComplete = false
discharged = false
```

### Overall Triple goal

The plan records the exact target shape derived from the WP binding:

```text
Std.Do.Triple
  (<program application>)
  (<typed precondition>)
  (<typed postcondition>)
```

The target and its pre/post sources are hashed for provenance.

## Readiness

`planningReady = true` means:

1. the WP identity binding is ready;
2. all used operations have bound Triple theorem identities;
3. all postcondition goals are typed `Prop`;
4. every operation/postcondition goal maps to an existing stable source obligation.

This is enough to construct a semantic VC derivation request. It is not enough to say that semantic VCs have already been generated.

## Explicit non-claims

The plan must retain:

```text
semanticVcDerivationComplete = false
realVerificationConditionsGenerated = false
exceptionalPathsCovered = false
vcgenConnected = false
semanticProofDischarge = false
```

The next milestone is a Lean-facing VC derivation request/artifact that resolves the Triple/theorem identities in a real Lean environment and asks Lean's verification tooling to derive inspectable goals. Only successful checked output may advance `realVerificationConditionsGenerated`.

# Stateful Program Lowering v1

Status: **bounded deterministic Lean program lowering; semantic equivalence not yet checked**

Schemas:

```text
proofscript.stateful-operation-elaboration/v1
proofscript.stateful-program-lowering/v1
```

The operation-elaboration layer typechecks every modeled operation call against the selected state-model signature. The strict monadic profile fails closed on definite arity, argument-type, or monadic-return signature mismatches.

The program-lowering layer currently supports the bounded profile:

```text
stateful-flat-operation-sequence0
```

It covers a flat `do { ... }` sequence of modeled calls whose arguments are directly lowerable identifiers or primitive literals. Intermediate operations must return the selected state monad's `Unit`; the final operation must return the function's declared monadic return type.

For the current ProofScript verification extension, source types such as:

```text
State Bank Unit
```

are explicitly mapped to Lean:

```text
StateM Bank Unit
```

The artifact records both spellings and the mapping. This is required before the program can be used as the subject of a real `Std.Do.Triple`.

A ready artifact emits a deterministic definition such as:

```lean
def transfer (from : AccountId) (to : AccountId) (amount : Nat) : StateM Bank Unit := do
  debit from amount
  credit to amount
```

This removes the earlier program-body `admit` placeholder. It does **not** prove that the emitted program has been typechecked in the selected Lean environment or that it is semantically equivalent to runtime execution.

The following remain false until separately checked:

```text
leanProgramTypechecked = false
sourceToLeanProgramEquivalenceChecked = false
exceptionalPathsCovered = false
semanticProofDischarge = false
```

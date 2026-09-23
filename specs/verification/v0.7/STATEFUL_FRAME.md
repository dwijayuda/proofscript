# Stateful frame conditions — V-FRAME

Status: Product v1 bounded verification feature.

## Surface

```proofscript
function withdrawPreserving(from: AccountId, other: AccountId, amount: Nat): State Bank Unit
  requires distinct: from != other
  ensures debit: balanceOf(from) = old(balanceOf(from)) - amount
  frame other_unchanged: balanceOf(other) = old(balanceOf(other))
:= do {
  debit(from, amount);
}
```

The bounded surface is:

```text
frame <name>: <stateful predicate>
```

Frame clauses are allowed only in descriptor-bound monadic/stateful contracts in
the current profile.

## Meaning

A frame clause is an explicit proposition relating the entry state and final
state. It is **not** a hidden effect inference and not a modifies-set declaration.

The same state-binding rules as stateful postconditions apply:

- `old(e)` observes `__ps_entry`;
- an ordinary descriptor-bound state observation observes `__ps_final`;
- `result`, when otherwise admitted by the bounded predicate profile, denotes
  `__ps_result`;
- the predicate must typecheck as `Prop` in
  `stateful-predicate-expressions0`.

For example:

```text
frame other_unchanged: balanceOf(other) = old(balanceOf(other))
```

normalizes conceptually to:

```text
balanceOf(other, __ps_final) = balanceOf(other, __ps_entry)
```

and is conjoined with ordinary `ensures` clauses in the generated
`Std.Do.Triple` postcondition.

## Artifact identity

The source distinction is retained even though the final Triple postcondition is
a conjunction.

A frame clause appears as:

- `functions[].frames[]` and top-level `frames[]` in
  `proofscript.contracts.v1`;
- `kind = frame` in `proofscript.stateful-postcondition-ir/v1`;
- `kind = frame` in `proofscript.stateful-predicate-elaboration/v1`;
- `kind = frame` in `proofscript.stateful-predicate-ast/v1`;
- a frame-kind postcondition clause in `proofscript.stateful-wp-binding/v1`;
- a stable `monadic.frame` source obligation;
- a `typed-frame-goal` in `proofscript.stateful-vc-plan/v1`.

This distinction is required for diagnostics, proof provenance, and future
effect/frame tooling.

## Runtime

Frame clauses are verification metadata. They do not add function parameters,
runtime assertions, hidden state writes, or executable body statements.

## Fail-closed rules

The current profile rejects or downgrades frame use when:

- the frame clause is unnamed;
- its label collides with another `ensures` or `frame` label;
- its predicate is outside the bounded stateful predicate grammar;
- a descriptor-bound observation has a definite type/signature mismatch;
- `old(...)` contains an unclassified call;
- required state operations or their Triple theorem identities are missing.

## Non-goals

V-FRAME v0 does not claim:

- automatic inference of every untouched state location;
- a general heap separation logic;
- a modifies/read/write footprint calculus;
- alias analysis;
- source-to-Lean program equivalence;
- exceptional-path coverage;
- profile-wide proof discharge.

A concrete frame theorem may be promoted to proved only from the same real Lean
execution evidence used for the surrounding generated Triple, including the
state-model adequacy gate.

## Executable gates

Static:

```text
npm run test:ps3:stateful-frame
npm run test:ps3:monadic-contracts
npm run test:ps3:stateful-lean-proof-matrix
npm run test:ps3:stateful-endtest
```

Proof-required:

```text
npm run assurance:ps3:stateful-lean-frame-vc:proof
npm run assurance:ps3:stateful-lean-proof-matrix -- --toolchains <lanes>
```

The proof matrix now plans three semantic cases per Lean lane: debit, transfer,
and frame.

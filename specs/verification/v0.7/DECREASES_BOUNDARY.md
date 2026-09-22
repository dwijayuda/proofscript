# PS3 termination / decreases boundary

Status: design decision for the v0.7 verification track.

## Decision

ProofScript does **not** introduce a second general-purpose recursive-termination language through `V-DECREASES`.

Recursive function termination remains part of the Lean-compatible language/elaboration surface:

```text
termination_by <measure>
termination_by structural <parameter>
termination_by?
decreasing_by { ... }
```

Those constructs justify recursive definitions and must retain their Lean meaning. They are not contract clauses and must not be reinterpreted as verification metadata.

## Existing KA142 prototype

The current `packages/contracts` prototype also recognizes:

```text
while (<condition>)
  invariant <name>: <proposition>
  decreases <name>: <expression>
{
  ...
}
```

That syntax is loop-verification work from KA142. It is intentionally **not** promoted into the `ps3-pure-contracts0` profile yet.

Artifacts containing those loop clauses are classified as:

```json
{
  "profile": "ka142-loop-prototype",
  "reference": null,
  "claim": "prototype-only"
}
```

They must not claim `V-INVARIANT` or `V-DECREASES` conformance until the loop/state semantics are specified.

## v0.7 direction

For v0.7:

1. Recursive-function termination uses Lean-compatible `termination_by` / `decreasing_by`.
2. The verification registry does not duplicate those semantics with a generic contract-level `decreases` clause.
3. A loop progress measure may later be registered together with `V-INVARIANT`, after the state model, loop transition semantics, initialization/preservation/exit obligations, and measure-decrease obligation are defined.
4. If a stable verification feature ID is needed for that later loop measure, `V-DECREASES` may be retained as the ID, but its scope must explicitly be loop verification rather than recursive-definition termination.

## Why

Keeping the boundary explicit avoids two incompatible meanings for “termination”:

- language elaboration proving a recursive definition is admissible; and
- program verification proving a loop measure decreases across state transitions.

Both ultimately require checked proof obligations, but they are generated at different semantic layers and should not be conflated.

## Current gate

The PS3 regression suite must prove that a KA142 loop contract is labeled as prototype-only and cannot silently acquire a `ps3-pure-contracts0` claim.

# Stateful control-flow verification boundary

Status: **explicit fail-closed boundary for `ps3-monadic-contracts0`**

## Why this boundary exists

The promoted stateful verifier currently has a precise semantic path for:

```text
StateM program
  = linear sequence of descriptor-bound state operations
  → typed operation elaboration
  → deterministic Lean StateM lowering
  → Std.Do.Triple
  → mvcgen
  → Lean proof evidence
```

It does not yet have a path-sensitive semantics for arbitrary branching,
early return, exceptions, loop control, or exception handlers.

Those constructs must therefore not be accidentally certified by the current
stateful profile.

## Current strict policy

The contract artifact records:

```text
controlFlowPolicy = linear-modeled-operation-sequence-only
exceptionalPathsCovered = false
```

Only operations declared by the selected state-model descriptor may participate
in the strict operation sequence.

The following control-flow heads are outside the current strict stateful
verification profile unless a future semantic lowering explicitly models them:

- `if`;
- `match`;
- `return`;
- `throw`;
- `try` / exception handling;
- `break`;
- `continue`.

The active ProofScript language may support inherited Lean control-flow/effect
constructs in other profiles. This document does **not** redefine their language
semantics and does not ban them from general-purpose ProofScript.

## Fail-closed behavior

If one of these constructs appears inside the current monadic-contract body, it
does not fall through as an opaque verified statement.

The bounded operation parser exposes the leading construct as an operation
candidate. Because it is not a descriptor-bound modeled operation, strict
profile admission fails with:

```text
undeclared-state-operation
```

and the contract remains prototype-only.

This is an explicit verification-profile exclusion, not proof coverage.

## What `exceptionalPathsCovered = false` means

Even a successful generated theorem for a linear program does not establish
properties about hypothetical exception paths.

A report must therefore continue to retain:

```text
exceptionalPathsCovered = false
```

until a future profile introduces a real exceptional/control-flow semantics and
checks every relevant path.

## Product-v1 completion rule

For Product v1 verification, exceptional/control-flow behavior is considered
**explicitly excluded from the strict stateful proof profile**, not silently
ignored.

This is sufficient to make the current verification boundary sound and
understandable while general-purpose language/runtime control flow is developed
under its own product pillars.

## Executable gate

```text
npm run test:ps3:stateful-control-flow-boundary
```

The gate checks `if`, `match`, `return`, `throw`, `try`, `break`, and
`continue` examples and requires each to remain outside
`ps3-monadic-contracts0`. It also checks that an ordinary linear modeled
operation sequence still enters the strict profile.

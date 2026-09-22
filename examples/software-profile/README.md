# ProofScript Software Profile executable examples — P5.96

This directory contains small executable examples for **ProofScript Software Profile v0**.

The point is practical: show that the Go-small correctness profile is not only a document. These examples exercise currently implemented slices of the language: total functions, Nat/Bool/String, structures, simple inductives, `if`, `match`, Option/Except-style explicit errors, List/Array helpers, small theorem statements, JS emission, and TypeScript emission.

This is **not a full Lean 4 equivalence claim**. It is a controlled software-profile demonstration on top of the P5.94 kernel/checker evidence and the P5.95 profile plan. Contracts with `requires`, `ensures`, `assert`, and loop invariants remain planned/deferred profile features until their elaboration and verification gates exist.

## Files

- `BusinessRules.ps` — pricing/discount arithmetic and Nat subtraction clamping.
- `StateMachine.ps` — order workflow encoded as an inductive state machine.
- `SecurityPolicy.ps` — role/action permission matrix.
- `Validation.ps` — explicit validation result with `Except(String, Nat)`.
- `Collections.ps` — finite List/Array filter/find/any examples.

Run:

```bash
npm run test:profile:software:examples
```

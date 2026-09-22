# Production P5.10 Minimal Int Arithmetic Feature Report

P5.10 extends the canonical PSC-1 Int slice with bounded primitive arithmetic through the existing architecture: checked bootstrap declarations for `Int.neg`, `Int.add`, `Int.sub`, and `Int.beq`; trusted K3-TB kernel reduction only when arguments reduce to explicit Core `lit.int` values; JS/TypeScript BigInt execution helpers; focused positive and negative tests; and governance/traceability updates.

Supported behavior:

- `Int.neg(5)` reduces to `-5`.
- `Int.add(-2, 5)` reduces to `3`.
- `Int.sub(-2, 5)` reduces to `-7`.
- `Int.beq(-3, Int.neg(3))` reduces to `Bool.true`.
- `Int.beq(-3, 3)` reduces to `Bool.false`.
- JS/TypeScript emission uses runtime helpers after checked Core.
- Bad Nat/Bool payloads fail before emission.

Deferred behavior: overloaded Int infix operators, Int ordering, conversion APIs, real Lean `Int.ofNat` / `Int.negSucc` internals, arbitrary-precision serialized literals beyond host safe integers, typeclass `OfNat`/`Neg`, and formal Lean 4 equivalence.

Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

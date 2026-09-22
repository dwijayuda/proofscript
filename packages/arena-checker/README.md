# @proofscript/arena-checker

Small Lean Kernel Arena NDJSON adapter for the ProofScript TypeScript kernel.

Status: **P5.78 arena-tutorial-harness0 skeleton / partial**.

It accepts a tiny initial lean4export 3.1.0 subset: metadata, names, universe levels, core expressions, axioms, safe definitions, theorems, and safe opaques that translate into the existing ProofScript trusted-boundary Core. It rejects malformed or semantically invalid input with exit code `1`, and it declines unsupported but well-formed records such as inductive and quotient exports with exit code `2`.

This package is K3-TB trusted-boundary evidence only. It is not fully formal K3 and it does not prove full Lean 4 equivalence.

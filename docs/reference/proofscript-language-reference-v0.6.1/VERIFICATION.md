# Verification Status — ProofScript Language Reference v0.6.1

## Specification status

v0.6.1 is an **S1 specified** compiler-ready reference package. It adds conformance data and implementation contracts but does not claim machine-checked Lean proofs.

## Static verification performed

The static verification script checks:

- required reference documents exist;
- v0.6.1 version strings are coherent;
- Lean 4.33.1 baseline is present;
- L/D/E/X model is present;
- `const` and `function` aliases are documented;
- conformance registry JSON parses;
- feature IDs are unique;
- conformance cases reference registered feature IDs or explicit X-class negative families;
- lowering cases include canonical Lean expectations;
- no unresolved placeholder markers remain.

## Claim ceiling

The package remains S1 until exact Lean 4.33.1 executes the reference parser/lowering proofs.

The required pinned Lean baseline remains:

```text
Lean 4.33.1
commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6
```

## Current known unproved areas

- real Lean parser-category lifting;
- D-CALL machine proof against actual Lean syntax;
- declaration-alias machine proof;
- all E-class parser/lowering proofs;
- production TypeScript frontend refinement;
- source-map/diagnostic correctness;
- formal checker connection.

# KA-12 direct Lean4Lean reference plan

## Goal

Create `proofscript-v1-ka12-direct-lean4lean-reference0` from the valid KA-12 binding checkpoint without changing trusted PSKernel semantics, Core format, certificate format, or codec behavior.

## Steps

1. Preserve the existing KA-12 direct Lean4Lean binding gate as an internal prerequisite.
2. Add the requested `direct-reference` artifact names:
   - `assurance/ka12/direct-lean4lean-reference.lean`
   - `assurance/ka12/direct-reference-binding.json`
   - `tools/pskernel-ka12-direct-reference.ts`
   - `tools/pskernel-ka12-direct-reference-tests.ts`
3. Add script aliases required by the handoff: `test:pskernel:ka12`, `assurance:ka12`, `lean:ka12:check`, and `lean:ka12:check:soft`.
4. Keep the Lean file importing real `Lean4Lean.Theory.VDecl` and checking real `Lean4Lean.VLevel`, `VExpr`, and `VDecl` structures.
5. Keep formal Lean4 equivalence proven obligations at `0` unless an actual theorem obligation is machine-checked.
6. Run the KA-1 through KA-12 assurance/test gates plus strict direct Lean4Lean checks and package a final checkpoint ZIP.

## Non-goals

- No PSKernel semantic change.
- No Core format change.
- No codec change.
- No full Lean 4 equivalence claim.
- No same-theory claim.

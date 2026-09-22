# Production P4.93 — Elaborator Proof Extraction

## Summary

P4.93 continues the production-grade architecture cleanup after P4.92 by extracting proof-term elaboration out of the monolithic `packages/elaborator/src/index.ts` file.

This is a behavior-preserving refactor. It does not change ProofScript syntax, kernel rules, checked bootstrap declarations, backend emission, or runtime semantics.

## Main change

New module:

- `packages/elaborator/src/proofElaborator.ts`

The module now owns PSC-1 proof elaboration for:

- `by rfl`
- `by exact ...`
- `by assumption`
- `by apply ...`
- `by intro ...`

The main elaborator delegates proof terms through a narrow `ProofElaborationHost` interface.

## Why this improves production-grade architecture

Before P4.93, ordinary term elaboration and proof elaboration were interleaved in `index.ts`. This made it risky to add new proof features, because every change touched the largest and most central elaborator file.

After P4.93:

- proof elaboration has a focused ownership boundary;
- recursive calls back into ordinary term elaboration are explicit through `ProofElaborationHost`;
- `index.ts` remains the orchestrator instead of owning every proof rule directly;
- future proof features can be added without expanding the central file further.

## Trust-boundary status

P4.93 remains K3-TB: trusted-boundary K3, not fully formal K3. No Lean 4 equivalence obligations are proven by this slice.


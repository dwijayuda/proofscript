# Production P4.12 — Deep TypeChecker + Admission Boundary Batch

## Status

Completed a deeper batched kernel hardening pass instead of another 1–2% metadata-only slice.

## Trust label

ProofScript pskernel-derived TypeScript kernel — trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet.

## Scope

This pass deepens the active TypeScript kernel in three related areas:

1. proof-irrelevance in definitional equality for proposition-typed terms;
2. constructor codomain universe validation against declared inductive universe parameters;
3. conservative uniform constructor target-parameter checking for parameterized/indexed families.

## Changes

### TypeChecker / definitional equality

- Added conservative proof-irrelevance to `isDefEqCore`.
- Two terms are definitionally equal by proof irrelevance only when:
  - both terms can be inferred;
  - their inferred types are definitionally equal without recursively using proof irrelevance;
  - the shared type itself infers to `Prop` / `Sort 0`.
- Unsupported or ill-typed proof-irrelevance candidates fail closed and return ordinary non-equality.
- Existing structural, β, ζ, δ, recursor-iota, and universe-level defeq paths are preserved.

### Inductive/constructor admission

- Added constructor codomain universe-argument validation:
  - a constructor targeting family `F.{u ...}` must use the declared family universe parameters;
  - non-uniform levels such as targeting `F.{0}` for a family declared over `u` are rejected.

- Added conservative uniform family-parameter validation:
  - constructor codomain parameters must be the leading family telescope binders in order;
  - swapped or non-uniform constructor parameter applications are rejected;
  - index arguments remain intentionally more permissive for now, but advanced indexed recursor behavior remains fail-closed elsewhere.

### Smoke coverage

Added red/green smoke checks for:

- proof irrelevance between two axiom proofs of the same proposition;
- rejection of constructor codomain with wrong family universe arguments;
- rejection of constructor codomain with swapped family parameters.

Also fixed an accidental duplicate smoke block while keeping all existing checks intact.

## Commands run

```bash
npm install --ignore-scripts
npm run build -- --pretty false
npm run test:kernel:smoke   # observed RED on new proof-irrelevance test
npx tsc -b --pretty false
npm run test:kernel:smoke   # observed GREEN after implementation
```

Final verification commands are recorded in the chat response for this milestone.

## Supported after this pass

- Proof irrelevance for same-proposition proof terms in the trusted core slice.
- Constructor target universe-level uniformity.
- Constructor target parameter-order uniformity for leading family parameters.

## Still unsupported / fail-closed

- Full Lean recursor typing/reduction for parameterized, indexed, mutual, nested, and dependent-family inductives.
- Full Lean positivity checker.
- Full Lean `.olean` replay.
- Full macro/elaborator/parser standalone conformance.
- Formal equivalence to Lean 4 native kernel.

## Progress update

- Phase 0: complete
- Phase 1: complete
- Phase 2: ~96% complete
- Phase 3: ~68% started
- Phase 4: ~70% started
- Phase 5: ~40% started
- Phase 6: ~34% started
- Overall: ~62%

The larger progress jump is justified by a deeper batched change in core definitional equality plus inductive admission, not by metadata-only scaffolding.

# KA-46 projection-reduction refinement bridge preflight plan

Goal: add a narrow, modular projection-reduction bridge scaffold against Lean4Lean without changing PSKernel trusted semantics, Core format, certificate format, or kernel codec behavior.

Boundary:

- Full Lean4 equivalence: no.
- Same theory as full Lean4: no.
- Fully formal K3: no.
- Executable PSKernel refinement proof: no.
- Trusted PSKernel semantic change: no.
- Core format change: no.

Implemented in this preflight:

1. A focused Lean module naming the intended Lean4Lean projection-reduction bridge lemmas.
2. A focused TypeScript gate that checks files, release metadata, source-bound Lean4Lean theorem surface, anti-spaghetti constraints, and reports the formal-check blocker honestly.
3. A focused test for the gate.
4. KA-46 report, release gate, verification summary, bridge spec, and progress JSON/MD.

Formal promotion condition: provide the offline Batteries v4.33.0-rc2 dependency and pass `lake env lean PSKernelKA46ProjectionReductionRefinementBridge.lean` against actual Lean4Lean.

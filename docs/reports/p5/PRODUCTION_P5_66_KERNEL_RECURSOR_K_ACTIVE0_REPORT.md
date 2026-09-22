# P5.66 Kernel Recursor K Active Report

P5.66 is a bounded trusted-boundary kernel improvement. It does not add a PSC-1 surface feature and does not claim ProofScript is the same full theory as Lean 4. The release activates Lean 4.33.1 `RecursorVal.k` K-like reduction in the active PSKernel-derived TypeScript kernel for eligible nullary singleton propositions.

## Semantic change

The reducer now re-derives K eligibility from the checked environment: the target family must live in `Prop`, have exactly one constructor, and that constructor must have zero non-parameter fields. For an arbitrary proof major, the kernel infers the major type, reconstructs the unique nullary constructor from the major type parameters and recursor universe levels, and only reduces when the reconstructed constructor type is definitionally equal to the actual major type. This keeps mismatched Eq-like indices stuck while allowing matching or definitionally equal indices.

## TDD evidence

`tools/kernel-recursor-k-tests.ts` failed on P5.65 at the first `True.rec` arbitrary-proof reduction assertion. After the implementation it passes with exact Lean 4.33.1, including True-like K reduction, Eq-like matching-index reduction, definitional-index reduction, mismatched-index non-reduction, field-bearing singleton non-K behavior, bound-proof-variable reduction, replay, and historical-profile isolation.

## Trust boundary

K3-TB trusted-boundary remains yes. Fully formal K3 remains no. Full Lean 4 equivalence remains no. Formal Lean 4 equivalence proven obligations remain 0.

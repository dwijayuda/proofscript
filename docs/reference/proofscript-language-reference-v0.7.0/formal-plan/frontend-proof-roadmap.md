# Frontend Proof Roadmap

## Phase 0 — Baseline

- Pin ProofScript reference v0.6.1.
- Pin Lean 4.33.1 and commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`.
- Record feature registry and axiom policy.

## Phase 1 — D-CALL

- Implement reference parser for adjacency-based call syntax.
- Prove call lowering equations.
- Test protected neighbor cases.

## Phase 2 — Declaration aliases

- Implement contextual `const` and `function` aliases.
- Prove lowering to `def`.
- Reject invalid alias shapes.

## Phase 3 — Category lifting

- Define exact lifted term-child positions for key Lean productions.
- Prove recursive composition examples such as `fun x => f(x)` and match discriminants with calls.

## Phase 4 — First E feature

- Implement E-IF-BRACE.
- Prove one-term branch restriction and lowering.

## Phase 5 — Structural E bodies

- Structure/class, inductive, match, and local where bodies.
- Preserve member/constructor/alternative order and Lean child categories.

## Phase 6 — Production refinement

- Compare TypeScript production frontend with Lean reference frontend under `SyntaxEq`, `NormalizedSyntaxEq`, or `ElabEq`.

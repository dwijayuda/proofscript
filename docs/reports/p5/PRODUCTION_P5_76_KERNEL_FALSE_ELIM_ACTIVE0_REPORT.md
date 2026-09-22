# Production P5.76 — Kernel False Elim Active 0

Status: frozen after final source-archive and fresh-extract validation.

## Feature

P5.76 installs Lean-style `False` and `False.elim` in the canonical primitive prelude.

```text
False : Prop
False.elim.{u} : {C : Sort u} → False → C
```

## Implementation choice

- `False` is represented as the canonical empty proposition.
- The existing empty-inductive machinery generates `False.rec`.
- `False.elim` is a checked reducible definition derived from `False.rec`.
- `False.elim` is not a new trusted axiom.
- No kernel-codec format change is introduced.

## TDD evidence

RED on P5.75: the focused test failed because `falseDeclaration` / `falseElimDefinition` were missing from the active kernel primitive slice.

GREEN candidate: `npm run test:kernel:false-elim-active0` prints `KERNEL_FALSE_ELIM_ACTIVE0=PASS exact-lean=PASS` with Lean 4.33.1 commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`.

## Trust boundary

K3-TB trusted-boundary only. This release does not claim fully formal K3, full Lean 4 equivalence, or ProofScript same theory as full Lean 4. Formal Lean 4 equivalence proven obligations remain 0.

## Final verification summary

- Build: PASS.
- Focused `test:kernel:false-elim-active0`: PASS with exact Lean.
- Inherited kernel/prelude gates through P5.75: PASS in bounded reruns; timed-out wrappers were not counted.
- Architecture/status/traceability gates: PASS.
- Conformance positive and negative corpora: PASS through direct per-file reruns after the wrapper timed out.
- Exact Lean differential: 25/25 accepted through bounded reruns.
- Fresh-extract validation: PASS.

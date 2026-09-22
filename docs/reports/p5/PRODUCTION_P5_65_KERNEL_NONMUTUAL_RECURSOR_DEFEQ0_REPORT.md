# P5.65 Kernel Non-Mutual Recursor DefEq Report

P5.65 is a bounded trusted-boundary kernel improvement. It does not add a PSC-1 surface feature and does not claim that ProofScript is the same theory as full Lean 4. The release improves the active PSKernel-derived TypeScript kernel so the audited non-mutual inductive slice no longer falls back to a stubbed recursor when recursive constructor-field parameters are definitionally equal to the uniform family parameter through `let`/zeta normalization.

## Added kernel behavior

- Typed recursor synthesis for the admitted non-mutual direct-recursive slice.
- Typed indexed recursor synthesis for the admitted one-family indexed slice.
- Runtime iota reduction for direct and indexed recursive fields using recursive-field metadata.
- Pointwise induction-hypothesis construction for admitted higher-order positive indexed fields.
- Constructor-field universe checking for non-`Prop` inductive result universes, with `Prop` impredicativity and uniform-parameter exemption preserved.

## TDD evidence

The focused test `tools/kernel-nonmutual-recursor-defeq0-tests.ts` was written first and failed on P5.64 because the active kernel generated `status: "stubbed"` for `Impl.R.rec` and left the recursor application stuck. After the implementation, the focused test passes and its exact Lean 4.33.1 probe accepts the corresponding `rfl` reduction.

## Verification

Required gates include `npm run build`, `npm run test:kernel:nonmutual-recursor-defeq0`, `npm run test:differential`, `npm run verify:k3tb:publish`, governance/status/traceability checks, fresh-extract build, and focused smoke tests.

## Non-claims

- Fully formal K3: NO.
- Full Lean 4 equivalence: NO.
- ProofScript is the same theory as Lean 4: NO.
- Formal Lean 4 equivalence proven obligations: 0.

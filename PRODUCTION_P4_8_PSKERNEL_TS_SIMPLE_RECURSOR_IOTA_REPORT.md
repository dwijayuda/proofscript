# Production P4.8 — pskernel TypeScript Simple Recursor Iota Reduction

## Status

PASS — implemented a conservative iota-reduction slice for generated `typed-simple-nonindexed` recursors.

## Trust label

ProofScript pskernel-derived TypeScript kernel; trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet.

## Scope

This pass extends the Phase 4.7 recursor type synthesis slice with matching reduction behavior for the same intentionally narrow family of recursors.

Supported now:

- recursor constant metadata status is `typed-simple-nonindexed`;
- the recursor is fully applied to motive, one minor premise per constructor, and a major premise;
- the WHNF major premise has a constructor head recorded in recursor metadata;
- the constructor is fully applied to exactly the recorded field count;
- direct recursive fields receive recursive-call induction hypotheses.

Still unsupported / fail-closed or neutral:

- indexed recursors;
- parameterized recursors;
- mutual recursors;
- nested/container positivity recursors;
- dependent constructor field recursor synthesis beyond the current simple slice;
- arbitrary hand-authored recursor metadata;
- general Lean recursor reduction parity.

## Files changed

- `packages/kernel/src/PSKernel/Inductive/Reduce.ts`
  - replaced the stub-only reducer with `tryInductiveReduceRec(...)`;
  - retained `inductiveReduceRec()` as a fail-closed general reducer marker;
  - updated port status from `stubbed` to `partial`.

- `packages/kernel/src/PSKernel/TypeChecker.ts`
  - integrated simple recursor iota reduction into `whnfCore(...)` before ordinary head WHNF/beta processing.

- `packages/kernel/src/PSKernel.ts`
  - exported `PSKernel/Inductive/Add` and `PSKernel/Inductive/Reduce` through the active kernel entrypoint.

- `tools/pskernel-kernel-smoke.ts`
  - added smoke checks for Unit-like zero-field recursor iota reduction;
  - added smoke checks for `Nat.rec` zero and succ iota behavior.

## Fresh verification

Commands run:

```bash
npm run build -- --pretty false
npx tsc -b --force --pretty false
node tools/copy-static-assets.ts
npm run test:kernel:smoke
npm run pskernel -- status
npm run pskernel -- check-core artifacts/pskernel-cli-check-core-smoke.json cli-smoke
```

Results:

```txt
build: PASS
forced tsc rebuild: PASS
copy static assets: PASS
test:kernel:smoke: PASS
pskernel status: PASS
pskernel check-core: PASS
```

## Progress

- Phase 0: complete
- Phase 1: complete
- Phase 2: ~94% complete
- Phase 3: ~53% started
- Phase 4: ~55% started
- Phase 5: ~35% started
- Phase 6: ~32% started
- Overall: ~51%

## Next best step

Implement stricter type-aware recursor application checking for the simple slice, or add projection reduction for simple single-constructor structures. Recursor application checking is the better next trust-boundary step because it prevents iota behavior from becoming merely untyped computation.

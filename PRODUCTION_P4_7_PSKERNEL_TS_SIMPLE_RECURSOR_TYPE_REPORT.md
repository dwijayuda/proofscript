# Production P4.7 — pskernel TypeScript Simple Recursor Type Synthesis

## Status

PASS. This pass replaces the previous fail-closed placeholder for the smallest safe recursor slice with a synthesized type for simple non-indexed, non-parameterized inductives.

## Trust label

ProofScript pskernel-derived TypeScript kernel; trusted-boundary standalone; not fully formally equivalent to Lean 4 yet.

## Scope implemented

Implemented conservative recursor type synthesis for:

- one non-mutual inductive family;
- zero parameters;
- zero indices;
- constructor codomain exactly targeting the family with zero target arguments;
- nondependent constructor field domains;
- direct positive recursive fields, with generated induction-hypothesis premises.

Examples now covered by smoke tests:

- `UnitLike.rec` type synthesis for a zero-field constructor;
- `ClosedRecursorFamily.rec` type synthesis;
- `PositiveRecursiveMeta.rec` type synthesis with a direct recursive field;
- primitive `Nat.rec` type synthesis from `Nat.zero` and `Nat.succ`.

## Explicit fail-closed scope

Still unsupported and fail-closed:

- parameterized recursor type synthesis;
- indexed recursor type synthesis;
- mutual recursor type synthesis;
- nested/container-recursive recursor type synthesis;
- dependent constructor field recursor synthesis;
- recursor reduction/iota computation;
- Prop-elimination restrictions and K/no-confusion generation;
- full Lean recursor universe minimization/parity proof.

## Files changed

```txt
packages/kernel/src/PSKernel/Declaration.ts
packages/kernel/src/PSKernel/Environment/Basic.ts
tools/pskernel-kernel-smoke.ts
docs/PROOF_OBLIGATIONS.md
PSKERNEL_TS_KERNEL_REWRITE_REPORT.md
```

## Implementation notes

- `synthesizeSimpleRecursorType(...)` creates a conservative eliminator type for the supported slice.
- Generated recursor constants now receive a real `type` when the supported slice applies.
- Generated recursor checked entries mirror the same synthesized type.
- Metadata status is now `typed-simple-nonindexed` for typed recursors and `stubbed` otherwise.
- Parameterized/indexed/mutual recursors continue to have no type and therefore still raise `KernelUnsupportedError` on inference/use.

## Commands run

```bash
npm run build -- --pretty false
npm run test:kernel:smoke
npx tsc -b --force --pretty false
node tools/copy-static-assets.ts
npm run test:kernel:smoke
npm run pskernel -- status
npm run pskernel -- check-core artifacts/pskernel-cli-check-core-smoke.json cli-smoke
```

## Results

```txt
npm run build: PASS
npm run test:kernel:smoke: PASS
forced tsc rebuild: PASS
pskernel status: PASS
pskernel check-core: PASS
```

## Progress

```txt
Phase 0: complete
Phase 1: complete
Phase 2: ~94% complete
Phase 3: ~50% started
Phase 4: ~52% started
Phase 5: ~30% started
Phase 6: ~32% started
Overall: ~48%
```

## Next best step

Implement fail-closed recursor reduction/iota for the same simple non-indexed slice, after adding one minimal smoke fixture that reduces a `UnitLike.rec` or `Nat.rec` application.

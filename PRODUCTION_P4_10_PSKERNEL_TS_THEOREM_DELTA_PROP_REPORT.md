# Production P4.10 — pskernel TS theorem Prop + theorem delta hardening

## Trust label

ProofScript pskernel-derived TypeScript kernel; trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet.

## Goal

Align two declaration/typechecker behaviors with `pskernel` before expanding the accepted language:

1. Theorem declarations must prove propositions (`Prop`), not arbitrary `Type` terms.
2. Theorem constants must participate in delta reduction just like pskernel's `ConstantInfo.deltaValue?` design, which includes definitions and theorems but excludes opaques.

## Files changed

```txt
packages/kernel/src/PSKernel/Environment.ts
packages/kernel/src/PSKernel/TypeChecker.ts
tools/pskernel-kernel-smoke.ts
PSKERNEL_TS_KERNEL_REWRITE_REPORT.md
```

## Implementation details

- `addTheorem` now checks that the theorem/example type is a proposition by inferring the type of the declared type and requiring definitional equality with `Prop` (`Sort 0`).
- `TypeChecker.deltaValue` now returns theorem values as delta-reducible values, matching the pskernel `ConstantInfo.deltaValue?` behavior.
- Opaque declarations remain non-delta-reducible.
- Added smoke coverage for rejecting `theorem badNatTheorem : Nat := Nat.zero`.
- Added smoke coverage that `whnf(pThm)` delta-unfolds to the theorem value `pAx`.

## Red-green evidence

Before implementation, the new theorem Prop guard test failed:

```txt
AssertionError: theorem declarations must prove Prop, not arbitrary Type terms
actual: accepted
expected: rejected
```

After implementation, verification passed.

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
build: PASS
smoke: PASS
forced tsc rebuild: PASS
copy static assets: PASS
pskernel status: PASS
pskernel check-core: PASS
```

## Supported after this pass

```txt
Theorem type Prop guard
Theorem delta unfolding in whnf/defeq paths
Opaque non-unfolding preserved
```

## Still unsupported / fail-closed

```txt
Full theorem task handling
Proof irrelevance beyond current defeq slice
Full theorem/opaque transparency modes
Full Lean theorem declaration metadata parity
Full formal proof of theorem delta correctness
```

## Progress

```txt
Phase 0: complete
Phase 1: complete
Phase 2: ~94% complete
Phase 3: ~57% started
Phase 4: ~61% started
Phase 5: ~37% started
Phase 6: ~32% started
Overall: ~55%
```

## Next best step

Add a conservative transparency/reducibility policy so definition/theorem unfolding can be controlled closer to pskernel's checker modes while opaques remain closed.

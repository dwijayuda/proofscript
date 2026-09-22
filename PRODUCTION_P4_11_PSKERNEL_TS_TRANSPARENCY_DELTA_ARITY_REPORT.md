# Production P4.11 — pskernel TS transparency and delta-arity guard

## Trust label

ProofScript pskernel-derived TypeScript kernel; trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet.

## Goal

Add the next conservative typechecker alignment layer before expanding the accepted language:

1. Thread an explicit transparency mode through the active `TypeChecker` instance and standalone `whnf`/`defEq` helpers.
2. Keep opaque declarations closed even under the broadest current transparency mode.
3. Prevent delta reduction from unfolding malformed constants whose universe argument count does not match the declaration's universe-parameter arity.

## Files changed

```txt
packages/kernel/src/PSKernel/TypeChecker.ts
tools/pskernel-kernel-smoke.ts
PSKERNEL_TS_KERNEL_REWRITE_REPORT.md
```

## Implementation details

- Added exported `TransparencyMode = "reducible" | "default" | "all"`.
- The `TypeChecker` class now uses its configured transparency mode for `infer`, `check`, `whnf`, and `isDefEq` instead of ignoring the option.
- Added public helpers:
  - `whnfWithTransparency(env, ctx, term, transparency)`
  - `defEqWithTransparency(env, ctx, left, right, transparency)`
- Conservative unfolding policy:
  - `abbrev` definitions unfold at `reducible`, `default`, and `all`.
  - `regular` definitions unfold at `default` and `all`, not `reducible`.
  - theorem values unfold at `default` and `all`, preserving the earlier pskernel `deltaValue?` alignment for normal checking.
  - opaque values never unfold in this trusted slice.
- `whnfCore` now checks constant universe-argument arity before unfolding a delta value.
- `unfoldDefinition` now also refuses to unfold when universe-argument arity is malformed.

## Red-green evidence

The new malformed-universe delta test failed before rebuilding the changed kernel output because stale `dist` still unfolded `regularTA.{0}` to `ta`. After rebuilding, the test passed with the new arity guard.

## Commands run

```bash
npm run test:kernel:smoke
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
initial smoke before rebuild: FAIL as expected on stale dist/new test mismatch
build: PASS
smoke after build: PASS
forced tsc rebuild: PASS
copy static assets: PASS
smoke after forced rebuild: PASS
pskernel status: PASS
pskernel check-core: PASS
```

## Supported after this pass

```txt
Explicit TypeChecker transparency option
Standalone transparency-aware whnf/defEq helpers
Abbrev-vs-regular definition unfolding distinction
Theorem unfolding at default/all transparency
Opaque non-unfolding preserved
Delta arity guard for malformed constant universe applications
```

## Still unsupported / fail-closed

```txt
Full Lean transparency lattice
implicit/instance transparency modes from Lean 4.33
Kernel proof that the transparency policy exactly matches native Lean
Unfolding opaque values
Metavariable-bearing universe instantiations
Full recursor transparency/optimization behavior
```

## Progress

```txt
Phase 0: complete
Phase 1: complete
Phase 2: ~95% complete
Phase 3: ~61% started
Phase 4: ~64% started
Phase 5: ~37% started
Phase 6: ~32% started
Overall: ~57%
Trust label: trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet
```

## Next best step

Add conservative proof-irrelevance for proposition-typed terms in definitional equality, while keeping it restricted to terms whose inferred type is definitionally equal to `Prop` and failing closed when type inference cannot establish that.

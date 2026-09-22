# Production P4.15 — Simple Projections, Recursive Parameterized Recursors, and Status Reporting

## Trust label

ProofScript pskernel-derived TypeScript kernel — trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet.

## Summary

This pass moves deeper than the earlier 1–2% increments by adding a new kernel expression slice (`proj`) and strengthening the already-added parameterized recursor slice with List-like direct recursion evidence. It also exposes a machine-readable standalone status report for the active replacement kernel.

## Implemented

- `proj` inference in `TypeChecker.ts` for the smallest safe structure-like slice:
  - target must be an admitted inductive family;
  - family must have no indices;
  - family must have exactly one constructor;
  - projection index must be in range after dropping uniform family parameters;
  - field type may reference uniform family parameters;
  - dependent fields and higher-order projection field types remain unsupported.
- `proj` weak-head reduction in `TypeChecker.ts`:
  - reduction fires only after projection typing succeeds;
  - constructor major premise is reduced to WHNF first;
  - constructor arguments are interpreted as `params + fields`;
  - result is the selected field argument.
- Projection reduction now participates in definitional equality through existing WHNF/defeq paths.
- Added List-like parameterized recursor smoke coverage:
  - two constructors (`nil`, `cons`);
  - one uniform type parameter;
  - a direct recursive tail field;
  - generated recursor metadata records `recursiveFields: [false, true]` for `cons`;
  - `defEq` reduces recursive recursor calls enough to prove the length-like computation shape.
- Added indexed-family recursor fail-closed smoke coverage.
- Added `pskernelStatusReport()` in `packages/kernel/src/Main.ts`.
- Added `pskernel status --json` in `tools/pskernel.ts`.

## Still unsupported / fail-closed

- indexed-family projection typing/reduction;
- dependent-field projection typing/reduction;
- multi-constructor raw projections;
- full structure projection declaration generation;
- eta for structures/records;
- indexed, mutual, nested/container, and dependent recursors;
- full Lean projection/recursor equivalence proof.

## Red/green evidence

New assertions were added before the implementation was complete:

```txt
- simple Box projection should infer Nat and reduce to Nat.zero;
- projection reduction should participate in defeq;
- out-of-range projection should reject before declaration admission;
- List-like recursor metadata should mark direct recursive tail fields;
- List-like recursor computation should hold under defeq;
- indexed recursor use should remain fail-closed;
- pskernel status --json should report projection support.
```

The projection tests initially failed because `proj` typing was not implemented. After implementing the restricted projection slice, the smoke suite passes.

## Fresh verification commands

```bash
npm run build -- --pretty false
npx tsc -b --force --pretty false
node tools/copy-static-assets.ts
npm run test:kernel:smoke
npm run pskernel -- status
npm run pskernel -- status --json
npm run pskernel -- check-core artifacts/pskernel-cli-check-core-smoke.json cli-smoke
```

## Fresh verification result

```txt
build: PASS
forced tsc rebuild: PASS
copy static assets: PASS
test:kernel:smoke: PASS
pskernel status: PASS
pskernel status --json: PASS
pskernel check-core: PASS
```

## Updated progress

```txt
Phase 2: ~98% complete
Phase 3: ~88% started
Phase 4: ~88% started
Phase 5: ~66% started
Phase 6: ~50% started
Overall: ~76%
```

## New proof obligations

- `ProofScript.Projection.SimpleStructure.Type`
- `ProofScript.Projection.SimpleStructure.Iota`
- `ProofScript.Projection.UnsupportedSlices.FailClosed`
- `ProofScript.Recursor.ParameterizedRecursiveFields.IotaDefEq`
- `ProofScript.CLI.StatusReport.TrustBoundary`

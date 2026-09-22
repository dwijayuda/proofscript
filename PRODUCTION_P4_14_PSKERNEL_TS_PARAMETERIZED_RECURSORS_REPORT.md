# Production P4.14 — Parameterized Simple Recursor Types and Iota Reduction

## Trust label

ProofScript pskernel-derived TypeScript kernel — trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet.

## Summary

This pass expands the previous `typed-simple-nonindexed` recursor slice from only closed families to simple non-indexed families with nondependent uniform parameters. The goal is to cover the next common Lean inductive shape without opening indexed, mutual, nested/container, or dependent-parameter recursors.

## Implemented

- `synthesizeSimpleRecursorType` now supports:
  - one non-mutual inductive family;
  - zero or more nondependent uniform parameters;
  - no indices;
  - constructor codomains that target the family at exactly the uniform parameters;
  - constructor field domains that may reference only uniform parameters;
  - direct positive recursive fields with generated induction-hypothesis premises.
- Recursor metadata now records:
  - `numParams`;
  - `numIndices`;
  - constructor field counts after dropping uniform parameters;
  - direct recursive-field bitmap after dropping uniform parameters.
- `tryInductiveReduceRec` now handles parameterized recursor layout:
  - recursor arguments are interpreted as `params + motive + minors + major`;
  - constructor major premises are interpreted as `params + fields`;
  - parameter arguments must structurally match before iota reduction fires;
  - unsupported/general cases remain neutral/fail-closed.
- Added smoke coverage for a `Box.{u} (α : Sort u)` family:
  - `Box.rec` type synthesis succeeds;
  - synthesized type itself typechecks as a sort;
  - metadata records one uniform parameter;
  - metadata counts only constructor fields after uniform parameters;
  - `Box.rec Nat motive minor (Box.mk Nat Nat.zero)` iota-reduces to `Nat.zero`.

## Still unsupported / fail-closed

- indexed family recursors;
- mutual recursors;
- nested/container positivity recursors;
- dependent uniform parameter recursors;
- dependent constructor-field recursors;
- higher-order constructor field domains in recursor synthesis;
- full Lean recursor minor ordering and all Lean eliminator universe subtleties.

## Red/green evidence

Before implementation, the new parameterized-recursion smoke assertion failed with:

```txt
KernelUnsupportedError: constant Box.rec has no implemented type
```

After implementation, the smoke suite passes.

## Fresh verification commands

```bash
npm run build -- --pretty false
npx tsc -b --force --pretty false
node tools/copy-static-assets.ts
npm run test:kernel:smoke
npm run pskernel -- status
npm run pskernel -- check-core artifacts/pskernel-cli-check-core-smoke.json cli-smoke
```

## Fresh verification result

```txt
build: PASS
forced tsc rebuild: PASS
copy static assets: PASS
test:kernel:smoke: PASS
pskernel status: PASS
pskernel check-core: PASS
```

## Updated progress

```txt
Phase 2: ~98% complete
Phase 3: ~82% started
Phase 4: ~82% started
Phase 5: ~60% started
Phase 6: ~42% started
Overall: ~72%
```

## New proof obligations

- `ProofScript.Recursor.ParameterizedSimpleNonIndexed.Type`
- `ProofScript.Recursor.ParameterizedSimpleNonIndexed.Iota`
- `ProofScript.Recursor.ParameterUniformity.Metadata`
- `ProofScript.Recursor.ParameterizedUnsupportedSlices.FailClosed`

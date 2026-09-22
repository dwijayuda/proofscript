# P4.18 — Special Eq Recursor Type and Refl Iota Slice

## Trust label

ProofScript pskernel-derived TypeScript kernel; trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet.

## Implemented

- Added special canonical `Eq.rec` recursor type synthesis for the small indexed equality slice.
- The synthesis only activates when the admitted family is canonical `Eq` with one universe parameter, two parameters, one index, and constructor `Eq.refl` with the expected shape.
- Added `typed-eq-indexed` recursor metadata status.
- Added `Eq.rec` refl-iota reduction:
  - `Eq.rec α a motive reflCase a (Eq.refl α a)` reduces to `reflCase`.
- Non-refl equality proofs remain neutral.
- General indexed family recursors remain unsupported/fail-closed.

## Red-green evidence

Before implementation, the new smoke assertion failed with:

```txt
KernelUnsupportedError: constant Eq.rec has no implemented type
```

After implementation, the smoke suite passes.

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

## Progress estimate

```txt
Phase 2: ~99% complete
Phase 3: ~98% started
Phase 4: ~96% started
Phase 5: ~78% started
Phase 6: ~60% started
Overall: ~88%
```

## Remaining fail-closed areas

- General indexed recursors beyond `Eq.rec`.
- Mutual and nested/container recursors.
- Dependent constructor-field recursors/projections.
- String/UInt/Float/native primitive semantics.
- Full parser/elaborator/macro/tactic system.
- Full native Lean `.olean` replay.
- Full formal equivalence with Lean 4 kernel.

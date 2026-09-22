# Production P4.6 — pskernel TypeScript Replay + Recursor Metadata Hardening

## Status

PASS — trusted-boundary hardening slice completed.

## Trust label

ProofScript pskernel-derived TypeScript kernel, trusted-boundary standalone kernel, not fully formally equivalent to Lean 4 yet.

## Scope

This pass did not widen the executable trusted subset. It improved deterministic metadata and replay validation so generated artifacts are less likely to carry unchecked or ambiguous side data.

## Changes

- Added generated recursor metadata derived from constructor telescopes:
  - constructor name,
  - field count,
  - direct recursive field bitmap.
- Kept generated recursor inference/use fail-closed until real Lean-style recursor typing/reduction is implemented.
- Propagated recursor metadata into both checked environment entries and `recInfo` constant metadata.
- Exported `Main.ts` entry functions from the active `@proofscript/kernel` package:
  - `pskernelStatus`,
  - `pskernelCheckCore`.
- Added `tools/pskernel.ts` CLI with commands:
  - `status`,
  - `check-core <declarations.json> [implementationProfile]`,
  - `replay <artifact.json>`,
  - `obligations`.
- Added root script:
  - `npm run pskernel`.
- Hardened replay metadata validation:
  - typeclass class records,
  - typeclass instance records,
  - optional module/import/interface metadata.
- Added smoke coverage for all new boundaries.

## Fail-closed behavior preserved

- Recursors remain inventory/replay metadata only and cannot be inferred as usable constants without a real type.
- Malformed typeclass metadata rejects during replay validation.
- Malformed module metadata rejects during replay validation.
- Unknown/unsupported artifact prelude profiles still reject.

## Verification

Commands run:

```bash
npm run build -- --pretty false
npx tsc -b --force --pretty false
node tools/copy-static-assets.ts
npm run test:kernel:smoke
npm run pskernel -- status
npm run pskernel -- check-core /tmp/natlike.json cli-smoke
```

Results:

```txt
build: PASS
forced tsc rebuild: PASS
test:kernel:smoke: PASS
pskernel status: PASS
pskernel check-core: PASS
```

## Progress

- Phase 0: complete
- Phase 1: complete
- Phase 2: ~93% complete
- Phase 3: ~46% started
- Phase 4: ~48% started
- Phase 5: ~25% started
- Phase 6: ~30% started

Overall: ~45%.

## Remaining high-value work

1. Real recursor type synthesis for simple non-indexed inductives.
2. Iota reduction for recursor applications.
3. Stronger primitive operation validation beyond Unit/Bool/Nat/Eq/Quot bootstrap.
4. Deterministic environment snapshot hashing.
5. Deeper proof-obligation generation from ported symbols.

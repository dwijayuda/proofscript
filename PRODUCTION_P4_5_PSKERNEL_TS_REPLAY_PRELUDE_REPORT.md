# P4.5 pskernel TypeScript Kernel — Deterministic Replay Prelude Report

## Trust label

ProofScript pskernel-derived trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet.

## Goal

Make replay artifacts able to declare the deterministic primitive/base environment they require, so standalone replay can check declarations that reference `Nat`, `Bool`, `Unit`, `Eq`, or quotient primitives without relying on a hidden frontend-preloaded environment.

## Changes

- Added `CorePreludeProfile = "none" | "core" | "core+quot"` to `packages/kernel/src/PSKernel/Declaration.ts`.
- Added optional `prelude?: CorePreludeProfile` to `CoreArtifact`.
- Added replay validation for:
  - nonempty `proofscriptReference`,
  - nonempty `implementationProfile`,
  - allowed prelude profiles only.
- Added `checkCoreDeclarationsWithPrelude(...)` to `packages/kernel/src/PSKernel/Replay.ts`.
- Updated `replayCoreArtifact(...)` so it installs the declared prelude before checking artifact declarations.
- Replay prelude installation routes through `installCorePrimitives(...)`, which itself routes primitive families through normal kernel admission.
- `CheckSummary` now records the selected prelude and deterministic installed primitive names when one is installed.
- Added smoke tests proving:
  - Nat-using replay without a declared prelude rejects,
  - the same Nat declaration with `prelude: "core"` accepts,
  - `prelude: "core+quot"` installs quotient primitives deterministically,
  - unknown prelude profiles reject,
  - `checkCoreDeclarationsWithPrelude(...)` exposes the same safe helper path.

## Files changed

```txt
packages/kernel/src/PSKernel/Declaration.ts
packages/kernel/src/PSKernel/Replay.ts
tools/pskernel-kernel-smoke.ts
PSKERNEL_TS_KERNEL_REWRITE_REPORT.md
```

## Commands run

```bash
npm run build -- --pretty false
npm run test:kernel:smoke
```

## Results

```txt
build: PASS
test:kernel:smoke: PASS
```

## Supported now

```txt
CoreArtifact.prelude: "none"     -> no implicit primitive environment
CoreArtifact.prelude: "core"     -> Unit, Bool, Nat, Eq admitted before declarations
CoreArtifact.prelude: "core+quot" -> core prelude plus canonical quotient primitives
```

## Fail-closed behavior

```txt
Missing prelude for Nat-using artifacts rejects.
Unknown prelude profile rejects.
Prelude installation failures reject before artifact declaration checking.
No hidden frontend/compiler success is trusted as replay success.
```

## Remaining proof obligations

- Prove the TypeScript `CorePreludeProfile` installation order corresponds to the intended Lean 4.33.1 primitive baseline slice.
- Prove `replayCoreArtifact` acceptance equals checking the declared prelude plus artifact declarations in order, for the supported subset.
- Prove the primitive prelude declarations have the same kernel meaning as the corresponding Lean primitive declarations in the selected slice.
- Prove `core+quot` initializes quotient primitives only after canonical `Eq`/`Eq.refl` shape is established.

## Progress update

```txt
Phase 0: complete
Phase 1: complete
Phase 2: ~92% complete
Phase 3: ~44% started
Phase 4: ~44% started
Phase 5: ~23% started through primitive/quotient bootstrap
Phase 6: ~20% started through deterministic replay prelude
Overall: ~42%
```

## Next recommended work

Continue Phase 3/4 by adding safer definitional equality support for eta/let/lambda application shapes and stronger declaration snapshot hashing, while keeping unsupported recursor and full inductive elimination behavior fail-closed.

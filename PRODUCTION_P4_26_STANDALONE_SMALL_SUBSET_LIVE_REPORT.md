# Production P4.26 — Standalone Small ProofScript Subset Live

## Status

Accepted as a fast smoke-tested development milestone.

## Trust label

`trusted-boundary standalone small subset; not fully formally equivalent to Lean 4 yet`

## Goal

Bring a small `.ps` ProofScript subset to life without requiring Lean4 at runtime.

## Delivered

- Added `tools/pslive.ts`.
- Added `tools/proofscript-live-small-smoke.ts`.
- Added npm scripts:
  - `npm run pslive`
  - `npm run test:standalone-small`
- Added live example:
  - `examples/standalone-small/src/Main.ps`
- Added JS emission for a tiny checked executable subset:
  - explicit typed `def`
  - Nat literals
  - `Nat.zero`
  - `Nat.succ`
  - `Nat.add`
  - direct calls to earlier checked definitions
  - curried Nat functions
- The pipeline checks source with the TypeScript parser/elaborator, loads the checked standard bootstrap artifact, reuses the pskernel-derived TypeScript kernel, and emits executable CommonJS.
- No Lean4 binary/oracle is invoked.
- Integrated standalone small-subset smoke into release preflight.
- Added proof obligation: `ProofScript.StandaloneSmallSubset.LiveWithoutLean4`.

## Fail-closed boundaries

The small subset still rejects/does not emit:

- macros;
- tactics;
- full typeclass source behavior;
- String/UInt/Float runtime semantics;
- IO/effects;
- general recursion execution;
- full Lean equivalence;
- full ProofScript language coverage.

## Verified commands

```bash
npm run build -- --pretty false
npm run test:kernel:smoke
npm run test:standalone-small
npm run pslive -- check examples/standalone-small/src/Main.ps --json
npm run pslive -- build-js examples/standalone-small/src/Main.ps --out artifacts/standalone-small-main.js --json
node artifacts/standalone-small-main.js
npm run pslive -- run examples/standalone-small/src/Main.ps --call add2 --args 5 --json
```

## Result

All commands passed in the development workspace.

## Meaning

ProofScript now has a minimal live no-Lean4 path for `.ps` source:

```text
.ps source -> parser -> elaborator -> checked Core -> pskernel-derived TS kernel -> JS output -> run
```

This is not a full compiler. It is the first small standalone live subset.

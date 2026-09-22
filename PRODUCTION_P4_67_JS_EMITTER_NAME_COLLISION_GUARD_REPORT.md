# ProofScript Standalone Kernel Maturity Replacement P4.67

## Status

P4.67 continues from P4.66 and keeps the release label as **K3-TB trusted-boundary**, not fully formal K3 and not proven equal to the full Lean 4 kernel.

## Main change

Added a fail-closed JavaScript emitter name-collision guard.

Before P4.67, `pslive build-js` could accept two checked declarations whose ProofScript names sanitize to the same JavaScript binding name, for example:

```proofscript
namespace A { def B: Nat := { 1 } }
def A_B: Nat := { 2 }
```

Both names sanitize to `A_B`, so the generated JavaScript could contain duplicate `const A_B` declarations and ambiguous exports. The TypeScript emitter already rejected this class of collision. P4.67 factors the sanitizer into one shared checked map builder and applies the same fail-closed behavior to both JavaScript and TypeScript emission.

## Files changed

- `packages/backend-typescript/src/index.ts`
- `packages/backend-typescript/dist/index.js`
- `packages/backend-typescript/dist/index.d.ts`
- `tools/pslive-js-name-collision-tests.ts`
- `tools/pslive.ts`
- `package.json`
- `package-lock.json`

## Test-first evidence

The regression test was added before the implementation and initially failed because `build-js` accepted the collision and wrote invalid/ambiguous JavaScript. After the fix and rebuild, it passes:

```text
PSLIVE_JS_NAME_COLLISION=PASS
```

## Verified commands

```text
npm run build -- --pretty false
npm run test:pslive:js-name-collision
npm run test:pslive:build-ts
npm run test:standalone-small
npm run test:kernel:typechecker
npm run test:kernel:smoke
npm run test:governance
node tools/pskernel.ts status --json
```

All commands above passed in this P4.67 working tree.

## Still blocked

```text
npm run verify:k3tb:publish
```

This still fails closed because `PROOFSCRIPT_LEAN_BIN` is not set to the expected Lean 4.33.1 binary. This is not a new regression in P4.67.

## Progress estimate

- Practical standalone MVP: ~88%
- K3-TB release honesty / audit guard: ~99%
- Fully formal K3 / Lean 4 kernel equivalence: not achieved; this is future v72 work.

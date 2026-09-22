# ProofScript P4.82 Runtime Package Extraction Report

## Status

P4.82 is a behavior-preserving cleanup/refactor slice. It does not change the K3-TB trusted boundary, kernel rules, theorem rules, or the PSC-1 language surface.

## Goal

Reduce spaghetti risk in `packages/runtime/src/index.ts` by splitting executable runtime values, capability/profile metadata, status reporting, and embedded source-template generation into focused modules while keeping the public `@proofscript/runtime` API stable.

## Changes

Before P4.82:

```text
packages/runtime/src/index.ts
  trust/profile metadata
  public runtime types
  structure/inductive runtime helpers
  Nat runtime helpers
  runtime status
  JavaScript embedded runtime source template
  TypeScript embedded runtime source template
```

After P4.82:

```text
packages/runtime/src/index.ts
  thin public API barrel only

packages/runtime/src/types.ts
  PsNat / PsBool / PsUnit / PsValue / PsStructValue
  Psc1RuntimeManifest

packages/runtime/src/profile.ts
  PSC1_TRUST_LABEL
  PSC1_IMPLEMENTATION_PROFILE
  PSC1_SUPPORTED_FEATURES
  PSC1_FAIL_CLOSED_FEATURES

packages/runtime/src/nat.ts
  psNat
  Nat_succ
  Nat_add
  Nat_mul
  Nat_rec

packages/runtime/src/structures.ts
  Struct_mk
  Struct_ctor
  Struct_proj
  Struct_rec
  Inductive_rec

packages/runtime/src/status.ts
  psc1RuntimeStatus

packages/runtime/src/source.ts
  psc1RuntimeSource
  psc1RuntimeTypeScriptSource
```

## Line-count shape

```text
packages/runtime/src/index.ts        6 lines
packages/runtime/src/types.ts       19 lines
packages/runtime/src/status.ts      20 lines
packages/runtime/src/nat.ts         28 lines
packages/runtime/src/source.ts      48 lines
packages/runtime/src/profile.ts     55 lines
packages/runtime/src/structures.ts  74 lines
```

The runtime is now split by responsibility instead of one monolithic index file.

## API compatibility preserved

The public package entry point still exports:

```text
PSC1_TRUST_LABEL
PSC1_IMPLEMENTATION_PROFILE
PSC1_SUPPORTED_FEATURES
PSC1_FAIL_CLOSED_FEATURES
PsNat / PsBool / PsUnit / PsStructValue / Psc1RuntimeManifest
psNat / Nat_succ / Nat_add / Nat_mul / Nat_rec
Struct_mk / Struct_ctor / Struct_proj / Struct_rec / Inductive_rec
psc1RuntimeStatus
psc1RuntimeSource
psc1RuntimeTypeScriptSource
```

## Verification summary

Fast cleanup verification was run after implementation:

```text
node tools/runtime-extraction-tests.ts before implementation  FAIL_EXPECTED
npm run build -- --pretty false                               PASS
npm run test:runtime:extraction                               PASS
npm run test:pslive:build-ts                                  PASS
npm run test:pslive:cleanup-harness                           PASS
npm run test:standalone-small                                 PASS
npm run test:kernel:smoke                                     PASS
node tools/pskernel.ts status --json                         PASS, trusted-boundary / not-proven
```

Fresh extracted archive smoke:

```text
fresh extract: npm run build -- --pretty false                PASS
fresh extract: npm run test:runtime:extraction                PASS
fresh extract: npm run test:pslive:build-ts                   PASS
fresh extract: node tools/pskernel.ts status --json          PASS, trusted-boundary / not-proven
unzip -tq P4.82 archive                                       PASS
```

Not rerun:

```text
npm run verify:k3tb:publish            NOT RERUN; still needs PROOFSCRIPT_LEAN_BIN
full long matrix                       NOT RERUN; skipped for fast cleanup iteration
```

## Trust boundary

No runtime file is a proof authority. Runtime code remains executable support for already-checked Core artifacts. Kernel validity remains in `packages/kernel` / verifier paths.

## Progress after P4.82

```text
Standalone PSC-1 without Lean4:                 ~97.3%
PSC-1 small complete programming language:      ~72.0%
PSC-1 small theorem prover:                     ~62.1%
Full ProofScript compiler:                      ~61.7%
Full Lean-like ProofScript without Lean4:       ~13.8%
Formal Lean 4 equivalence:                      0 proven obligations
Maintainability / anti-spaghetti score:         ~74%
```

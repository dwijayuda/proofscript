# Production P4.96 — Elaborator Environment/Name-Resolution Extraction Report

## Summary

P4.96 continues the production-grade architecture cleanup after proof, structure/inductive, and match/pattern extraction.

The main change is behavior-preserving extraction of elaborator global metadata, namespace/name resolution, pending-recursive declaration head inference, and shared Core helper functions from `packages/elaborator/src/index.ts` into focused modules.

## What Changed

- Added `packages/elaborator/src/globalEnvironment.ts`.
  - Owns `InitialGlobalInfo` and `GlobalInfo`.
  - Owns `syncGlobals` for synchronizing source-facing metadata from the checked kernel environment.
  - Owns `qualifyDeclarationName`, `namespaceCandidates`, and `resolveGlobalName`.
  - Owns `inferElaborationHeadType`, including the narrowly-scoped pending declaration fallback used while elaborating structural recursion.
- Added `packages/elaborator/src/coreUtils.ts`.
  - Owns `contextFromTypes`, `flattenCoreApps`, `splitCorePi`, `splitCorePiDomains`, and `containsAnyBVar`.
  - Removes duplicated helper implementations from proof and match elaborator modules.
- Updated `packages/elaborator/src/index.ts`.
  - Imports the extracted environment/name-resolution helpers.
  - Imports the shared Core utilities.
  - No longer keeps inline `syncGlobals`, `namespaceCandidates`, `resolveGlobalName`, `inferElaborationHeadType`, `contextFromTypes`, or `flattenCoreApps`.
- Updated `packages/elaborator/src/proofElaborator.ts` and `packages/elaborator/src/matchElaborator.ts` to use shared Core utilities.
- Added `tools/elaborator-environment-extraction-tests.ts` and `npm run test:elaborator:environment-extraction`.

## Why This Matters

This makes the elaborator easier to explain and safer to extend. Name resolution and global metadata are now a named subsystem instead of being mixed with term elaboration, proof elaboration, match lowering, and structure/inductive lowering.

Future feature work such as `Option`, `List`, `String`, module imports, and stronger constructor/pattern support now has clearer extension points:

- source/global lookup changes go in `globalEnvironment.ts`;
- Core-shape utilities go in `coreUtils.ts`;
- proof extensions go in `proofElaborator.ts`;
- match/pattern lowering goes in `matchElaborator.ts`;
- structure/inductive declaration support goes in `inductiveElaborator.ts`;
- central `index.ts` should remain orchestration and generic term elaboration only.

## Trust Boundary

This is an architecture cleanup only. It does not change kernel semantics, proof rules, runtime trust, backend emission, or supported language semantics.

ProofScript remains K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## Verification

Fresh verification performed for this release slice:

```text
node tools/elaborator-environment-extraction-tests.ts before implementation  FAIL_EXPECTED
npm run build -- --pretty false                                             PASS
npm run test:elaborator:environment-extraction                              PASS
npm run test:elaborator:match-extraction                                    PASS
npm run test:elaborator:inductive-structure-extraction                      PASS
npm run test:elaborator:proof-extraction                                    PASS
npm run test:pslive:language-fast                                           PASS
npm run test:reference-governance:json                                      PASS, 94 checks
npm run test:architecture                                                   PASS
npm run test:standalone-small                                               PASS
npm run test:kernel:smoke                                                   PASS
node tools/pskernel.ts status --json                                       PASS, trusted-boundary / not-proven
```

Fresh extracted archive smoke:

```text
npm run build -- --pretty false                                      PASS
npm run test:elaborator:environment-extraction                       PASS
npm run test:architecture                                            PASS
node tools/pskernel.ts status --json                                PASS, trusted-boundary / not-proven
unzip -tq P4.96 archive                                              PASS
```

## Next Recommended Cleanup

P4.97 should classify packages into production, experimental, bridge, legacy, and trusted-boundary groups, and enforce that classification in documentation and architecture checks. This is the next explainability step before large feature work resumes.

# Production P4.94 — Elaborator Structure/Inductive Extraction

## Summary

P4.94 continues the production-grade architecture cleanup by extracting structure and inductive declaration elaboration out of the central elaborator file.

This slice is behavior-preserving. It does not add syntax, kernel primitives, proof rules, runtime semantics, or Lean-equivalence claims.

## New module

- `packages/elaborator/src/inductiveElaborator.ts`

The module exports:

- `InductiveElaborationHost`
- `InductiveGlobalInfo`
- `elaborateStructureDeclaration`
- `elaborateInductiveDeclaration`

## Main effects

Before P4.94, `packages/elaborator/src/index.ts` owned structure validation, generated structure constructor/projection declarations, simple inductive declaration elaboration, constructor type elaboration wiring, and environment/global synchronization for those paths.

After P4.94, `index.ts` delegates those declaration paths to `inductiveElaborator.ts` through a narrow host interface. The main elaborator still owns shared term elaboration and helper functions, but structure/inductive declaration control flow now has a separate architectural home.

## Preserved behavior

The focused regression covers:

- structure declaration acceptance
- generated projection declarations
- structure literal execution
- dotted structure projection
- structure update execution
- structure theorem `rfl` checks
- simple inductive declaration acceptance
- constructor shorthand execution
- inductive match execution
- inductive theorem `rfl` checks
- bad structure field type rejection

## Verification

Fresh checks run for this slice:

```txt
node tools/elaborator-inductive-structure-extraction-tests.ts before implementation  FAIL_EXPECTED
npm run build -- --pretty false                                                PASS
npm run test:elaborator:inductive-structure-extraction                         PASS
npm run test:elaborator:proof-extraction                                       PASS
npm run test:pslive:language-fast                                              PASS
npm run test:reference-governance:json                                         PASS, 94 checks
npm run test:architecture                                                      PASS
npm run test:standalone-small                                                  PASS
npm run test:kernel:smoke                                                      PASS
node tools/pskernel.ts status --json                                          PASS, trusted-boundary / not-proven
npm run test:structure-dot-projection                                          PASS
npm run test:structure-update-runtime                                          PASS
npm run test:structure-match-runtime                                           PASS
npm run test:user-inductive-match-runtime                                      PASS
npm run test:constructor-shorthand                                             PASS
npm run test:user-recursive-inductive-runtime                                  PASS
fresh extract: npm run build -- --pretty false                                 PASS
fresh extract: npm run test:elaborator:inductive-structure-extraction          PASS
fresh extract: npm run test:architecture                                       PASS
fresh extract: node tools/pskernel.ts status --json                           PASS
unzip -tq P4.94 archive                                                        PASS
```

## Trust status

K3-TB remains trusted-boundary only. It is not fully formal K3 and is not proven equivalent to Lean 4. Formal Lean 4 equivalence remains 0 proven obligations.

## Next recommended cleanup

P4.95 should extract match/pattern lowering from the central elaborator, because it is the next highest-risk area before adding Option/List/String features.

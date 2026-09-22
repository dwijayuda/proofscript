# Production P4.95 — Elaborator Match/Pattern Extraction Report

## Summary

P4.95 continues the production-grade architecture cleanup after P4.93 proof extraction and P4.94 structure/inductive declaration extraction.

The main change is behavior-preserving extraction of match and pattern lowering logic from the central elaborator into `packages/elaborator/src/matchElaborator.ts`.

## What Changed

- Added `packages/elaborator/src/matchElaborator.ts`.
- Moved ordinary `match` term elaboration into `elaborateMatchTerm`.
- Moved constructor-rule resolution into `resolveSurfaceCasesForRules`.
- Moved branch binder-name extraction into `patternNamesForRule`.
- Moved bounded Nat numeric-literal match desugaring into `lowerNatLiteralMatch`.
- Moved structural-recursion equation theorem generation into `generateStructuralEquationTheorems` because it uses the same match/case-to-rule resolution path.
- Reduced `packages/elaborator/src/index.ts` to delegating match terms and structural equation generation through a narrow host callback.

## Why This Matters

The parser/backend/runtime were already modularized in P4.76–P4.89 and P4.81–P4.82. The elaborator was the remaining high-risk architecture center. By extracting proof handling, inductive/structure declaration handling, and now match/pattern lowering, the central elaborator becomes less likely to accumulate feature-specific logic as Option/List/String and stronger recursion are added later.

## Trust Boundary

This is an architecture cleanup only. It does not change kernel semantics, proof rules, runtime trust, or backend trust.

ProofScript remains K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## Verification

Fresh verification performed for this release slice:

```text
node tools/elaborator-match-extraction-tests.ts before implementation  FAIL_EXPECTED
npm run build -- --pretty false                                      PASS
npm run test:elaborator:match-extraction                             PASS
npm run test:elaborator:proof-extraction                             PASS
npm run test:elaborator:inductive-structure-extraction               PASS
npm run test:pslive:language-fast                                    PASS
npm run test:reference-governance:json                               PASS, 94 checks
npm run test:architecture                                            PASS
npm run test:standalone-small                                        PASS
npm run test:kernel:smoke                                            PASS
node tools/pskernel.ts status --json                                PASS, trusted-boundary / not-proven
fresh extract build + match extraction + architecture                PASS
unzip -tq P4.95 archive                                              PASS
```

## Next Recommended Cleanup

P4.96 should extract name-resolution/environment helper logic from `packages/elaborator/src/index.ts`, then feature work can safely resume with Option/List/String.

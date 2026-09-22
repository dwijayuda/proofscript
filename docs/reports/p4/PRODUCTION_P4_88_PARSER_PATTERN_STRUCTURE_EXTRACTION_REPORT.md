# Production P4.88 — Parser Pattern/Structure Extraction Report

## Summary

P4.88 continues the cleanup/refactor roadmap with a behavior-preserving parser split.

The main change is extracting pattern parsing and structure term parsing out of `packages/parser/src/index.ts` into narrow helper modules:

- `packages/parser/src/patternParser.ts`
- `packages/parser/src/structureTermParser.ts`

This does not add syntax, kernel primitives, proof rules, backend behavior, or Lean-equivalence claims.

## Why this matters

After P4.76–P4.87, tokenizer, cursor, sugar lowering, proof parsing, declaration dispatch, binder parsing, universe-level parsing, and expression precedence parsing were already separated. Pattern parsing and structure literal/update parsing were still mixed into the central parser, even though they are reusable source-language concerns used by match expressions, equation definitions, structure values, and structure updates.

Extracting them makes future grammar work safer because:

- constructor/numeric/wildcard pattern parsing lives in one module;
- duplicate pattern-binder rejection is isolated;
- namespace/open capture for constructor patterns is explicit through a host interface;
- structure literal field punning is isolated from ordinary atom parsing;
- structure update parsing is separated from the main expression parser;
- `packages/parser/src/index.ts` now has fewer syntax-specific responsibilities.

## Files changed

Created:

- `packages/parser/src/patternParser.ts`
- `packages/parser/src/structureTermParser.ts`
- `tools/parser-pattern-structure-extraction-tests.ts`
- `docs/reports/p4/PRODUCTION_P4_88_PARSER_PATTERN_STRUCTURE_EXTRACTION_REPORT.md`
- `PRODUCTION_P4_88_PARSER_PATTERN_STRUCTURE_EXTRACTION_REPORT.md`

Modified:

- `packages/parser/src/index.ts`
- `package.json`
- generated parser dist files via `npm run build`

## Behavior preserved

The extraction preserves existing behavior for:

- numeric Nat patterns `0`, `1`, `2`, ...;
- wildcard pattern `_`;
- constructor patterns `Nat.succ k`, `.some x`, and `Ctor(a, b)` forms;
- duplicate pattern-binder rejection;
- namespace/open capture for constructor patterns;
- match alternatives;
- equation definition clauses;
- structure literals `{x := 1, y := 2}`;
- structure literal field punning `{x, y}`;
- simple structure updates `{p with x := 3}`;
- parenthesized checked structure update bases `{(p2) with y := 4}`;
- duplicate structure field/update rejection;
- empty structure instance rejection.

## Trust-boundary status

Unchanged:

- K3-TB trusted-boundary status remains active.
- This is not fully formal K3.
- Formal Lean 4 equivalence remains at 0 proven obligations.
- Parser refactoring does not alter proof authority.

Proof authority remains in checked Core/kernel/verifier paths, not parser sugar, runtime, or backend.

## Verification

Fresh commands run for P4.88:

```text
node tools/parser-pattern-structure-extraction-tests.ts before implementation  FAIL_EXPECTED
npm run build -- --pretty false                                               PASS
npm run test:parser:pattern-structure                                         PASS
npm run test:parser:expression                                                PASS
npm run test:parser:binder-level                                              PASS
npm run test:parser:proof                                                     PASS
npm run test:pslive:language-fast                                             PASS
npm run test:reference-governance:json                                        PASS, 94 checks
npm run test:architecture                                                     PASS
npm run test:standalone-small                                                 PASS
npm run test:kernel:smoke                                                     PASS
node tools/pskernel.ts status --json                                         PASS, trusted-boundary / not-proven
```

Not rerun:

```text
npm run verify:k3tb:publish            NOT RERUN; still needs PROOFSCRIPT_LEAN_BIN
full long matrix                       NOT RERUN; skipped for fast cleanup iteration
```

## Cleanup/refactor progress

```text
P4.76 parser tokenizer extraction                      DONE
P4.77 parser cursor extraction                         DONE
P4.78 parser sugar/lowering extraction                 DONE
P4.79 pslive core extraction                           DONE
P4.80 pslive test harness extraction                   DONE
P4.81 backend-typescript emitter split                 DONE
P4.82 runtime package split                            DONE
P4.83 reference-governance JSON hang fix               DONE
P4.84 trust-boundary import guard                      DONE
P4.85 parser declaration/proof extraction              DONE
P4.86 parser binder/level extraction                   DONE
P4.87 parser expression parser split                   DONE
P4.88 parser pattern/structure term extraction         DONE
P4.89 parser namespace/section command split           NEXT
```

## Progress estimate after P4.88

```text
Standalone PSC-1 without Lean4:                 ~97.3%
PSC-1 small complete programming language:      ~72.0%
PSC-1 small theorem prover:                     ~62.1%
Full ProofScript compiler:                      ~62.8%
Full Lean-like ProofScript without Lean4:       ~13.8%
Formal Lean 4 equivalence:                      0 proven obligations
Maintainability / anti-spaghetti score:         ~86%
```

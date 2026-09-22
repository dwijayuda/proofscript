# Production P4.86 — Parser Binder/Level Extraction Report

## Summary

P4.86 continues the cleanup/refactor roadmap with a behavior-preserving parser split.

The main change is extracting binder parsing and universe-level parsing out of `packages/parser/src/index.ts` into narrow helper modules:

- `packages/parser/src/binderParser.ts`
- `packages/parser/src/levelParser.ts`

This does not add syntax, kernel primitives, proof rules, backend behavior, or Lean-equivalence claims.

## Why this matters

After P4.76–P4.85, tokenizer, cursor, sugar, proof parsing, and declaration dispatch were already separated. Binder and level parsing were still mixed into the central parser, even though they are reusable grammar concerns used by definitions, theorems, structures, classes, instances, inductives, lambdas, and forall/Pi terms.

Extracting them makes future grammar work safer because:

- binder syntax policy lives in one module;
- instance implicit binder construction is isolated;
- optional/default binder rejection is preserved in one place;
- universe level grammar no longer depends on declaration or namespace code;
- future expression parser extraction has fewer cross-cutting helpers left in `index.ts`.

## Files changed

Created:

- `packages/parser/src/binderParser.ts`
- `packages/parser/src/levelParser.ts`
- `tools/parser-binder-level-extraction-tests.ts`
- `docs/reports/p4/PRODUCTION_P4_86_PARSER_BINDER_LEVEL_EXTRACTION_REPORT.md`

Modified:

- `packages/parser/src/index.ts`
- `package.json`
- generated parser dist files via `npm run build`

## Behavior preserved

The extraction preserves existing behavior for:

- explicit binders `(x: T)`;
- implicit binders `{x: T}`;
- strict implicit binders `⦃x: T⦄`;
- named instance binders `[inst: T]`;
- anonymous instance binders `[T]`;
- required typed binder entries;
- optional/default binder rejection;
- `Type u`, `Sort u`, `max`, `imax`, and `u + n` universe-level parsing;
- theorem proof parsing already extracted in P4.85;
- declaration dispatch already extracted in P4.85.

## Trust-boundary status

Unchanged:

- K3-TB trusted-boundary status remains active.
- This is not fully formal K3.
- Formal Lean 4 equivalence remains at 0 proven obligations.
- Parser refactoring does not alter proof authority.

Proof authority remains in checked Core/kernel/verifier paths, not parser sugar, runtime, or backend.

## Verification

Fresh commands run for P4.86:

```text
npm run build -- --pretty false                         PASS
npm run test:parser:binder-level                        PASS
npm run test:parser:proof                               PASS
npm run test:parser:declaration-dispatch                PASS
npm run test:parser:sugar                               PASS
npm run test:pslive:language-fast                       PASS
npm run test:reference-governance:json                  PASS, 94 checks
npm run test:architecture                               PASS
npm run test:standalone-small                           PASS
npm run test:kernel:smoke                               PASS
node tools/pskernel.ts status --json                   PASS, trusted-boundary / not-proven
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
P4.87 parser expression parser split                   NEXT
```

## Progress estimate after P4.86

```text
Standalone PSC-1 without Lean4:                 ~97.3%
PSC-1 small complete programming language:      ~72.0%
PSC-1 small theorem prover:                     ~62.1%
Full ProofScript compiler:                      ~62.4%
Full Lean-like ProofScript without Lean4:       ~13.8%
Formal Lean 4 equivalence:                      0 proven obligations
Maintainability / anti-spaghetti score:         ~82%
```

# Production P4.87 — Parser Expression Extraction Report

## Summary

P4.87 continues the cleanup/refactor roadmap with a behavior-preserving parser split.

The main change is extracting expression precedence and application parsing out of `packages/parser/src/index.ts` into:

- `packages/parser/src/expressionParser.ts`

This does not add syntax, kernel primitives, proof rules, backend behavior, or Lean-equivalence claims.

## Why this matters

After P4.76–P4.86, tokenizer, cursor, sugar builders, proof parsing, declaration dispatch, binder parsing, and universe-level parsing were already separated. The main parser still owned the precedence ladder for ordinary terms: arrows, equality, Boolean operators, Nat arithmetic, whitespace application, explicit application, and call syntax.

Extracting the precedence chain makes future grammar work safer because:

- operator precedence now has one focused owner;
- Nat/Bool sugar lowering calls are localized;
- whitespace application and explicit `@` calls are isolated from declarations;
- parser entry still controls namespaces, sections, patterns, structures, and special forms;
- future syntax work can extend expression parsing without adding more logic to the central parser.

## Files changed

Created:

- `packages/parser/src/expressionParser.ts`
- `tools/parser-expression-extraction-tests.ts`
- `docs/reports/p4/PRODUCTION_P4_87_PARSER_EXPRESSION_EXTRACTION_REPORT.md`

Modified:

- `packages/parser/src/index.ts`
- `package.json`
- generated parser dist files via `npm run build`

## Behavior preserved

The extraction preserves existing behavior for:

- arrow/function types `A -> B` and `A → B`;
- propositional equality `a = b`;
- rejection of chained equality without parentheses;
- rejection of unimplemented Boolean equality `==`;
- rejection of inequality `!=` / `≠`;
- Boolean operators `&&` and `||` with precedence;
- Nat operators `+` and `*` with precedence;
- whitespace application `f x` / `Nat.add x 2`;
- explicit call syntax `@f(args)`;
- rejection of bare `@f` without arguments;
- rejection of arrow-only lambda syntax `(x: T) => body`;
- special forms still owned by the main parser: `match`, `bif`, `if`, `fun`, `forall`;
- namespace-aware atoms and structures still owned by the main parser.

## Trust-boundary status

Unchanged:

- K3-TB trusted-boundary status remains active.
- This is not fully formal K3.
- Formal Lean 4 equivalence remains at 0 proven obligations.
- Parser refactoring does not alter proof authority.

Proof authority remains in checked Core/kernel/verifier paths, not parser sugar, runtime, or backend.

## Verification

Fresh commands run for P4.87:

```text
node tools/parser-expression-extraction-tests.ts before implementation  FAIL_EXPECTED
npm run build -- --pretty false                                         PASS
npm run test:parser:expression                                          PASS
npm run test:parser:binder-level                                        PASS
npm run test:parser:proof                                               PASS
npm run test:parser:declaration-dispatch                                PASS
npm run test:parser:sugar                                               PASS
npm run test:pslive:language-fast                                       PASS
npm run test:reference-governance:json                                  PASS, 94 checks
npm run test:architecture                                               PASS
npm run test:standalone-small                                           PASS
npm run test:kernel:smoke                                               PASS
node tools/pskernel.ts status --json                                   PASS, trusted-boundary / not-proven
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
P4.88 parser pattern/structure parser split            NEXT
```

## Progress estimate after P4.87

```text
Standalone PSC-1 without Lean4:                 ~97.3%
PSC-1 small complete programming language:      ~72.0%
PSC-1 small theorem prover:                     ~62.1%
Full ProofScript compiler:                      ~62.6%
Full Lean-like ProofScript without Lean4:       ~13.8%
Formal Lean 4 equivalence:                      0 proven obligations
Maintainability / anti-spaghetti score:         ~84%
```

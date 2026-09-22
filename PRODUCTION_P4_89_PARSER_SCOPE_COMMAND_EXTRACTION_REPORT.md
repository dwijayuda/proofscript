# Production P4.89 — Parser Scope Command Extraction Report

## Summary

P4.89 completes the next cleanup/refactor slice after P4.88 by extracting parser scope-level command handling from `packages/parser/src/index.ts` into a dedicated module.

This is a behavior-preserving refactor. It does not add syntax, does not add kernel primitives, does not add proof rules, and does not change the K3-TB trust boundary.

## Main Change

Created:

```text
packages/parser/src/scopeCommandParser.ts
```

The module now owns:

```text
parseImportCommand
parseUniverseCommand
parseNamespaceCommand
parseSectionCommand
parseOpenCommand
resolveNamespaceAtCommand
```

`packages/parser/src/index.ts` now delegates these commands through a narrow `ScopeCommandHost` adapter.

## Why This Matters

Before P4.89, `index.ts` still mixed ordinary grammar parsing with scope/state commands:

```text
import
universe
namespace
section
open
```

After P4.89, parser responsibilities are better separated:

```text
tokenize.ts                 lexical tokens
tokenCursor.ts              cursor helpers
sugar.ts                    checked-syntax lowering builders
proofParser.ts              proof term/step parsing
declarationParser.ts        declaration command dispatch
binderParser.ts             binder groups
levelParser.ts              universe level parsing
expressionParser.ts         expression precedence/application
patternParser.ts            match/equation patterns
structureTermParser.ts      structure literal/update terms
scopeCommandParser.ts       import/universe/namespace/section/open commands
index.ts                    parser orchestration and remaining declaration bodies
```

## Verification

Fresh verification performed in the working tree:

```text
node tools/parser-scope-command-extraction-tests.ts before implementation  FAIL_EXPECTED
npm run build -- --pretty false                                            PASS
npm run test:parser:scope-commands                                         PASS
npm run test:parser:pattern-structure                                      PASS
npm run test:parser:expression                                             PASS
npm run test:pslive:language-fast                                          PASS
npm run test:reference-governance:json                                     PASS, 94 checks
npm run test:architecture                                                  PASS
npm run test:standalone-small                                              PASS
npm run test:kernel:smoke                                                  PASS
node tools/pskernel.ts status --json                                      PASS, trusted-boundary / not-proven
```

## Trust Boundary

Unchanged:

```text
K3-TB trusted-boundary only
not fully formal K3
not proven equivalent to Lean 4
Formal Lean 4 equivalence: 0 proven obligations
```

## Cleanup Progress

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
P4.89 parser scope command extraction                  DONE
```

## Readiness Judgment

After P4.89, the codebase is clean enough to resume small language/compiler feature work. The remaining cleanup risk is mostly `tools/pslive-smoke-lib.ts`, which is large but test-fixture oriented rather than core parser/kernel architecture.

Recommended next direction: resume features with a rule that every new parser feature must land in one of the extracted modules, not in `index.ts` unless it is truly orchestration.

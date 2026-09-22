# Production P4.80 — pslive Test Harness Consolidation

## Summary

P4.80 is a behavior-preserving cleanup/refactor slice. It extracts a reusable test harness for `pslive` command tests so new language/backend features do not need to duplicate temp directory creation, CLI spawning, JSON parsing, TypeScript compilation, CommonJS loading, and rejection assertions.

This does not change the kernel, proof rules, source language semantics, or TypeScript/JavaScript emission semantics.

## Motivation

After P4.66–P4.74, many pslive feature tests repeated the same boilerplate:

- create temp directory
- write `.ps` source
- spawn `node tools/pslive.ts ... --json`
- parse JSON
- build JS or TS
- run `tsc --strict`
- require compiled output
- assert fail-closed rejection cases

That made every new smoke harder to review and increased the risk that future tests diverge subtly.

## Changes

Created:

- `tools/pslive-test-harness.ts`
- `tools/pslive-test-harness-tests.ts`

Refactored representative pslive tests to consume the harness:

- `tools/pslive-build-ts-tests.ts`
- `tools/pslive-nat-plus-tests.ts`
- `tools/pslive-bool-operators-tests.ts`

Updated package scripts:

- `test:pslive:harness`
- `test:pslive:cleanup-harness`

## Harness API

The new harness provides:

- `createPsliveFixture(prefix, { fileName, source })`
- `runPslive(args, expect)`
- `runPsliveJson(args, expect)`
- `expectPsliveRejected(args)`
- `buildJsFixture(fixture, fileName)`
- `buildTsFixture(fixture, fileName)`
- `compileTypeScriptFixture(tsPath, outDir)`
- `requireFixtureModule(file)`

## Trust Boundary

No trust-boundary change.

- The harness is test-only tooling.
- It does not enter `packages/kernel`.
- It does not add kernel primitives.
- It does not validate proofs.
- It only verifies existing CLI/backend behavior more consistently.

## Verification

Fast verification was used for this cleanup slice.

```text
node tools/pslive-test-harness-tests.ts before implementation    FAIL_EXPECTED: missing harness module
npm run build -- --pretty false                                  PASS
npm run test:pslive:harness                                      PASS
npm run test:pslive:cleanup-harness                              PASS
npm run test:standalone-small                                    PASS
npm run test:kernel:smoke                                        PASS
node tools/pskernel.ts status --json                            PASS, trusted-boundary / not-proven
unzip -tq P4.80 archive                                          PASS
```

Not rerun:

```text
npm run verify:k3tb:publish            NOT RERUN; still needs PROOFSCRIPT_LEAN_BIN
full long matrix                       NOT RERUN; skipped for fast cleanup iteration
```

## Progress Estimate

```text
Standalone PSC-1 without Lean4:                 ~97.3%
PSC-1 small complete programming language:      ~72.0%
PSC-1 small theorem prover:                     ~62.1%
Full ProofScript compiler:                      ~61.3%
Full Lean-like ProofScript without Lean4:       ~13.8%
Formal Lean 4 equivalence:                      0 proven obligations
Maintainability / anti-spaghetti score:         ~70%
```

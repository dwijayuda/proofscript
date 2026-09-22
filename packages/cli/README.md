# @proofscript/cli

Internal modular CLI orchestration package.

The repository root `proofscript` package and `bin/psc.mjs` are the sole public owners of the `psc` executable. This workspace package remains internal while command/workflow logic is converged behind the canonical `@proofscript/compiler` facade.

It must not define an independent parser, elaborator, checker, or trust claim.

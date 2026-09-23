# ProofScript PS1 Closure Milestone

PS1 is the cleanup-and-closure milestone for the current ProofScript implementation.

## Goal

Preserve the working KA146 language/toolchain behavior while reducing architectural drift and establishing one canonical multi-package dependency graph.

PS1 is complete when all of the following are true:

- the canonical `.ps -> frontend -> checked Core -> kernel` path remains working;
- valid representative ProofScript programs are accepted;
- invalid representative programs are rejected;
- JavaScript/TypeScript-targeted builds remain executable for the supported runtime subset;
- theorem/proof declarations remain non-runtime artifacts;
- the canonical compiler API is explicit and is the shared programmatic entry point for CLI and future editor tooling;
- package ownership and dependency direction are documented and mechanically checked;
- overlapping frontend implementations have an explicit disposition;
- the LSP restoration plan targets a stable language-service boundary instead of compiler internals;
- PS1 CI is green.

## Required PS1 gates

At minimum:

```bash
npm run build
npm run test:ka137
npm run test:ka140
npm run test:ka146
```

Additional focused tests must be added before deleting or consolidating behavior.

## Architecture policy

ProofScript remains an npm-workspaces monorepo. Separate packages are retained when they represent a real trust, compilation, runtime, assurance, or editor boundary.

PS1 does **not** flatten the repository into one npm package.

The cleanup target is fewer overlapping responsibilities, not fewer files for their own sake.

## In scope

- package classification and dependency cleanup;
- strengthening `@proofscript/compiler` as the canonical programmatic pipeline API;
- selecting one canonical frontend path;
- auditing and eventually eliminating duplicate frontend/bridge architecture after behavior is migrated;
- separating product code from assurance/history scaffolding;
- restoring editor tooling through a stable language-service API;
- adding focused CI and acceptance gates;
- deleting genuinely empty or obsolete package scaffolds only after dependency checks.

## Out of scope until the canonical pipeline is stable

- new language features;
- new runtime backends;
- WASM work;
- Rust/Go/PHP/Python backends;
- a new plugin architecture;
- expanding Lean parity claims;
- LSP feature expansion beyond restoration/adaptation;
- broad rewrites of the kernel.

## Anti-drift rule

A PS1 change must do at least one of:

1. reduce a demonstrated architectural overlap;
2. make a package boundary explicit;
3. remove proven-dead scaffolding;
4. make an existing working behavior pass through the canonical API;
5. add a regression/acceptance test for existing behavior;
6. fix a demonstrated correctness or integration bug.

Ideas outside those categories go to the backlog instead of the implementation.


---

## Product-v1 closure checkpoint

The later Product-v1 completion milestone is now closed independently of the
historical PS1 architecture milestone.

Closure source commit:

`0abea67df1bef85a567cb08ce52ef9ab8382b543`

Strict Product-v1 acceptance result on 2026-09-23:

- 25/25 gates passed;
- 0 failed;
- 0 skipped;
- verification end-test 8/8 passed;
- loop proof matrix 3/3 proved;
- stateful proof matrix 15/15 proved;
- all state models adequate;
- diagnostic mode false;
- `allProductV1GatesPassed = true`.

Detailed evidence and nonclaims: `docs/PRODUCT_V1_CLOSEOUT.md`.

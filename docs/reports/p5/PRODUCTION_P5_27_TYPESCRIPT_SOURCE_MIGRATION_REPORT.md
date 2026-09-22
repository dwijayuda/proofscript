# P5.27 TypeScript Source Migration Feature Report

## Scope

P5.27 migrates repository-owned executable/tooling source files from `.ts` and `.cjs` to `.ts` and `.cts`. It covers tool scripts, smoke tests, integration tests, release utilities, templates, example ProofScript configs, and plugin example entry points.

## Out of scope

Generated package output under `dist/`, installed dependencies under `node_modules/`, vendored npm tarballs, and lockfile package metadata are not repository-owned source and are not rewritten. The migration does not add a new ProofScript language primitive and does not alter the trusted-boundary K3-TB claim.

## Execution model

Source-tree scripts run on Node 22 using:

```bash
NODE_OPTIONS="--experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON"
```

The existing package TypeScript project references still compile package source into `dist/` for normal CLI/runtime consumption.

## Evidence

Required checks:

```bash
npm run build -- --pretty false
npm run test:architecture
npm run test:typescript-migration
node tools/pslive-list-array-any-all-tests.ts
node tools/verify-p5-controlled-release.ts
node tools/conformance-runner.ts
```

## Trust caveat

K3-TB remains a trusted-boundary engineering claim. P5.27 does not prove formal Lean 4 equivalence, and `formalLean4EquivalenceProvenObligations` remains `0`.

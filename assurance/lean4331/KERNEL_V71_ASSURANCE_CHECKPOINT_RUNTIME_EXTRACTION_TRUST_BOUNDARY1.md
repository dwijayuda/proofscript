# Kernel v71 Runtime/Extraction Trust-Boundary Certificate 1

Status: **PASS**

Overall v71 K3-track progress: **97%**

This checkpoint records the current runtime/extraction trust boundary. It adds a reproducible TypeScript build gate, emitted kernel package completeness audit, local CommonJS closure audit, dynamic-runtime exclusion audit over emitted JavaScript, runtime smoke vectors over `packages/kernel/dist/index.js`, and a source/dist hash ledger.

## Formal target

- Target: `ProofScriptKernelEquivalence.KernelV71RuntimeExtractionTrustBoundary`
- Source: `assurance/lean4331/formal/ProofScriptKernelEquivalence/KernelV71RuntimeExtractionTrustBoundary.lean`
- Formal stack files: 46
- Reported `sorryAx`: 0

## Runtime/extraction audit

- Node: `v22.16.0`
- npm: `10.9.2`
- TypeScript package: `file:vendor/npm/typescript-5.8.3.tgz`
- TypeScript target/module: `ES2022` / `CommonJS`
- Kernel source files: 7
- Emitted JS files: 7
- Emitted declaration files: 7
- Emitted map files: 14
- Missing emitted artifacts: 0
- Non-local emitted requires: 0
- Banned emitted dynamic-runtime hits: 0
- Runtime vectors: 6
- Runtime-vector failures: 0
- Source ledger hash: `d29dea20a7eaa790ba3a4b29d31324e9b6dffd9777bbef52d3a086105dc16e3c`
- Dist ledger hash: `c8fe23d3dcb999d3be663a48495a61b8865fab1a2ccc9084f01d3d77326e4421`
- Extraction pair hash: `26ef4407c5dcdb3f3ed592566ec62f7453f84dfdcf6d1012351cc916d77c3763`

## Boundary

This is still not final K3. Node, ECMAScript, npm, and the TypeScript compiler remain trusted infrastructure. This certificate does not prove a full JavaScript runtime semantics, verified TypeScript compiler, arbitrary Lean acceptance completeness, or the final whole-kernel K3 theorem.

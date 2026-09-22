# ProofScript Production P4.66 — Standalone TypeScript Emitter MVP

## Status

P4.66 continues the standalone MVP by adding a direct `pslive build-ts` command. The command checks a `.ps` source through the existing PSC-1 frontend and kernel-backed Core artifact path, then emits a standalone `.ts` module for the executable small subset.

This is still **K3-TB trusted-boundary** work. It does not claim full formal K3, full Lean 4 kernel equivalence, or full ProofScript language coverage.

## What changed

- Added `emitTypeScriptModule(...)` to `@proofscript/backend-typescript`.
- Added `psc1RuntimeTypeScriptSource(...)` to `@proofscript/runtime`.
- Added `pslive build-ts <file.ps> --out <out.ts> [--json]`.
- Added a regression test: `npm run test:pslive:build-ts`.
- The generated TypeScript module:
  - preserves the trust label and `requiresLean4: false` manifest,
  - exports sanitized TypeScript identifiers as named exports,
  - preserves original ProofScript names in the default export object,
  - typechecks under `tsc --strict`,
  - compiles to CommonJS and runs under Node for the tested PSC-1 subset.

## TDD evidence

The first regression test was written before implementation and failed because `pslive build-ts` was not a command yet:

```txt
Usage:
  node tools/pslive.ts status [--json]
  node tools/pslive.ts check <file.ps> [--json] [--emit-core <out.json>]
  node tools/pslive.ts build-js <file.ps> --out <out.js> [--json]
  node tools/pslive.ts run <file.ps> --call <name> [--args a,b] [--json]
  node tools/pslive.ts smoke [--json]
```

Then the implementation was added and the test passed.

## Verified commands

```txt
npm run build -- --pretty false
npm run test:kernel:typechecker
npm run test:kernel:smoke
npm run test:standalone-small
npm run test:pslive:build-ts
npm run test:governance
node tools/pskernel.ts status --json
```

## Known limits

- Generated TypeScript uses a deliberately broad `PsValue = any` boundary for executable exports while the source-level ProofScript checker remains the authority.
- It is a runnable TypeScript MVP output, not a full TypeScript type-preserving backend.
- It does not add String/UInt/Float/IO/effects/general recursion.
- Fully formal K3 equality remains future v72 work.

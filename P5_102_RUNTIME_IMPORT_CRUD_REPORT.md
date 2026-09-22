# P5.102 Runtime Import + CRUD Example Report

Checkpoint: **P5.102 — runtime-import-crud0**
Status: **PROFILE_CLI_RUNTIME_IMPORT_CRUD_CHECKPOINT_FROZEN**
Baseline: `proofscript-software-profile-v0-p5-101-professional-build0.zip`
Baseline SHA-256: `ace6c219a7a5fbe690b78faa5b8de90aa43c52cbf2c971aa746eb60c7df95f67`

## Scope

This checkpoint changes the software-profile CLI / TypeScript backend output architecture and example suite only. It does **not** change kernel semantics, kernel-codec semantics, arena importer semantics, trusted computation rules, or the Lean 4 compatibility baseline.

## Main changes

- Default TypeScript backend output now uses a separated local runtime file.
- Default app output remains professional `dist/` layout.
- Generated TypeScript imports the local runtime using NodeNext/ESM-compatible `.js` specifiers.
- Bundled single-file runtime output remains available through `--bundle-runtime`.
- Package-runtime import mode is exposed for future npm-package workflows.
- Generated apps include `tsconfig.generated.json` for compiling generated TypeScript to JavaScript.
- `psc compile` writes a shared `dist/proofscript-runtime.ts` once per output directory.
- Added a larger CRUD-style task-store example under `examples/software-profile/crud-app/`.
- Added official bounded conformance subcommands so release verification does not depend on one long opaque conformance process.

## Output layout

Default:

```text
dist/
  Main.ts
  proofscript-runtime.ts
  proofscript.manifest.json
```

Generated imports:

```ts
import { __ps, __proofscript } from "./proofscript-runtime.js";
import type { PsValue } from "./proofscript-runtime.js";
```

Bundled mode:

```bash
psc build --bundle-runtime
```

Package runtime mode:

```bash
psc build --runtime package
```

## CRUD example

The CRUD example demonstrates the current supported small language through a pure immutable task-store model. It includes inductives, structures, functions, lists, options, except values, updates, filters, maps, folds, and smoke theorems. It intentionally avoids unsupported contracts, unsafe modes, or pretending that backend execution correspondence has been formally proved.

Important demonstrated source forms include:

- `inductive Priority`
- `inductive TaskStatus`
- `structure Task`
- `structure TaskStore`
- `function createTask`
- `function findTask`
- `function updateStatus`
- `function deleteTask`
- `function totalEstimate`
- `Except(String, TaskStore)`
- `Option(Task)`
- `List.find?`, `List.map`, `List.filter`, `List.foldl`
- `theorem ... := by { rfl }` smoke proofs

## TDD evidence

RED evidence captured the previous behavior:

- default build embedded runtime instead of emitting `dist/proofscript-runtime.ts`;
- CRUD fixture/config did not exist;
- separated runtime TypeScript compiled to JavaScript could fail with `Cannot find module './proofscript-runtime'`;
- monolithic conformance was too opaque for bounded release verification.

GREEN evidence:

- `test:psc:runtime-import-crud` passes;
- default output emits `dist/Main.ts`, `dist/proofscript-runtime.ts`, and `dist/proofscript.manifest.json`;
- `Main.ts` imports `./proofscript-runtime.js`;
- bundled mode remains self-contained;
- package runtime mode imports `@proofscript/runtime`;
- generated app TypeScript compiles and executes as JavaScript;
- CRUD example checks, builds, compiles to JavaScript, and executes;
- `test:psc:conformance-bounded` validates official bounded conformance scripts and a positive-core smoke.

## Verification gates

Development/clean verification passed:

- `npm install --offline --no-audit --no-fund`
- `npm run setup -- --pretty false`
- `npm run build -- --pretty false`
- `npm run test:psc:adapter`
- `npm run test:psc:init`
- `npm run test:psc:simple`
- `npm run test:psc:professional-build`
- `npm run test:psc:windows-simple-setup`
- `npm run test:psc:runtime-import-crud`
- `npm run test:psc:conformance-bounded`
- `npm run verify:profile:software`
- `npm run test:standalone-small`
- `npm run test:typescript-migration`
- `npm run test:kernel:smoke`

Official bounded conformance suites passed individually:

- `test:conformance:positive:core` — 8 cases
- `test:conformance:positive:k2c-k2j` — 8 cases
- `test:conformance:positive:k2k-k2r` — 8 cases
- `test:conformance:negative:core` — 11 cases
- `test:conformance:negative:k2d-k2f` — 11 cases
- `test:conformance:negative:k2g-k2j` — 15 cases
- `test:conformance:negative:k2k-k2m` — 10 cases
- `test:conformance:negative:k2n-k2r` — 12 cases

Total bounded conformance coverage: **83 cases**.

Clean-source smoke passed:

- initial `node_modules`: 0
- initial `dist`: 0
- initial `dist-js`: 0
- initial `*.tsbuildinfo`: 0
- initial nested ZIP: 0
- intentional vendored npm tarballs: 3
- `npm link`
- `psc doctor`
- `psc doctor --json`
- `psc init smoke-app`
- `psc check`
- `psc build`
- `psc compile src --out-dir dist`
- generated TypeScript to JavaScript compilation
- generated JavaScript execution
- CRUD `psc check`
- CRUD `psc build`
- CRUD TypeScript to JavaScript compilation
- CRUD JavaScript execution

## Claim boundaries

- Kernel changed: **NO**
- Kernel-codec changed: **NO**
- Arena importer changed: **NO**
- Trusted computation changed: **NO**
- Lean required by runtime: **NO**
- Full Lean 4 equivalence claimed: **NO**
- Same theory as full Lean 4 claimed: **NO**
- Fully formal K3 claimed: **NO**
- Backend execution-correspondence proof claimed: **NO**

The separated runtime supports executable TypeScript output for the currently supported software-profile subset. It is not a proof checker and not a proof of runtime correspondence.

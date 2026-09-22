# P5.101 Professional Build0 Report

Status: **PROFILE CLI PROFESSIONAL BUILD CHECKPOINT FROZEN**

## Baseline

Selected newest valid baseline artifact: `proofscript-software-profile-v0-p5-100-windows-simple-setup1.zip`.

Baseline SHA-256:

```text
91f3409aa47e64a748c7ba9f61dd57178e798a5883b87dd21995b0f6276d0c59
```

P5.101 is a tooling/build-system checkpoint only. It preserves the PSC-1 software-profile trust boundary and does not change kernel source, kernel-codec semantics, Arena importer behavior, or trusted computation rules.

## User problem addressed

The previous Windows setup checkpoint made installation robust, but initialized apps still felt prototype-like:

- default output directory was `generated/` instead of conventional `dist/`;
- config did not describe the build target/output as a build system;
- generated package scripts lacked `clean` and preferred explicit target scripts;
- parser errors surfaced raw offsets rather than actionable file/line diagnostics;
- explicit relative paths passed from initialized projects could be resolved from the repository root when delegated through `tools/pslive.ts`.

## Changes

- `bin/psc.mjs`
  - version bumped to `0.1.0-production-p5.101-professional-build0`;
  - default project output changed to `dist/`;
  - generated `proofscript.config.json` now includes `build.target`, `build.outDir`, and `diagnostics.sourceLocations`;
  - generated package scripts now include `clean`, `build:ts = psc build --target ts`, and `build:js = psc build --target js`;
  - added `psc clean` with output-directory path-safety checks;
  - `psc doctor --json` reports project config, build-system defaults, and diagnostics capability;
  - explicit relative source paths are resolved from the user's current working directory before delegation.
- `tools/pslive.ts`
  - source-offset errors now render `file:line:column`, source excerpt, and caret;
  - JSON errors include `file`, `line`, `column`, and excerpt when available.
- `packages/parser/src/tokenize.ts`
  - JavaScript `//` comment rejection now carries an offset, enabling line/column diagnostics.
- Tests
  - added `tools/psc-professional-build-tests.ts`;
  - updated P5.99/P5.100 CLI tests for `dist/` defaults and target-oriented build scripts.
- Documentation
  - updated README and CLI docs for the P5.101 professional build flow.

## TDD evidence

RED test written before implementation:

```text
node --experimental-strip-types ... tools/psc-professional-build-tests.ts
RED_STATUS=1
AssertionError: expected defaultOutDir to be 'dist'; actual was undefined/generated-style behavior
```

After the first implementation, the same test exposed a second real bug:

```text
rejected: entry source file not found: .../repo/src/Broken.ps
```

Root cause: explicit relative paths from an initialized app were delegated to `tools/pslive.ts` with repository-root resolution instead of user-current-working-directory resolution.

Final GREEN:

```text
PSC_PROFESSIONAL_BUILD0=PASS
```

## Verification

Development verification passed:

```text
npm install --offline --no-audit --no-fund: PASS
npm run setup -- --pretty false: PASS
npm run build -- --pretty false: PASS
npm run test:psc:professional-build: PASS
npm run test:psc:adapter: PASS
npm run test:psc:init: PASS
npm run test:psc:windows-simple-setup: PASS
npm run verify:profile:software: PASS
npm run test:conformance: PASS
npm run test:standalone-small: PASS
npm run test:typescript-migration: PASS
npm run test:kernel:smoke: PASS
```

Clean-source verification passed from an extracted source-only ZIP:

```text
initial node_modules: 0
initial dist: 0
initial .tsbuildinfo: 0
initial nested zip: 0
intentional vendored npm tarballs: 3
npm install --offline --no-audit --no-fund: PASS
npm run setup: PASS
npm run build -- --pretty false: PASS
npm link: PASS
psc doctor: PASS
psc doctor --json: PASS
psc init smoke-app: PASS
psc check: PASS
psc build: PASS
psc compile src --out-dir dist: PASS
psc clean: PASS
```

## Boundaries

- Kernel changed: **NO**
- Kernel-codec changed: **NO**
- Arena importer changed: **NO**
- New trusted computation rule: **NO**
- Full Lean 4 equivalence claimed: **NO**
- Same theory as full Lean 4 claimed: **NO**
- Fully formal K3 claimed: **NO**
- Backend execution-correspondence proof claimed: **NO**

ProofScript Software Profile is becoming usable as a small correctness-focused language, but language-feature completion and Lean 4 equivalence are not finished.

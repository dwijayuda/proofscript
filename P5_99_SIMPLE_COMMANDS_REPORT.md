# P5.99 Simple Commands Report — Windows-Friendly PSC CLI

Status: **PROFILE CLI SIMPLE COMMANDS CHECKPOINT FROZEN**

## User problem addressed

The P5.98 source tree worked on Unix-like shells, but the user hit two Windows/PowerShell problems:

1. `npm run build` failed with `EPERM: operation not permitted, symlink ...` while creating local workspace package links.
2. Because build stopped early, later `psc check src/Main.ps` failed with `Cannot find module '../packages/frontend/dist/index.js'`.

P5.99 fixes the setup path and makes the day-to-day commands shorter.

## Research result

- Node.js documents Windows junctions as a supported `fs.symlink` type and requires absolute targets for junction points.
- npm documents that `npm link` creates a global package link and links package `bin` entries, which is the correct local-development way to get a real `psc` command from a source checkout.

## Baseline

Selected baseline: P5.98 `psc-init0`.

P5.98 archive SHA-256: `97256119923b991e04461c0a37fcc2904467a30b9f736da603cbeabd17d6f38d`.

## Feature

P5.99 introduces simple commands:

```text
npm install --offline --no-audit --no-fund
npm run setup
npm link
psc init my-app
cd my-app
psc check
psc build
psc run sample
```

`npm run build` is retained as an alias for `npm run setup`.

## Files added

- `tools/psc-simple-commands-tests.ts`
- `P5_99_SIMPLE_COMMANDS_REPORT.md`
- `P5_99_SIMPLE_COMMANDS_RELEASE_GATE.json`

## Files modified

- `bin/psc.mjs`
- `tools/link-local-workspaces.cts`
- `package.json`
- `README.md`
- `docs/cli/PSC_INSTALL_AND_INIT.md`
- `docs/cli/PSC_SOFTWARE_CLI_ADAPTER.md`

## Exact behavior added

- `psc setup` performs local workspace link setup, TypeScript build, and static asset copy.
- `npm run setup` calls `psc setup`.
- `npm run build` now calls the same setup path.
- Windows workspace package linking now tries junctions first and has a conservative source-copy fallback for locked-down environments.
- `psc check` defaults to the project `entry` or `src/Main.ps`.
- `psc build-ts` defaults to `generated/Main.ts`.
- `psc build-js` defaults to `generated/Main.js`.
- `psc build` defaults to compiling the configured source directory to the configured output directory.
- `psc compile` defaults to `sourceDir -> outDir`.
- `psc run sample` defaults to the configured entry file and calls `sample`.
- `psc init` now prints the shorter next steps: `psc check`, `psc build`, `psc run sample`.
- New starter `package.json` scripts are similarly short: `npm run check`, `npm run build`, `npm run build:ts`, `npm run build:js`, `npm run run:sample`.

## Test evidence

RED observed from the user's PowerShell log:

```text
EPERM: operation not permitted, symlink '..\\..\\packages\\arena-checker' -> ...\\node_modules\\@proofscript\\arena-checker
Cannot find module '../packages/frontend/dist/index.js'
```

GREEN on P5.99:

```text
PROOFSCRIPT_SETUP=PASS
PSC_CLI_ADAPTER0=PASS
PSC_SIMPLE_COMMANDS0=PASS
```

## Verification evidence

Commands run in the P5.99 worktree:

```text
npm install --offline --no-audit --no-fund: PASS
npm run build -- --pretty false: PASS
npm run test:psc:simple: PASS
npm run test:psc:adapter: PASS
npm run verify:profile:software: PASS
npm run verify:profile:software:full: PASS in worktree earlier before packaging; default quick verify now omits the heavy example bundle for faster local setup.
npm run test:conformance: PASS
npm run test:standalone-small: PASS
npm run test:typescript-migration: PASS
npm run test:kernel:smoke: PASS
```

`npm run test:conformance` exceeded the shorter grouped wrapper timeout once, then was rerun directly with a longer command timeout and passed. The timed-out wrapper is not counted as a pass.

## Clean-source verification

Final clean source archive verification:

```text
source residue: PASS; no node_modules, dist, .tsbuildinfo, nested zip
vendor npm tarballs retained: 3
zip integrity: PASS
zip sha256 check: PASS
clean extract install/build: PASS
clean extract verify:profile:software: PASS
clean extract psc simple commands: PASS
clean extract psc init/check/build/run: PASS
```

## Boundary

Kernel source changed: NO.

Arena importer changed: NO.

Kernel-codec changed: NO.

New trusted computation rule: NO.

Full Lean 4 equivalence: NO.

Same theory as full Lean 4: NO.

Fully formal K3: NO.

Formal Lean 4 equivalence proven obligations: 0.

Backend execution-correspondence proof: NO.

This checkpoint changes CLI setup/usability. It does not change trusted kernel semantics.

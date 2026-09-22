# P5.100 Windows Simple Setup Report — Copy-Fallback Dist Refresh

Status: **PROFILE CLI WINDOWS SIMPLE SETUP CHECKPOINT FROZEN**

## Selected baseline

Selected baseline: attached `proofscript-software-profile-v0-p5-99-simple-commands0 (1).zip`.

Attached archive SHA-256: `c429443ebadcea0b3874559bb967f10e73a1561d4774aea9a448b9342bc3831f`.

The archive is a valid P5.99 `simple-commands0` checkpoint with an embedded release gate. It was used as the baseline because it is newer than the known P5.98 checkpoint.

## User failure addressed

The original Windows/PowerShell symptom was:

```text
EPERM: operation not permitted, symlink '..\..\packages\arena-checker'
Cannot find module '../packages/frontend/dist/index.js'
```

This is a packaging/setup failure, not a ProofScript language or kernel failure. A locked-down Windows environment can reject local workspace symlinks; if setup then stops before `packages/*/dist` exists, the globally linked `psc` command cannot load the frontend package.

P5.99 already added a copy fallback, but deterministic testing found one remaining edge case: when fallback-copy mode is used before the TypeScript build, the copied `node_modules/@proofscript/*` packages can miss the freshly produced `dist/` directories. P5.100 refreshes workspace links/copies after the TypeScript build and copies `dist/` into fallback directories when present.

## Files added

- `tools/setup-local-workspaces.cts`
- `tools/psc-windows-simple-setup-tests.ts`
- `P5_100_WINDOWS_SIMPLE_SETUP_REPORT.md`
- `P5_100_WINDOWS_SIMPLE_SETUP_RELEASE_GATE.json`

## Files modified

- `bin/psc.mjs`
- `tools/link-local-workspaces.cts`
- `package.json`
- `package-lock.json`

## Exact behavior added

- `npm run test:psc:windows-simple-setup` is now a real verification gate.
- `tools/link-local-workspaces.cts` supports deterministic fallback testing through `PROOFSCRIPT_FORCE_WORKSPACE_LINK_COPY=1` and `PROOFSCRIPT_TEST_SYMLINK_EPERM=1`.
- Recoverable symlink/junction failures (`EPERM`, `EACCES`, `EXDEV`, `EINVAL`, `UNKNOWN`) fall back to managed source copy instead of aborting setup.
- Fallback copies include `dist/` when present.
- `psc setup` now runs workspace link/copy setup before the TypeScript build and refreshes it after the build, so copied workspace packages receive generated `dist/` files.
- `psc doctor --json` reports Node version, platform, PowerShell script compatibility, package `dist` status, local workspace link/copy status, whether `psc check` can run, and `requiresLean4:false`.

## TDD evidence

RED before P5.100 changes:

```text
npm run test:psc:windows-simple-setup
→ Missing script: "test:psc:windows-simple-setup"
```

A deterministic fallback probe also showed `PROOFSCRIPT_FORCE_WORKSPACE_LINK_COPY=1` was ignored by P5.99: links were still reported with `mode: "symlink"`.

First GREEN exposed a real bug:

```text
Cannot find module 'node_modules/@proofscript/frontend/dist/index.js'
```

Final GREEN after P5.100:

```text
PSC_WINDOWS_SIMPLE_SETUP0=PASS
npm run test:conformance=PASS
```

The new test verifies forced copy fallback, simulated symlink `EPERM`, post-build `node_modules/@proofscript/frontend/dist/index.js`, `psc doctor --json`, `psc init`, no-argument `psc check`, no-argument `psc build`, and `psc compile src --out-dir generated`.

## Verification evidence

Worktree gates:

```text
npm install --offline --no-audit --no-fund: PASS
npm run setup -- --pretty false: PASS
npm run build -- --pretty false: PASS
npm run test:psc:adapter: PASS
npm run test:psc:init: PASS
npm run test:psc:windows-simple-setup: PASS
npm run verify:profile:software: PASS
npm run test:conformance: PASS
npm run test:standalone-small: PASS
npm run test:typescript-migration: PASS
npm run test:kernel:smoke: PASS after bounded rerun; grouped command timed out while entering this final gate and was not counted as a pass
```

Clean-source verification:

```text
initial node_modules: 0
initial dist: 0
initial .tsbuildinfo: 0
initial nested zip: 0
intentional vendor npm tarballs: 3
npm install --offline --no-audit --no-fund: PASS
npm run setup: PASS
npm run build -- --pretty false: PASS
npm link: PASS
psc doctor: PASS
psc doctor --json: PASS
psc init smoke-app: PASS
cd smoke-app && psc check: PASS
psc build: PASS
psc compile src --out-dir generated: PASS
```

## Boundary

Kernel source changed: **NO**.

Kernel-codec changed: **NO**.

Arena importer changed: **NO**.

New trusted computation rule: **NO**.

Full Lean 4 equivalence: **NO**.

Same theory as full Lean 4: **NO**.

Fully formal K3: **NO**.

Backend execution-correspondence proof: **NO**.

This checkpoint changes setup/CLI robustness only. It does not change trusted semantics.

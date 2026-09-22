# P5.98 PSC Init Report — Software Profile Starter Project

Status: **PROFILE CLI INIT CHECKPOINT FROZEN**

## Question

Add `psc init` and explain how to install ProofScript so the user has a real `psc` command.

## Answer

Yes. P5.98 adds `psc init` to the thin Software Profile CLI adapter. The command scaffolds a small ProofScript Software Profile project while preserving the existing P5.97 trust boundary.

## Behavior now available

```text
psc init [dir] [--name <name>] [--template software] [--force] [--json]
```

Generated starter files:

```text
README.md
.gitignore
package.json
proofscript.config.json
src/Main.ps
```

The generated `src/Main.ps` uses only the current small Software Profile subset: `function`, `def`, `Nat`, `Bool`, `if`, and a `by rfl` theorem.

## Install paths documented

`docs/cli/PSC_INSTALL_AND_INIT.md` documents three supported ways to use the CLI:

1. Direct source-tree invocation: `node bin/psc.mjs ...`.
2. Development command install: `npm link`.
3. Global install from source: `npm install -g .`.

Windows PowerShell remains supported because root scripts use direct Node flags rather than Unix `export NODE_OPTIONS`.

## Files added/modified

Added:

- `docs/cli/PSC_INSTALL_AND_INIT.md`
- `P5_98_PSC_INIT_REPORT.md`
- `P5_98_PSC_INIT_RELEASE_GATE.json`

Modified:

- `bin/psc.mjs`
- `docs/cli/PSC_SOFTWARE_CLI_ADAPTER.md`
- `tools/psc-cli-adapter-tests.ts`
- `package.json`
- `package-lock.json`

## RED/GREEN evidence

RED on P5.97:

```text
node bin/psc.mjs init /tmp/app --json
```

returned usage / unsupported command because `psc init` did not exist.

GREEN on P5.98:

```text
PSC_INIT0=PASS
```

The test verifies:

- help lists `psc init`;
- `psc init <dir> --json` succeeds;
- starter files are created;
- generated `src/Main.ps` checks successfully;
- generated `src/Main.ps` builds to TypeScript;
- non-empty directories are rejected without `--force`;
- unsupported templates return exit 2 / unsupported;
- existing `psc check`, `build-ts`, `build`, `compile`, `doctor`, `target list`, `language status`, and status smoke checks still pass.

## Verification evidence

Commands run in the P5.98 worktree:

```text
npm install --offline --no-audit --no-fund: PASS
npm run build -- --pretty false: PASS
npm run test:psc:adapter: PASS
npm run test:psc:init: PASS
npm run verify:profile:software: PASS
npm run test:conformance: PASS
npm run test:standalone-small: PASS
npm run test:typescript-migration: PASS
npm run test:kernel:smoke: PASS
```

CLI smoke observations:

```text
node bin/psc.mjs init /tmp/starter-app --name starter-app --json: PASS
node bin/psc.mjs check /tmp/starter-app/src/Main.ps --json: PASS
node bin/psc.mjs build-ts /tmp/starter-app/src/Main.ps --out /tmp/starter-app/generated/Main.ts --json: PASS
node bin/psc.mjs compile examples/software-profile/src --out-dir /tmp/out --json: PASS, 5 generated .ts files
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

This checkpoint adds CLI scaffolding and install documentation. It does not change trusted kernel semantics.

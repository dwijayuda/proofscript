# PSC Software CLI Adapter

P5.97 added a source-tree `psc` wrapper. P5.98 added `psc init`. P5.99/P5.100 simplified command flow and fixed Windows workspace-link setup. P5.101 professionalized starter build defaults around `dist/`, `psc clean`, and source-location diagnostics. P5.102 separates default TypeScript output from runtime support and adds a CRUD-style software-profile example.

## Purpose

The uploaded alpha.153 compiler has a polished command shape (`psc help`, `psc run`, `psc compile`, `psc target list`, `psc doctor`) for small executable ProofScript. P5.96/P5.98 have stronger PSC-1 trusted-boundary and software-profile examples, but the user path still had too many long commands.

This adapter borrows the alpha command UX without importing alpha's compiler semantics into the trusted kernel. The wrapper delegates to the existing checked PSC-1 software-profile path.

## Simple commands

```text
psc init my-app
cd my-app
psc check
psc build
psc run sample
```

## Full command surface

```text
psc setup
psc init [dir] [--name <name>] [--template software] [--force] [--json]
psc status [--json]
psc check [file.ps] [--json] [--emit-core <out.json>]
psc build-ts [file.ps] [--out <out.ts>] [--runtime local|package|bundled] [--bundle-runtime] [--json]
psc build-js [file.ps] [--out <out.js>] [--json]
psc build [file.ps] [--target ts|js] [--out <file>] [--runtime local|package|bundled] [--bundle-runtime] [--json]
psc compile [file.ps|dir] [--out-dir <dir>] [--suffix .generated] [--runtime local|package|bundled] [--bundle-runtime] [--json]
psc run [file.ps] [--call <name>] [--args a,b] [--json]
psc run <name> [--args a,b] [--json]
psc target list
psc language status
psc doctor
psc clean [--json]
```

## Defaults

Inside a project with `proofscript.config.json`:

- `psc check` checks `entry` or `src/Main.ps`.
- `psc build-ts` emits `dist/Main.ts` unless `--out` is supplied.
- `psc build-js` emits `dist/Main.js` unless `--out` is supplied.
- `psc build` compiles the configured source directory to the configured output directory.
- `psc compile` defaults to `sourceDir -> outDir`.
- TypeScript output uses local runtime import by default: `dist/Main.ts` imports `./proofscript-runtime.js`, backed by the sibling `dist/proofscript-runtime.ts` source file for NodeNext/ESM compilation.
- `--bundle-runtime` emits the older self-contained single-file TypeScript output.
- `psc run sample` runs the configured entry file and calls `sample`.

## Trust boundary

- Kernel source changed: no.
- Kernel codec changed: no.
- Arena importer changed: no.
- New trusted computation rule: no.
- Full Lean 4 equivalence: no.
- Backend execution-correspondence proof: no.

`psc compile` writes TypeScript only after the existing PSC-1 `build-ts` path checks the source and emits from the checked artifact. It refuses to overwrite existing non-ProofScript-generated `.ts` files.

## Windows behavior

P5.96 npm scripts used Unix `export NODE_OPTIONS=...`, which fails in PowerShell. P5.97 changed root scripts to invoke Node with explicit flags. P5.99 additionally avoids ordinary directory symlinks on Windows by trying junctions first, then a conservative source-copy fallback for local `@proofscript/*` resolution.

## Installation

Build the source checkout, then register a real command with `npm link` / `npm install -g .`. See `docs/cli/PSC_INSTALL_AND_INIT.md`.

## Verification commands

Fast profile/CLI verification:

```bash
npm run verify:profile:software
```

Full inherited software example verification remains available as:

```bash
npm run verify:profile:software:full
```


## P5.100 Windows Simple Setup1

P5.100 keeps the P5.99 simple `psc` commands but hardens locked-down Windows setup. Workspace linking now has deterministic forced-copy and simulated-EPERM test modes, recoverable symlink/junction failures fall back to managed copies, `psc setup` refreshes those copies after TypeScript build output exists, and `psc doctor --json` reports package `dist` status, workspace link/copy status, `psc check` smoke status, and `requiresLean4: false`. Kernel semantics, kernel-codec semantics, and Arena importer behavior are unchanged.


## P5.101 Professional Build0

The generated starter project now treats `dist/` as build output and records this in `proofscript.config.json`:

```json
{
  "entry": "src/Main.ps",
  "sourceDir": "src",
  "outDir": "dist",
  "build": { "target": "ts", "outDir": "dist" },
  "diagnostics": { "sourceLocations": true }
}
```

`psc check`, `psc build`, `psc compile`, and `psc run sample` remain the simple path. `psc build --target ts` and `psc build --target js` are the preferred explicit target commands, while `build-ts`/`build-js` remain compatibility aliases. `psc clean` removes configured output after path-safety checks.

When parser errors include offsets, `psc` now reports file/line/column plus a source excerpt and caret. This is diagnostic evidence only; it does not expand the language subset.


## P5.102 Runtime Import + CRUD Example0

Default `psc build` / `psc compile` output is now split into program, runtime, and manifest files. This keeps generated modules cleaner, avoids embedding the runtime repeatedly for multi-file projects, and makes the boundary between generated app code and executable support code visible.

The larger `examples/software-profile/crud-app` fixture demonstrates a small but complete current-language application style: immutable create/read/update/delete functions, validation with `Except`, lookup with `Option`, collection transformations with `List`, and executable smoke theorems checked before TypeScript emission.

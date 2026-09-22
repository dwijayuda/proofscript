# Installing `psc` and Creating a ProofScript Project

P5.102 keeps the Windows-safe P5.100/P5.101 setup path and upgrades TypeScript output to a professional local-runtime layout: `dist/Main.ts`, `dist/proofscript-runtime.ts`, and `dist/proofscript.manifest.json`.

## Build the local toolchain

From the extracted ProofScript source tree:

```bash
npm install --offline --no-audit --no-fund
npm run setup
npm link
psc doctor
```

`npm run build` remains available, but it now delegates to the same `psc setup` path.

## Create a starter project

```bash
psc init my-proofscript-app
cd my-proofscript-app
psc check
psc build
psc run sample
```

That is the intended simple path.

## Optional explicit commands

```bash
psc build-ts
psc build --bundle-runtime
psc build --runtime package
psc build-js
psc compile
psc clean
psc check src/Main.ps
psc build-ts src/Main.ps --out dist/Main.ts
psc run src/Main.ps --call sample
```

Defaults inside a `psc init` project come from `proofscript.config.json`:

```json
{
  "entry": "src/Main.ps",
  "sourceDir": "src",
  "outDir": "dist",
  "build": { "target": "ts", "outDir": "dist" },
  "runtime": { "mode": "local", "file": "proofscript-runtime.ts" },
  "diagnostics": { "sourceLocations": true }
}
```

## Use without global install

```bash
node bin/psc.mjs setup
node bin/psc.mjs init my-proofscript-app
cd my-proofscript-app
node ../bin/psc.mjs check
```

For normal use, prefer `npm link` from the ProofScript source root so `psc` is available globally for this checkout.

## Windows behavior

P5.99 avoids Unix `export` in root package scripts and changes local workspace linking to use Windows junctions, with a source-copy fallback for locked-down machines. This addresses the `EPERM: operation not permitted, symlink ...` failure seen in PowerShell.

## Generated starter source

```ts
function loyaltyPrice(total: Nat, loyal: Bool): Nat := {
  if loyal then total - 5 else total
}

def sample: Nat := {
  loyaltyPrice(100, true)
}

theorem sample_eq: sample = 95 := by rfl
```

## Safety behavior

`psc init` refuses non-empty target directories unless `--force` is passed. Unsupported templates return `unsupported` rather than silently generating a weaker project.

Trust boundary: `psc init`, `psc setup`, and simplified defaults are CLI/product usability improvements. They do not change the kernel, Arena importer, kernel-codec, trusted computation rules, Lean equivalence claims, or backend execution-correspondence proof status.

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

P5.101 changes initialized applications to use `dist/` as the default compiler output directory. The default `psc build` compiles `sourceDir` to `outDir`; `psc build-ts` and `psc build-js` still accept explicit `--out` files; `psc compile` accepts explicit directories; and `psc clean` removes the configured output directory after safety checks.

Source parse failures now surface actionable diagnostics with file, line, column, source excerpt, and caret where the parser exposes an offset. This is a tooling improvement only; it does not change kernel semantics, kernel-codec semantics, or the PSC-1 supported language subset.


## P5.102 Runtime Import + CRUD Example0

Default TypeScript builds no longer embed the full runtime implementation in every generated file. The default output is:

```text
dist/Main.ts
dist/proofscript-runtime.ts
dist/proofscript.manifest.json
```

`psc build --bundle-runtime` keeps the old single-file output. `psc build --runtime package` emits an `@proofscript/runtime` import for package-oriented experiments, but local runtime output is the starter-project default because it works without extra package installation.

A larger executable example lives at `examples/software-profile/crud-app` and demonstrates an immutable CRUD-style task store with `structure`, `inductive`, `Option`, `Except`, and `List` operations.

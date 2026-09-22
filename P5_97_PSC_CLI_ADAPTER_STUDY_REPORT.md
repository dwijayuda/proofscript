# P5.97 PSC CLI Adapter Study Report — alpha.153 → Software Profile

Status: **PROFILE CLI ADAPTER CHECKPOINT FROZEN**

## Question

Study uploaded `proofscript-compiler-alpha-v0.1.0-alpha.153-source` and its `psc` CLI behavior. Decide whether the CLI behavior can be adapted into the current ProofScript P5.96 software-profile codebase.

## Answer

Yes. The alpha.153 CLI UX can be adapted, but the alpha compiler/kernel semantics should not be imported wholesale.

The safe adaptation is a thin `psc` wrapper over the existing P5.96 PSC-1 software-profile path:

- `psc check` delegates to `tools/pslive.ts check`.
- `psc build-ts` delegates to `tools/pslive.ts build-ts`.
- `psc build-js` delegates to `tools/pslive.ts build-js`.
- `psc build --target ts|js` is a friendly alias over `build-ts` / `build-js`.
- `psc compile <file.ps|dir>` recursively emits `.ts` files through checked `build-ts`.
- `psc run` delegates to `tools/pslive.ts run`.
- `psc status`, `psc doctor`, `psc target list`, and `psc language status` expose user-facing status/trust information.

## What alpha.153 provides

The uploaded alpha.153 package has a polished user-facing CLI shape:

```text
psc init [dir]
psc build [input]
psc compile [input]
psc gp1 [input]
psc run [input]
psc check [input]
psc prove [input]
psc status
psc clean
psc doctor
psc target list
psc language status
psc setup lean
psc lean status
psc emit-lean
```

Important alpha.153 UX ideas worth adapting:

1. A real package-level `bin` entrypoint named `psc` and `proofscript`.
2. `psc help` and command-specific help.
3. `psc compile` for embedded TS project mode: `.ps -> .ts`, directory recursion, overwrite guard.
4. `psc target list` to avoid pretending future targets are implemented.
5. `psc doctor` for environment and trust-boundary debugging.
6. `psc language status` to show profile-level status without claiming full implementation.
7. Clear non-claims: not full Lean compatibility, not arbitrary `.ps -> JS`, not formal runtime correspondence.

## What alpha.153 should not be copied directly

Do not import alpha's GP1 compiler semantics as trusted kernel semantics. Alpha.153 is useful as CLI/product UX and as a small executable-language reference, but current P5.96 has the stronger PSC-1 trusted-boundary checker, Arena evidence, conformance gates, profile examples, and explicit boundary discipline.

Specific non-adapted pieces:

- Lean-gated-by-default flow as the only safe path. Current software profile is intentionally standalone and does not require Lean for ordinary checking/emission.
- Alpha `--unsafe` public-output path. P5.97 does not add this because unsupported/unchecked behavior must remain explicit and fail-closed.
- Alpha GP1 IR internals. P5.97 keeps the existing checked PSC-1 `pslive` path.
- Alpha templates and web framework project scaffolds. These are product polish, not needed for the first safe adapter.
- Alpha cache/source-map/module-graph features. Good future work, but not required for a thin verified adapter.

## Files added/modified

Added:

- `bin/psc.mjs`
- `docs/cli/PSC_SOFTWARE_CLI_ADAPTER.md`
- `tools/psc-cli-adapter-tests.ts`
- `P5_97_PSC_CLI_ADAPTER_STUDY_REPORT.md`
- `P5_97_PSC_CLI_ADAPTER_RELEASE_GATE.json`

Modified:

- `package.json`

## Behavior now available

```text
psc status [--json]
psc check <file.ps> [--json] [--emit-core <out.json>]
psc build-ts <file.ps> --out <out.ts> [--json]
psc build-js <file.ps> --out <out.js> [--json]
psc build <file.ps> [--target ts|js] [--out <file>] [--json]
psc compile <file.ps|dir> [--out-dir <dir>] [--suffix .generated] [--json]
psc run <file.ps> --call <name> [--args a,b] [--json]
psc target list
psc language status
psc doctor
```

## PowerShell fix

P5.96 root npm scripts used Unix `export NODE_OPTIONS=...`, which fails in Windows PowerShell. P5.97 rewrites root scripts to call Node with explicit flags instead. The adapter test confirms no root package scripts contain `export NODE_OPTIONS`.

## Verification evidence

Commands run in the P5.97 worktree:

```text
npm install --offline --no-audit --no-fund: PASS
npm run build -- --pretty false: PASS
npm run test:psc:adapter: PASS
npm run verify:profile:software: PASS
npm run test:conformance: PASS
npm run test:standalone-small: PASS
npm run test:typescript-migration: PASS
npm run test:kernel:smoke: PASS
```

CLI smoke observations:

```text
node bin/psc.mjs help: PASS
node bin/psc.mjs doctor: PASS
node bin/psc.mjs target list: PASS
node bin/psc.mjs language status: PASS
node bin/psc.mjs status --json: PASS
node bin/psc.mjs check examples/software-profile/src/BusinessRules.ps --json: PASS
node bin/psc.mjs build-ts examples/software-profile/src/BusinessRules.ps --out /tmp/BusinessRules.ts --json: PASS
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

This checkpoint adapts CLI behavior and improves usability. It does not change trusted kernel semantics.

## Clean-source verification

Final clean source archive verification:

```text
source residue: PASS; no node_modules, dist, .tsbuildinfo, nested zip
vendor npm tarballs retained: 3
zip integrity: PASS
zip sha256 check: PASS
clean extract install/build: PASS
clean extract verify:profile:software: PASS
clean extract psc compile examples: PASS, 5 generated .ts files
```

Final archive SHA-256 is recorded in the sidecar `.zip.sha256` file to avoid stale/self-referential hashes inside the archive.

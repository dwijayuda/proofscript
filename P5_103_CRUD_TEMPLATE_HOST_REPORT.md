# P5.103 CRUD Template + Host Demo Report

## Checkpoint

- Name: `P5.103 — crud-template-host0`
- Status: `PROFILE_CLI_CRUD_TEMPLATE_HOST_CHECKPOINT_FROZEN`
- Baseline artifact: `proofscript-software-profile-v0-p5-102-runtime-import-crud0.zip`
- Baseline SHA-256: `263ea3f268ad21e0c3b382683acbbb3a9eb5fbece974a0c373cda1bf4ec1f3b0`

## Purpose

P5.103 keeps the P5.102 separated runtime output and adds a more professional
application/demo path:

- `psc init --template crud`
- generated immutable CRUD app source in `src/Main.ps`
- generated local runtime output in `dist/`
- TypeScript generated-output compilation through `tsconfig.generated.json`
- imperative TypeScript host glue in `host/imperative-demo.ts`
- host compilation through `tsconfig.host.json`
- executable app demo through `npm run demo`

## User-facing flow

```bash
npm install --offline --no-audit --no-fund
npm run setup
npm link
psc init my-crud-app --template crud
cd my-crud-app
psc check
psc build
npm run build:generated-js
npm run build:host
npm run start:host
```

One-command demo inside the generated CRUD project:

```bash
npm run demo
```

Expected demo summary includes:

```json
{
  "nextId": "4",
  "totalEstimate": "11",
  "foundTask3": true,
  "taskTitles": ["Ship demo", "Write spec"]
}
```

## Files changed

- `bin/psc.mjs`
  - version updated to P5.103
  - `psc init --template crud` added
  - help text now lists `software|crud`
- `package.json`
  - version updated to P5.103
  - `test:psc:crud-template` added
- `package-lock.json`
  - root version updated to P5.103
- `README.md`
  - current checkpoint section updated
- `tools/psc-crud-app-template-tests.ts`
  - new RED/GREEN test for CRUD template and host demo
- `tools/run-software-profile-verification.ts`
  - full software-profile verification now includes the CRUD template gate
- `examples/software-profile/crud-app/package.json`
  - professional host scripts added
  - removed dependency on uninstalled `tsx`
- `examples/software-profile/crud-app/tsconfig.host.json`
  - new host TypeScript build config
- `examples/software-profile/crud-app/host/imperative-demo.ts`
  - now imports from `dist-js/` and runs after generated JS compilation
- `examples/software-profile/crud-app/README.md`
  - host demo usage documented

## TDD evidence

RED test:

```text
npm run test:psc:crud-template
=> unsupported template 'crud'; supported templates: software
```

GREEN test:

```text
npm run test:psc:crud-template
=> PSC_CRUD_APP_TEMPLATE0=PASS
```

## Verification evidence

Development-tree gates:

```text
npm install --offline --no-audit --no-fund: PASS
npm run setup -- --pretty false: PASS
npm run build -- --pretty false: PASS
npm run test:psc:crud-template: PASS
npm run test:psc:runtime-import-crud: PASS
npm run test:psc:professional-build: PASS
npm run test:psc:windows-simple-setup: PASS
npm run test:psc:init: PASS
npm run test:psc:adapter: PASS
npm run verify:profile:software: PASS
npm run verify:profile:software:full: PASS
npm run test:psc:conformance-bounded: PASS
npm run test:standalone-small: PASS
npm run test:typescript-migration: PASS
npm run test:kernel:smoke: PASS
```

Clean-source verification:

```text
initial node_modules: 0
initial dist: 0
initial dist-js: 0
initial dist-host: 0
initial .tsbuildinfo: 0
initial nested ZIP: 0
intentional vendored npm tarballs: 3

npm install --offline --no-audit --no-fund: PASS
npm run setup -- --pretty false: PASS
npm run build -- --pretty false: PASS
npm run test:psc:crud-template: PASS
npm run test:psc:runtime-import-crud: PASS
npm run test:psc:adapter: PASS
npm run test:psc:init: PASS
npm run test:psc:simple: PASS
npm run test:psc:professional-build: PASS
npm run test:psc:windows-simple-setup: PASS
npm run test:psc:conformance-bounded: PASS
npm run test:standalone-small: PASS
npm run test:typescript-migration: PASS
npm run test:kernel:smoke: PASS
```

Clean global/linked smoke:

```text
npm link: PASS
psc doctor: PASS
psc doctor --json: PASS
psc init smoke-app --template crud --json: PASS
psc check: PASS
psc build: PASS
tsc -p tsconfig.generated.json: PASS
tsc -p tsconfig.host.json: PASS
node dist-host/imperative-demo.js: PASS
psc compile src --out-dir dist: PASS
```

## Scope boundary

- Kernel changed: NO
- Kernel-codec changed: NO
- Arena importer changed: NO
- Trusted computation changed: NO
- Runtime output architecture changed: NO new change beyond P5.102; P5.103 uses it
- CRUD app template added: YES
- Imperative TypeScript host demo added: YES
- Lean required by runtime: NO
- Full Lean 4 equivalence claimed: NO
- Same theory as full Lean 4 claimed: NO
- Fully formal K3 claimed: NO
- Backend execution-correspondence proof claimed: NO
- Contracts implemented: NO

P5.103 is a software-profile CLI/demo checkpoint. It does not modify trusted
kernel semantics.

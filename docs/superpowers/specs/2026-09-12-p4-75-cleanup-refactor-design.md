# P4.75 Cleanup Refactor Design

## Goal

Stabilize the P4.74 standalone PSC-1 MVP before adding more language features by reducing parser/backend/tooling coupling while preserving the current K3-TB trust boundary and all existing checked behavior.

## Current baseline

P4.74 is a standalone small-subset ProofScript MVP. It includes a TypeScript kernel package, checked standard bootstrap, parser/elaborator/frontend flow, JS/TS backend, runtime helpers, `pslive` tooling, many release/governance tools, and many one-off smoke tests. The project remains K3-TB trusted-boundary work, not fully formal K3, and has 0 formally proven Lean 4 equivalence obligations.

## Refactor principles

1. No kernel-theory changes in cleanup milestones unless a failing regression exposes a real kernel bug.
2. Parser sugar remains above the trust boundary and must lower into existing checked surface/Core forms.
3. Backend/runtime remain execution infrastructure, not proof authority.
4. Public APIs stay stable for this cleanup pass: `parseSource`, `tokenize`, `emitJavaScriptModule`, `emitTypeScriptModule`, `node tools/pslive.ts ...`, and existing npm scripts keep working.
5. Every refactor task starts with a characterization test or snapshot smoke proving existing behavior before moving code.
6. Fast-loop checks are acceptable for each small task, but every release candidate must run a fuller verification tier.
7. The K3-TB label must remain visible in CLI/status/report outputs and must not be upgraded by refactor work.

## Main cleanup targets

### Parser package

`packages/parser/src/index.ts` has grown into a combined tokenizer, parser state machine, namespace/section manager, proof parser, expression precedence parser, pattern parser, structure parser, and syntax-sugar lowering point. It should be split while preserving the existing public `index.ts` entry point.

Target modules:

- `packages/parser/src/tokenize.ts` — tokenization and comment rules.
- `packages/parser/src/parser-state.ts` — `ParserState`, `ParseOptions`, `ParseResult`, namespace/open/section state helpers.
- `packages/parser/src/surface-builders.ts` — constructors for common surface terms such as `Nat.add`, `Nat.mul`, Bool conditionals, and equality.
- `packages/parser/src/expression-parser.ts` — precedence parser for equality, Boolean operators, Nat arithmetic, application, calls, atoms, structure literals/updates, match and if.
- `packages/parser/src/proof-parser.ts` — `by`, `rfl`, `exact`, `intro`, `assumption`, and `apply` proof parsing.
- `packages/parser/src/declaration-parser.ts` — top-level declarations, definitions, theorem/example parsing, inductive/structure/class/instance parsing.
- `packages/parser/src/index.ts` — stable exports and compatibility facade.

### Tooling and tests

The `tools/pslive-smoke-lib.ts` file is becoming a kitchen-sink integration fixture. Many `tools/pslive-*-tests.ts` files are useful but fragmented. The cleanup should keep individual script names for compatibility while centralizing fixtures and assertions.

Target modules:

- `tools/pslive-test-harness.ts` — shared temp dir, source writing, CLI invocation, CommonJS import, JSON parsing, assertion helpers.
- `tools/pslive-language-smoke.ts` — one consolidated fast language smoke covering recent syntax slices.
- Existing `tools/pslive-*-tests.ts` scripts become thin wrappers around the shared harness.

### `pslive` CLI

`tools/pslive.ts` currently combines command parsing, checking, emitting, running, printing, and error formatting. Split reusable logic without changing the command surface.

Target modules:

- `tools/pslive-core.ts` — `checkSmallSource`, `standardPreludeDeclarationCount`, `stripPreludeDeclarations`, `buildJs`, `buildTs`, `runCall`.
- `tools/pslive-output.ts` — JSON/text result formatting and error formatting.
- `tools/pslive.ts` — argument parsing and dispatch only.

### TypeScript backend

`packages/backend-typescript/src/index.ts` mixes binding-name sanitization, constructor/recursor/projection collection, term emission, JS/TS module templates, and emitted metadata.

Target modules:

- `packages/backend-typescript/src/names.ts` — `sanitizeName`, reserved-name rules, collision detection.
- `packages/backend-typescript/src/analysis.ts` — declaration scans for constructors, recursors, projections, user declarations.
- `packages/backend-typescript/src/emit-term.ts` — Core `Term` to JS/TS expression emission.
- `packages/backend-typescript/src/templates.ts` — JS/TS module wrapper generation.
- `packages/backend-typescript/src/index.ts` — stable public `emitJavaScriptModule` / `emitTypeScriptModule` facade.

### Runtime package

`packages/runtime/src/index.ts` is still small enough, but it mixes status metadata, runtime values, runtime source-string generation, and TypeScript runtime source-string generation.

Target modules:

- `packages/runtime/src/capabilities.ts` — profile, supported/fail-closed feature lists, trust label.
- `packages/runtime/src/values.ts` — `PsNat`, `PsBool`, `PsStructValue`, Nat/Bool/structure/inductive runtime helpers.
- `packages/runtime/src/source-template.ts` — generated JS/TS runtime source templates.
- `packages/runtime/src/index.ts` — stable public facade.

### Reports and release hygiene

The root contains many milestone reports. Keep historical reports, but stop adding all future cleanup reports only at root. New cleanup reports should live in `docs/reports/p4/` and root README should link to the current status.

## Verification tiers

### Tier A — fast task check

Run after each small refactor task:

```bash
npm run build -- --pretty false
npm run test:standalone-small
npm run test:kernel:smoke
node tools/pskernel.ts status --json
```

### Tier B — language/backend check

Run after parser/backend/tooling refactors:

```bash
npm run build -- --pretty false
npm run test:pslive:nat-plus
npm run test:pslive:nat-mul
npm run test:pslive:lean-application
npm run test:pslive:by-sugar
npm run test:pslive:bool-if
npm run test:pslive:bool-operators
npm run test:pslive:build-ts
npm run test:pslive:js-name-collision
npm run test:pslive:reserved-identifiers
npm run test:standalone-small
npm run test:kernel:smoke
node tools/pskernel.ts status --json
```

### Tier C — release candidate check

Run before packaging a cleanup release:

```bash
npm run build -- --pretty false
npm run test:kernel:typechecker
npm run test:kernel:smoke
npm run test:standalone-small
npm run test:governance
npm run test:pslive:nat-plus
npm run test:pslive:nat-mul
npm run test:pslive:lean-application
npm run test:pslive:by-sugar
npm run test:pslive:bool-if
npm run test:pslive:bool-operators
npm run test:pslive:build-ts
npm run test:pslive:js-name-collision
npm run test:pslive:reserved-identifiers
node tools/pskernel.ts status --json
```

`npm run verify:k3tb:publish` remains blocked unless `PROOFSCRIPT_LEAN_BIN` points to the expected Lean 4.33.1 executable. Cleanup work must report that honestly.

## Out of scope for cleanup

- No new syntax feature unless required to protect an existing feature during extraction.
- No formal Lean 4 equivalence claim.
- No change from K3-TB to fully formal K3.
- No plugin API for kernel rule changes.
- No large frontend-next rewrite during the first cleanup pass.
- No deleting historical reports from the archive.

## Success criteria

1. P4.74 examples still parse, check, emit JS/TS, and run after extraction.
2. Public commands remain compatible.
3. Parser, backend, runtime, and `pslive` are split into focused modules.
4. Fast and release verification tiers are documented and runnable.
5. Reports clearly say K3-TB trusted-boundary, not fully formal K3.
6. New contributors can identify where to change syntax, lowering, elaboration, backend emission, runtime helpers, and trust-boundary policy.

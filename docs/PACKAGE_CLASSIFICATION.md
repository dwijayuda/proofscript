# PS1 Workspace Package Classification

Status: first-pass classification from the KA146 tree and package dependency metadata.

This document is deliberately conservative. "Migration candidate" does not mean "delete now." A package may be removed only after unique behavior is identified, migrated or rejected, and regression tests remain green.

## A — Trusted/core logical boundary

### `@proofscript/kernel`
**KEEP — critical.**

- Standalone logical checker.
- No ProofScript package dependencies.
- Large but appropriate internal modularity.
- Do not broadly refactor during PS1.

### `@proofscript/kernel-codec`
**KEEP.**

- Artifact validation/serialization boundary around Core.
- Depends only on kernel.

### `@proofscript/std`
**KEEP.**

- Checked/bootstrap declarations and standard artifacts.
- Data/foundation package, not a reason to add kernel primitives.

### `@proofscript/verifier`
**KEEP.**

- Independent artifact replay/verification path.
- Preserve dependency isolation from frontend/editor code.

### `@proofscript/certificates`
**KEEP.**

- Certificate/provenance utilities.
- Certificate claims need rebaseline later; package boundary remains useful.

## B — Canonical source frontend

### `@proofscript/syntax`
**KEEP.**

### `@proofscript/parser`
**KEEP.**

- Production v0.6.1 conformance work should land here or behind its public API.

### `@proofscript/recursion`
**KEEP.**

- Frontend-only recursion analysis/lowering.

### `@proofscript/typeclass`
**KEEP.**

- Typeclass registration/search metadata outside kernel trust.

### `@proofscript/elaborator`
**KEEP.**

- Source AST to explicit Core.

### `@proofscript/environment`
**KEEP.**

- Bootstrap/environment loading and checked declarations.

### `@proofscript/project`
**KEEP.**

- Module/project graph layer.
- Must gain/retain editor-friendly overlay APIs through stable service interfaces rather than LSP-specific hacks.

### `@proofscript/frontend`
**KEEP AS CURRENT CLI-CANONICAL PATH, THEN CONVERGE.**

Current CLI calls this package directly. It composes parser, elaborator, project/environment and PSKernel.

It is not automatically the final winner over `frontend-next`; PS1 must compare capabilities before consolidation.

## C — Runtime/backend/compiler

### `@proofscript/runtime`
**KEEP.**

### `@proofscript/backend-typescript`
**KEEP.**

- Primary executable backend for the current product direction.

### `@proofscript/semantic-ir`
**KEEP FOR NOW; AUDIT ROLE.**

- Used by current compiler/backend dispatch.
- PS1 must decide whether this is the canonical execution IR or a redundant projection of checked Core.

### `@proofscript/compiler`
**KEEP AND EXPAND.**

Current implementation is mostly backend dispatch. PS1 promotes it to the stable high-level programmatic facade used by CLI and future language-service tooling.

### `proofscript` / CLI package
**KEEP, THIN DOWN OVER TIME.**

Current CLI directly orchestrates frontend, certificates, environment, plugins, verifier and Lean export. Those semantics should progressively move behind compiler/service APIs so the CLI becomes a transport/argument layer.

## D — Lean interoperability and assurance

### `@proofscript/lean-export`
**KEEP.**

- Product-visible Lean export plus assurance support.

### `@proofscript/oracle-lean`
**KEEP.**

- Optional exact-version Lean oracle.
- Must not make Lean mandatory for native `psc check`.

### `@proofscript/arena-checker`
**KEEP AS ASSURANCE/RESEARCH TOOLING.**

- Not part of the ordinary product compiler dependency path.

## E — Plugin infrastructure

### `@proofscript/plugin-api`
**KEEP/FREEZE DURING PS1.**

### `@proofscript/plugin-host`
**KEEP/FREEZE DURING PS1.**

They are already used by project/compiler/CLI. PS1 should not expand the plugin model. After compiler convergence, reassess which extension points are genuinely required.

Official/example plugins remain outside the core trust boundary.

## F — Active verification workflow modules

These are real JavaScript modules in KA146, not empty scaffolds.

### `@proofscript/contracts-workflow`
**KEEP — ACTIVE PROTOTYPE.**

### `@proofscript/obligations`
**KEEP — ACTIVE PROTOTYPE.**

### `@proofscript/proof-status`
**KEEP — ACTIVE PROTOTYPE.**

### `@proofscript/state-models`
**KEEP — ACTIVE PROTOTYPE.**

### `@proofscript/monadic-lowering`
**KEEP — ACTIVE PROTOTYPE.**

These packages support the KA138–KA146 verification workflow. Their current `.mjs` implementation is not a reason to rewrite them during PS1.

Later cleanup:

1. freeze behavior with tests;
2. finalize v0.7 semantics;
3. decide package boundaries;
4. migrate active implementation to TypeScript when it reduces risk rather than creating churn.

## G — Frontend convergence/migration candidates

### `@proofscript/frontend-next`
**PRESERVE; CAPABILITY INVENTORY REQUIRED.**

Current size is substantial and it includes its own lexer/parser/elaborator/IR, target capability system, incremental/project support, and Lean/TypeScript plugin machinery.

It must not be deleted merely because `frontend` currently powers the CLI.

PS1 task:

- enumerate features unique to `frontend-next`;
- identify overlap with parser/elaborator/frontend;
- compare semantics against v0.6.1 and PSKernel;
- port or retain required editor/incremental capabilities;
- remove duplicate semantic paths only after equivalence/acceptance gates exist.

### `@proofscript/unified-bridge`
**PRESERVE TEMPORARILY; MIGRATION BRIDGE.**

It connects `frontend-next` IR into PSKernel/Core and is exercised by existing unified integration tests.

Target: remove only when the surviving frontend path reaches checked Core without needing a bridge.

## H — Editor/tooling

### `@proofscript/lsp`
**CURRENTLY SCAFFOLD-ONLY.**

Do not build new semantics inside it.

The separate historical LSP implementation is donor/reference code. Restore it after the language-service boundary exists.

Target architecture:

```text
compiler/frontend
      ↓
language-service
      ↓
language-worker
      ↓
lsp
```

### `language-service`
**MISSING FROM KA146 — RESTORE AS A REAL PACKAGE.**

Owns editor-facing semantic queries and document/project overlays.

### `language-worker`
**MISSING FROM KA146 — RESTORE IF PROCESS/WORKER IS STILL USEFUL.**

Owns cancellation/process isolation/async transport, not language semantics.

## I — Retired empty scaffolds

The following metadata-only placeholder workspaces were audited in PS2 and removed because they had no implementation and no consumers:

- `@proofscript/diagnostics`
- `@proofscript/formatter`
- `@proofscript/macro`
- `@proofscript/tactics-core`

Their future capabilities remain roadmap items and should be recreated as packages only when a milestone has concrete semantics, implementation, and tests.

## Root/tooling classification

The repository also contains large non-product surfaces:

- `assurance/`: formal/reference evidence — preserve, but isolate from normal product workflows;
- `tools/`: mixed active tests, release scripts, migrations, historical gates — must be categorized;
- root KA/P4/P5/P6 reports: historical evidence — move/archive only after references are audited;
- `docs/`: active docs plus historical reports — split current product documentation from evidence/history.

## Dependency principles

Target direction:

```text
kernel
  ↑
kernel-codec / environment / typeclass
  ↑
syntax -> parser -> elaborator -> frontend
  ↑
compiler
  ↑
cli / language-service
  ↑
language-worker
  ↑
lsp
```

Runtime/backends consume checked representations; they never add proof acceptance rules.

Lean oracle/export and assurance tooling may inspect checked artifacts but must not become hidden dependencies of native checking.

## Immediate PS1 package tasks

1. Make the toolchain reproducible.
2. Keep current product regression gates green.
3. Promote compiler facade.
4. Add language-service package boundary.
5. Inventory `frontend-next` vs `frontend`.
6. Inventory `unified-bridge` tests and consumers.
7. Only then remove duplicate paths/scaffolds.

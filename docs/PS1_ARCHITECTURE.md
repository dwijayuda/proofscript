# PS1 Target Architecture

This document defines the architecture target for the PS1 cleanup milestone. It complements the existing historical `ARCHITECTURE.md`; it does not replace the detailed trust-boundary documentation.

## Principle

ProofScript remains a multi-package npm workspaces monorepo.

Package boundaries are kept when they represent one of:

- a trusted-kernel boundary;
- a language/frontend responsibility;
- a runtime/backend responsibility;
- a public tooling/editor API;
- an assurance/reference implementation boundary.

Package boundaries are not kept merely because a future feature might exist.

## Canonical product flow

```text
source (.ps)
   |
   v
@proofscript/syntax
   |
   v
@proofscript/parser
   |
   v
@proofscript/elaborator
   |
   v
@proofscript/frontend
   |
   +------------------> @proofscript/kernel
   |
   v
@proofscript/compiler
   |
   +------------------> @proofscript/backend-typescript
   |
   v
runtime artifact
```

Project/module/environment support feeds the frontend:

```text
@proofscript/project
@proofscript/environment
@proofscript/recursion
@proofscript/typeclass
        |
        v
@proofscript/frontend
```

## Editor/tooling flow

The restored editor stack must use a stable service boundary:

```text
@proofscript/compiler / @proofscript/frontend
             |
             v
@proofscript/language-service
             |
             v
@proofscript/language-worker
             |
             v
@proofscript/lsp
```

The LSP must not depend directly on kernel internals or duplicate parser/elaborator semantics.

## Package classes

### Active product core

Expected to survive PS1:

- `kernel`
- `kernel-codec`
- `syntax`
- `parser`
- `recursion`
- `typeclass`
- `elaborator`
- `environment`
- `project`
- `frontend`
- `semantic-ir`
- `runtime`
- `backend-typescript`
- `compiler`
- `cli`

### Active assurance/reference

These may remain separate because they serve trust/reference roles rather than the normal user-facing compiler path:

- `verifier`
- `lean-export`
- `oracle-lean`
- `arena-checker`
- `certificates`
- `std`

Their presence must not force ordinary compiler users through assurance-only code paths.

### Editor/tooling

Target packages:

- `language-service` (to restore/rebase)
- `language-worker` (to restore/rebase)
- `lsp`

### Migration candidates

Require behavior inventory before removal:

- `frontend-next`
- `unified-bridge`

No deletion is allowed until their unique behavior has either been ported to the canonical path or explicitly rejected as obsolete.

### Deferred/scaffold candidates

Packages with no active implementation should be removed from the active architecture or clearly marked deferred until a milestone requires them. Current candidates include:

- `contracts`
- `diagnostics`
- `formatter`
- `macro`
- `monadic-lowering`
- `obligations`
- `proof-status`
- `state-models`
- `tactics-core`

Each must be audited before deletion because package names alone do not prove emptiness or lack of dependencies.

## Canonical compiler API goal

`@proofscript/compiler` should become the high-level programmatic entry point for consumers.

Target responsibilities:

- check a source/module/project;
- compile a checked program to a selected supported backend;
- expose structured diagnostics;
- expose checked semantic/core results needed by tooling;
- avoid duplicating parser/elaborator/kernel semantics.

CLI and language-service should consume this API rather than reimplementing the pipeline.

## Cleanup order

1. Establish CI and package classification.
2. Freeze canonical frontend behavior with acceptance tests.
3. Strengthen compiler API.
4. Rebase language-service onto compiler/frontend.
5. Inventory `frontend-next` unique behavior.
6. Port required behavior into canonical packages.
7. Remove `unified-bridge` when no longer needed.
8. Remove `frontend-next` when migration is complete.
9. Restore/adapt LSP.
10. Reduce historical scripts/reports after active-vs-assurance classification.

## Non-goal

PS1 is not a broad semantic rewrite. Kernel behavior, language semantics, and proof claims must not change merely to make the tree look cleaner.

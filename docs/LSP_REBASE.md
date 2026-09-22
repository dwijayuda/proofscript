# LSP Rebase Plan

Status: donor analysis completed against `proofscript-lsp-0.46.0-p5101-lsp-adapter-source`.

## What is worth preserving

The old editor stack already has a sound high-level layering:

```text
@proofscript/language-service
          ↓
@proofscript/language-worker
          ↓
@proofscript/lsp
```

The LSP transport itself is relatively clean: its source imports the language service and worker, not kernel/elaborator internals.

The worker also has a focused responsibility: worker-thread isolation, priority lanes, cancellation, crash recovery, and state replay.

These parts should be preserved conceptually and, where tests allow, reused directly.

## What must change

The old `@proofscript/language-service` depends directly on:

- `@proofscript/frontend`
- `@proofscript/frontend-next`
- `@proofscript/unified-bridge`
- `@proofscript/parser`
- `@proofscript/syntax`
- `@proofscript/environment`
- `@proofscript/project`
- `@proofscript/linter`

That was reasonable while editor work was evolving faster than the compiler architecture, but it is the wrong stable boundary now.

The rebased language service should prefer:

```text
@proofscript/compiler
@proofscript/project        (only for editor/project overlay APIs not yet exposed by compiler)
shared editor protocol/model packages
```

It should not choose between two parsers/frontends.

## Donor capabilities to retain

The old language service contains valuable editor behavior:

- versioned unsaved document snapshots;
- declaration-level recovery without admitting invalid declarations;
- incremental checked-prefix reuse;
- dependency-aware project/module reuse;
- compiler-grounded references/rename/workspace symbols;
- completion ranking using expected types;
- stable diagnostic identity/fingerprints/result IDs;
- document symbols;
- semantic tokens;
- proof-state/document-status metadata;
- bounded editor caches and statistics.

The old language worker contains:

- realtime / semantic / background lanes;
- cooperative cancellation;
- hard worker restart fallback;
- crash recovery;
- workspace/document state replay;
- stale-response protection support.

The old LSP transport contains:

- diagnostics push/pull integration;
- request lifecycle fencing;
- cancellation ownership/tombstone hygiene;
- background diagnostic supersession;
- hover/completion/navigation/rename/symbol/proof-status protocol wiring.

These are assets, not code to discard.

## Rebase phases

### L0 — freeze donor behavior

Before copying code, retain the old LSP archive as donor evidence and inventory its tests/protocol versions.

No production source changes.

### L1 — language-service contract extraction

Extract the editor-facing data contracts that are independent of frontend implementation:

- Position / Range
- Diagnostic / DiagnosticBundle
- diagnostic identity helpers
- completion/symbol identity
- cancellation token/source
- analysis/proof-status result shapes
- semantic token constants

Do not port direct parser/frontend calls yet.

### L2 — compiler-backed document checking

Implement a minimal rebased language service that:

1. owns versioned document text;
2. calls `@proofscript/compiler`;
3. translates compiler/parser errors into structured editor diagnostics;
4. never admits rejected declarations as valid semantic state.

Add source-map/range support to compiler/frontend APIs where missing instead of re-parsing in the language service.

### L3 — project overlays

Add unsaved document overlays to the project/compiler API.

The language service may supply an in-memory source provider, but module resolution/type checking remains compiler-owned.

### L4 — incremental snapshots

Migrate useful `frontend-next` incremental/module-interface ideas behind compiler/project APIs:

- interface hashes;
- dependency invalidation;
- checked module reuse;
- exact source/version identity.

Editor caches remain untrusted and every reused checked result must preserve the normal kernel-checking guarantees.

### L5 — restore language-worker

Port the donor worker substantially unchanged once the language-service request API is stable.

### L6 — restore LSP transport

Port/adapt the donor LSP to the rebased worker/service protocol.

The transport should require no parser/elaborator/kernel imports.

### L7 — editor features

Restore features in order:

1. diagnostics;
2. hover;
3. completion;
4. definition/references;
5. document/workspace symbols;
6. rename;
7. semantic tokens;
8. proof state/status;
9. code actions/signature help as compiler support permits.

## Package dependency target

```text
kernel / frontend internals
          ↓
     compiler facade
          ↓
    language-service
          ↓
    language-worker
          ↓
          lsp
```

Optional project/source-provider APIs may be shared below compiler, but LSP must never bypass the service boundary.

## Key architectural rule

If an LSP feature needs information that the compiler cannot expose, improve the compiler/service API.

Do **not** solve the problem by adding another editor-only parser, type checker, or theorem semantics.

## Relationship to frontend convergence

The LSP rebase can start after the compiler facade is stable enough for diagnostics.

It does not require waiting until every `frontend-next` feature has migrated.

However, editor capabilities that depend on `frontend-next`-only semantics should remain disabled or explicitly experimental until those semantics are part of the canonical compiler path.

## Definition of success

The rebased LSP is considered architecture-clean when:

- `@proofscript/lsp` imports only editor transport/service packages and platform modules;
- `@proofscript/language-worker` imports only the language service and worker/runtime modules;
- `@proofscript/language-service` does not import `frontend-next` or `unified-bridge`;
- all semantic answers are traceable to a compiler snapshot/document version;
- invalid source never becomes accepted merely for editor continuity;
- cancellation/cache logic cannot affect proof acceptance;
- existing donor protocol tests are either passing or intentionally replaced with equivalent tests.

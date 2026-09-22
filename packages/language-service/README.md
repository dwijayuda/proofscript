# @proofscript/language-service

Editor-independent semantic service for ProofScript.

This package deliberately depends on the canonical `@proofscript/compiler` facade, not on parser/elaborator/kernel internals and not on `frontend-next` or `unified-bridge`.

## PS1 scope

The initial service provides:

- versioned in-memory document snapshots;
- incremental text change application;
- unsaved-buffer checking through compiler/project source overlays;
- cached compiler-backed analysis;
- stable diagnostic identities/result IDs;
- stale-version rejection;
- cooperative cancellation boundaries.

It does **not** yet provide hover, completion, navigation, rename, semantic tokens, or proof-state UI. Those features will be added only when the compiler exposes the required semantic/source-map APIs.

## Dependency rule

```text
compiler
   ↓
language-service
   ↓
language-worker
   ↓
lsp
```

If an editor feature needs missing semantic information, improve the compiler/service API instead of adding an editor-only parser or checker.

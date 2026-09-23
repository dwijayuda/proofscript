# @proofscript/language-service

Editor-independent semantic service for ProofScript.

This package deliberately depends on the canonical `@proofscript/compiler` facade, not on parser/elaborator/kernel internals and not on `frontend-next` or `unified-bridge`.

## Current scope

The service provides versioned document state, incremental overlays, diagnostics,
symbols, hover, completion, navigation, rename, semantic tokens, formatting,
code actions, declaration/verification goals, and compiler-backed tactic states.

Tactic states are read-only observations returned by the canonical compiler.
The language service does not parse proof syntax or reconstruct goals itself.
For currently accepted proofs it can select the smallest canonical proof span at
the cursor and return its goal, named local context, tactic, and optional
constructor branch. Partial states for rejected/incomplete proofs are not
implemented yet.

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

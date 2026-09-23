# @proofscript/language-service

Editor-independent semantic service for ProofScript.

This package deliberately depends on the canonical `@proofscript/compiler` facade, not on parser/elaborator/kernel internals and not on `frontend-next` or `unified-bridge`.

## Current scope

The service provides versioned document state, incremental overlays, diagnostics,
symbols, hover, completion, navigation, rename, semantic tokens, formatting,
code actions, declaration/verification goals, and compiler-backed tactic states.

Tactic states are read-only observations returned by the canonical compiler.
The language service does not parse proof syntax or reconstruct goals itself.
For accepted proofs it selects the smallest canonical proof span at the cursor
and returns its goal, named local context, tactic, and optional constructor
branch. When canonical parsing succeeds but later elaboration fails, the service
can also retain states the compiler had already emitted before that failure.
For bounded syntax-incomplete editing states it supports:

- a fully parsed proof prefix missing only its final `}`;
- an empty `by {` block at EOF, where the frontend asks the canonical
  elaborator for the proof-free initial theorem/example goal.

States carry `sourceStatus` = `checked`, `rejected-prefix`, or
`syntax-incomplete`; initial empty-block states also carry `kind: "goal"`.

The service does not repair source, continue parsing after an error, fabricate
holes/metavariables, or synthesize speculative proof states. Other parser
failures expose no partial state.

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

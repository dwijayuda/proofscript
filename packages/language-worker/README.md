# @proofscript/language-worker

Worker-thread isolation layer for `@proofscript/language-service`.

## Responsibilities

- keep compiler/editor analysis off the LSP transport thread;
- replay open-document state after worker restart;
- provide cooperative cancellation through shared memory;
- provide hard worker restart fallback for non-cooperative synchronous compiler phases;
- recover from worker crashes when auto-restart is enabled.

## Non-responsibilities

This package contains no ProofScript parser, elaborator, kernel, or language feature semantics.

Current PS1 operations are intentionally small:

- `ping`
- `analyze`
- `diagnostics`

Additional editor operations should be added only after the language service exposes them.

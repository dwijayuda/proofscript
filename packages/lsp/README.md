# @proofscript/lsp

Thin LSP transport over `@proofscript/language-worker`.

## Supported protocol surface

Alongside document lifecycle, cancellation, push/pull diagnostics, hover,
completion, symbols, navigation, rename, formatting, code actions, and semantic
tokens, the server exposes ProofScript-specific compiler-backed requests:

- `proofscript/serverInfo`
- `proofscript/documentStatus`
- `proofscript/semanticInfo`
- `proofscript/surfaceFeatures`
- `proofscript/goals`

`proofscript/goals` carries declaration/verification goals plus an optional
cursor-local proof state. `proofStateAvailable: true` means the server
supports this metadata. `tacticState.sourceStatus` distinguishes `checked`,
`rejected-prefix`, and bounded canonical `syntax-incomplete` states.
`tacticState.kind: "goal"` identifies the proof-free initial context for an
empty `by {` block. A `tacticState: null` result means no canonical observed
state covers the cursor; the LSP does not parse, repair, or synthesize fallback
goals.

## Architecture

```text
@proofscript/compiler
        ↓
@proofscript/language-service
        ↓
@proofscript/language-worker
        ↓
@proofscript/lsp
```

The LSP contains no ProofScript parser, elaborator, kernel, or fallback frontend.

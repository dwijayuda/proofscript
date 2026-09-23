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

Standard `textDocument/completion` also transports proof-state-scoped native
tactic keyword candidates as LSP Keyword items. The server advertises `{` as
a trigger so an empty `by {` block can request them immediately. This remains
ordinary completion transport; the LSP performs no tactic applicability check,
proof search, or tactic execution.

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

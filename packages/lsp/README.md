# @proofscript/lsp

Thin LSP transport over `@proofscript/language-worker`.

## PS1 supported protocol surface

- `initialize` / `initialized`
- `shutdown` / `exit`
- `$/cancelRequest`
- `textDocument/didOpen`
- `textDocument/didChange`
- `textDocument/didClose`
- push `textDocument/publishDiagnostics`
- pull `textDocument/diagnostic`

The server advertises only features that exist in the compiler-backed language service. Hover, completion, navigation, rename, symbols, semantic tokens, and proof-state features are intentionally not advertised yet.

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

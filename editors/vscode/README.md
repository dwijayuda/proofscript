# ProofScript for Visual Studio Code

ProofScript language support backed by the canonical compiler and PSKernel trust
path.

## Architecture

```text
@proofscript/compiler
  -> @proofscript/language-service
  -> @proofscript/language-worker
  -> @proofscript/lsp
  -> VS Code
```

The editor does not contain a second ProofScript parser, elaborator, tactic
engine, or checker.

## Current features

- compiler-backed diagnostics and document status;
- hover, document outline, semantic tokens, definition, references, and rename;
- canonical formatting and bounded parser-derived quick fixes;
- compiler-backed theorem/verification goal presentation;
- live read-only tactic/branch proof states for checked proofs;
- retained proof-prefix states after later elaboration rejection;
- bounded syntax-incomplete states for a missing final `}`;
- proof-free initial theorem/example goal at an empty `by {` block;
- proof-state-scoped native tactic keyword completion;
- automatic completion request when `{` opens a proof block;
- worker isolation, cancellation, stale-version rejection, and server lifecycle
  commands.

Proof states carry explicit provenance (`checked`, `rejected-prefix`, or
`syntax-incomplete`). They are observations only and never participate in
proof acceptance.

Tactic completions are keyword suggestions, not proof search. Choosing a
completion still routes the resulting source through the canonical
parser/elaborator and PSKernel.

## Infoview

Use **ProofScript: Show Infoview** or `Ctrl+Shift+Enter`
(`Cmd+Shift+Enter` on macOS). The Infoview follows the cursor and shows the
current proof context when the canonical compiler can provide one.

## Standalone VSIX

The branch-specific `tactic-ergonomics-ci` workflow runs the consolidated
tactic ergonomics assurance, vendors the built ProofScript LSP dependency
closure into `server/node_modules/@proofscript`, performs a real bundled-LSP
initialize/shutdown smoke test, packages the extension, and uploads the VSIX as
the `proofscript-vscode-v6` artifact.

The packaged extension therefore does not require a ProofScript repository
checkout merely to start its bundled language server.

## From source

Run `npm ci` and `npm run build` at the repository root, then launch
`editors/vscode` with VS Code's Extension Development Host.

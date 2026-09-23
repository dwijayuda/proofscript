# ProofScript for Visual Studio Code

Active Product-v1 editor integration adapted from the preserved ProofScript 0.46.0 donor.

Canonical path:

    @proofscript/compiler
      -> @proofscript/language-service
      -> @proofscript/language-worker
      -> @proofscript/lsp
      -> editors/vscode

Current promoted features: diagnostics with stale-version rejection, cancellation-aware RPC, hover, document outline, completion, go-to-definition, project references, safe global rename, compiler-backed semantic highlighting, canonical Format Document support, compiler-backed document status, cursor semantic information, Infoview, and server lifecycle/status commands.

Definition/references/rename are backed by canonical parser source spans plus the same namespace/open-namespace resolver used by elaboration. They do not use editor-side textual symbol guessing.\n\nFormat Document reuses the same `@proofscript/formatter` implementation as `psc fmt`; the editor does not maintain a second formatting grammar. Formatter v1 preserves Lean-compatible line and nested block comments using canonical tokenizer spans.

The 0.46 donor still contains signature help, code actions, and richer proof-state UI. Those providers remain disabled until the current compiler-backed service exposes the required semantic APIs.

Protocol v1 does not expose tactic-state snapshots. The active Infoview never fabricates proof goals.

Run npm run build at the repository root before launching the extension from source. Release packaging will later vendor the matching @proofscript/lsp package into the VSIX.

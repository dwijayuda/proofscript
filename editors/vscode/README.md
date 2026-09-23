# ProofScript for Visual Studio Code

Active Product-v1 editor integration adapted from the preserved ProofScript 0.46.0 donor.

Canonical path:

    @proofscript/compiler
      -> @proofscript/language-service
      -> @proofscript/language-worker
      -> @proofscript/lsp
      -> editors/vscode

Current promoted features: diagnostics with stale-version rejection, cancellation-aware RPC, hover, document outline, compiler-backed document status, cursor semantic information, Infoview, and server lifecycle/status commands.

The 0.46 donor also contains completion, definition, references, rename, signature help, semantic tokens, code actions, and proof-state UI. Those providers remain disabled until the current compiler-backed service exposes the required semantic APIs.

Protocol v1 does not expose tactic-state snapshots. The active Infoview never fabricates proof goals.

Run npm run build at the repository root before launching the extension from source. Release packaging will later vendor the matching @proofscript/lsp package into the VSIX.

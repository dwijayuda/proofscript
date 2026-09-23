# Product v1 LSP donor: ProofScript 0.46.0

Primary donor artifact:

```text
proofscript-lsp-0.46.0-p5101-lsp-adapter-source.zip
sha256 fcb13b78ff3c0e0941fafc0127f3f7ace0e57d176c4815da68f719661918c5f6
```

Recorded donor metadata:

- release: 0.46.0
- LSP protocol: 38
- proof-state protocol: 9
- semantic baseline: Lean 4.33.1
- source `packages/lsp/src/index.ts`: 30,416 bytes in the donor release
- VS Code extension `editors/vscode/src/extension.js`: 63,014 bytes
- production-candidate gates included lifecycle, diagnostics, editor features,
  symbols, proof surface, editor cache budget, dogfood workspace, VS Code smoke,
  VS Code proof UX, packaged VSIX dogfood, artifact installation, release
  evidence, offline verification, and the P5.101 LSP adapter.

## Porting rule

Do not copy the 0.46 compiler/kernel/frontend wholesale.

Use the source ZIP as a **tooling donor** only. Port capabilities into the current
canonical architecture:

```text
@proofscript/compiler
  → @proofscript/language-service
  → @proofscript/language-worker
  → @proofscript/lsp
  → VS Code
```

The current compiler/Core/PSKernel branch remains authoritative.

## Capabilities to reuse

Prioritize reusable implementations and tests for:

1. worker scheduling/isolation and crash recovery;
2. cooperative cancellation + hard-worker fallback;
3. stale-version/result guards;
4. hover;
5. completion;
6. definition/navigation;
7. document/workspace symbols;
8. signature help;
9. semantic tokens;
10. code actions;
11. proof/cursor information and proof-surface protocol;
12. VS Code infoview/status/gutter UX;
13. dogfood workspace + VSIX packaging/install gates;
14. release evidence/provenance machinery where it remains useful.

References/rename must remain semantic, not textual. If the current compiler does
not expose stable symbol identities yet, add that compiler-service API before
porting those features.

## Older donors

0.19 and 0.21 remain useful historical references for worker isolation,
two-lane scheduling, cancellation/restart, and compiler cancellation
checkpoints. They are superseded by 0.46 for product feature selection.

## Acceptance rule

A donor feature is not considered implemented merely because the old LSP had it.
It becomes Product v1 functionality only after:

1. it uses current compiler-backed semantics;
2. it has focused language-service tests;
3. it has LSP protocol tests;
4. it has no duplicate parser/elaborator path;
5. stale/cancelled results cannot be presented as current;
6. any verification/proof status remains tied to current proof evidence.

# Product v1 Donor Inventory

## Canonical assets retained

The branch already inherits these useful implementations from the current product architecture:

- `packages/compiler` — canonical high-level source/project checking facade;
- `packages/frontend` — canonical source-to-Core path;
- `packages/kernel` — checked logical boundary;
- `packages/contracts`, `packages/obligations`, `packages/proof-status` — pure verification;
- `packages/state-models`, `packages/monadic-lowering` — stateful verification;
- `packages/language-service` — compiler-backed editor semantics;
- `packages/language-worker` — isolation and cancellation;
- `packages/lsp` — LSP transport;
- existing TypeScript/JavaScript backend/runtime packages and software-profile examples.

## LSP decision

Do **not** restore the historical KA146 LSP scaffold over the current code.

The current branch already has the newer architecture:

```text
compiler
  → language-service
  → language-worker
  → LSP
```

and already provides:

- document overlays;
- incremental compiler/project reuse;
- cooperative and hard cancellation;
- diagnostics;
- end-to-end stdio transport;
- a surface-feature query.

Missing editor features will be added through compiler-backed language-service APIs.

## frontend-next

Keep `frontend-next` as a donor until each useful capability is migrated.

Candidate donor areas include richer feature implementations, target-capability metadata, module interfaces, type utilities, incremental ideas, and backend integrations.

No feature is complete merely because `frontend-next` accepts it.

## unified-bridge

Migration/differential adapter only. It is not a canonical product path and must not become one during v1 completion.

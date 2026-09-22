# PS1 Closure Report

Status: **closure candidate**

PS1 was created to stop ProofScript architecture drift while preserving the working KA146 product path. It is intentionally not a language-feature milestone and does not claim full Lean compatibility.

## Original completion criteria

| Criterion | Status | Evidence |
|---|---|---|
| Canonical `.ps -> frontend -> checked Core -> kernel` remains working | PASS | `npm run build`, KA137/140/146 product gates |
| Valid representative programs accepted | PASS | KA137/140/146 and production surface corpus |
| Invalid representative programs rejected | PASS | production surface negative corpus 8/8 and existing negative gates |
| JS/TS-targeted builds remain executable | PASS | KA137/140 product workflows |
| Proof/theorem declarations remain non-runtime artifacts | PASS | KA137 runtime/build assertions |
| Canonical compiler API is explicit and shared | PASS | `@proofscript/compiler`; CLI and language-service use the facade |
| Package ownership/dependency direction documented and mechanically checked | PASS | `config/package-classification.json` + `test:architecture:package-classification` in product CI |
| Overlapping frontend implementations have explicit disposition | PASS | `docs/FRONTEND_CAPABILITY_MATRIX.md` and `docs/FRONTEND_CONVERGENCE.md` |
| LSP targets stable language-service boundary, not compiler internals | PASS | compiler -> language-service -> language-worker -> lsp; end-to-end LSP gate |
| PS1 CI green | PASS | `.github/workflows/product-ci.yml` |

## Additional improvements completed

- KA146 baseline preserved on `archive/legacy-ka146`.
- TypeScript 5.9.3 pinned instead of ambient global `tsc`.
- Historical Lean 4.33.1 K3-TB assurance separated from normal product CI.
- v0.6.1 machine-readable conformance corpus imported.
- normative C0 corpus-integrity gate added.
- production parser matches all 20 registered v0.6.1 surface accept/reject cases.
- production-surface gate is correctly labeled a C3 prerequisite, not normative C1.
- Unicode identifier support added for the registered corpus.
- inherited Lean tuple surface syntax is parsed while unsupported native tuple semantics fail closed.
- project source overlays restored for unsaved editor buffers.
- minimal compiler-backed language-service restored.
- worker isolation, cancellation, crash recovery, and state replay restored.
- minimal stdio LSP diagnostics transport restored.
- deterministic checked-project/module hashes added to the canonical compiler as the first incremental-build primitive.

## Explicit non-claims

PS1 does **not** claim:

- normative v0.6.1 C1, C2, C3, or C4 beyond C0;
- full v0.6.1 semantic/runtime implementation for every inherited Lean term;
- tuple Core/runtime semantics merely because tuple surface parsing exists;
- full Lean 4 kernel equivalence;
- fully formal K3;
- runtime correspondence for every emitted program;
- production completion of KA138–146 verification extensions.

## Deferred migration work

These items are intentionally **not PS1 blockers**:

1. port precise public/private module-interface hashing from frontend-next;
2. add actual incremental checked-module reuse, not just deterministic snapshots;
3. classify/migrate unified-bridge integration fixtures;
4. retire duplicate frontend-next parser/elaborator semantics after replacement gates exist;
5. build the independent v0.6.1 reference frontend needed for normative C1/C2;
6. prove/measure production-vs-reference C3;
7. add source maps/feature IDs needed for richer LSP hover/completion/navigation;
8. rebaseline certificate/project metadata from historical v0.1/Lean 4.33.1 fields under an explicit versioned manifest;
9. specify/promote v0.7 verification extensions.

## Next milestone

The next product milestone should focus on **reference conformance + compiler semantic metadata**, not more architecture cleanup.

Recommended next order:

1. independent v0.6.1 reference frontend: C1;
2. canonical Lean lowering: C2;
3. production/reference differential: C3;
4. source maps + feature IDs;
5. precise incremental interface hashes;
6. richer LSP features.

This preserves the PS1 anti-drift principle: a milestone closes when its predefined gates are green.

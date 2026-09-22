# ProofScript Status

## Canonical baseline

- Repository: `dwijayuda/proofscript`
- Baseline commit: `f5ca526d07c4d3521cdc4ec48246cf3962860503`
- Baseline label: KA146 canonical baseline
- Protected archive branch: `archive/legacy-ka146`
- Cleanup branch: `cleanup/ps1-architecture`
- Draft PR: #1

## Baseline behavior

Observed before cleanup and now represented by the product regression workflow:

- `npm run build`
- `npm run test:ka137`
- `npm run test:ka140`
- `npm run test:ka146`
- `psc check examples/software/01-domain-model.ps`
- JavaScript build/runtime smoke behavior
- proof/theorem runtime erasure behavior

## CI status

### Product CI

`product-ci` (`.github/workflows/product-ci.yml`) is the normal PS1 regression workflow.

It runs on pull requests to `main`, pushes to `main`, and the PS1 cleanup branch.

The repository now pins TypeScript `5.9.3` as a dev dependency instead of relying on an ambient/global `tsc`.

### Historical K3-TB assurance

The former always-on `ci` workflow is now `legacy-k3tb-assurance` and is manual-only.

Reason:

- it is historical Lean 4.33.1/K3-TB evidence;
- it includes generated-evidence assumptions that are not appropriate normal PR gates;
- its old verification-bundle assertions also depend on historical script text/shape;
- none of those failures should mask whether the current product compiler regression suite is healthy.

The historical workflow is preserved rather than deleted.

## Active specification policy

- active source baseline: ProofScript Language Reference v0.6.1;
- v0.1/v0.1.x references: historical unless an assurance artifact explicitly pins them;
- v0.7: next verification-language specification track;
- KA138–KA146 verification code: useful implementation evidence/prototypes, not automatically final v0.7 semantics;
- Lean 4.33.1: historical K3-TB assurance lane;
- Lean 4.34.0: current product stable compatibility lane as of 2026-09-22;
- Lean 4.35.0-rc2: current tracking/RC lane as of 2026-09-22.

See:

- `docs/SPEC_AUTHORITY.md`
- `docs/LEAN_VERSION_POLICY.md`
- `docs/PRODUCT_ROADMAP.md`

## Current architectural findings

- ProofScript remains an npm-workspaces monorepo.
- `packages/kernel` remains a meaningful trusted logical boundary.
- `packages/compiler` is being promoted from backend dispatch into the canonical high-level programmatic facade.
- both the workspace CLI and the actual packaged `psc` check/build path now route source/project checking through `@proofscript/compiler` rather than importing `@proofscript/frontend` directly.
- KA146's `packages/lsp` scaffold has now been replaced on the cleanup branch by a minimal compiler-backed LSP transport.
- the historical LSP remains donor/reference evidence for later editor features; its dual-frontend language-service coupling was not copied.
- `frontend`, `frontend-next`, and `unified-bridge` are not yet candidates for blind deletion; they have different capabilities.
- `frontend-next` contains substantial independent parser/elaborator/IR/incremental/plugin functionality.
- `unified-bridge` connects frontend-next output into PSKernel/Core and is covered by existing unified integration tests.
- verification workflow packages (`contracts`, `obligations`, `proof-status`, `state-models`, `monadic-lowering`) contain real `.mjs` implementations and are preserved.
- the metadata-only `diagnostics`, `formatter`, `macro`, and `tactics-core` scaffold workspaces were dependency-audited and removed; their capabilities remain roadmap items until concrete implementation milestones exist.

See:

- `docs/PACKAGE_CLASSIFICATION.md`
- `docs/FRONTEND_CONVERGENCE.md`
- `docs/PS1_ARCHITECTURE.md`

## PS1 progress

- [x] Preserve baseline on `archive/legacy-ka146`
- [x] Create isolated cleanup branch
- [x] Freeze PS1 milestone
- [x] Establish normal product CI
- [x] Separate historical K3-TB assurance from product CI
- [x] Pin TypeScript build toolchain
- [x] Publish package classification
- [x] Define active spec/version policy
- [x] Begin canonical compiler facade
- [x] Route CLI checking through compiler facade
- [x] Define frontend convergence strategy
- [x] Add focused compiler-facade regression test
- [x] Complete frontend/frontend-next capability matrix
- [x] Establish compiler-backed language-service boundary
- [x] Restore minimal language-worker + diagnostics LSP transport
- [x] Give duplicate frontend semantics an explicit migration/disposition plan
- [x] Keep `unified-bridge` explicitly outside the canonical product path until replacement gates exist
- [x] Separate historical assurance from normal product CI; deeper historical-file cleanup deferred
- [x] Final PS1 acceptance suite green

## Current executable gates

Latest confirmed product gate:

- build — PASS
- compiler facade — PASS
- language-service — PASS
- language-worker cancellation/state replay — PASS
- end-to-end stdio LSP diagnostics — PASS
- v0.6.1 normative C0 — PASS
- v0.6.1 normative C1 reference acceptance/rejection — **20/20 PASS**
- v0.6.1 normative C2 reference canonical Lean — **12/12 PASS**
- v0.6.1 production surface corpus — **20/20 PASS** (12 positive, 8 negative)
- v0.6.1 normative C3 production/reference corpus parity — **PASS**
  - acceptance/rejection: 20/20
  - feature ownership/ranges: PASS
  - canonical Lean lowering: 12/12
- canonical incremental compiler reuse — PASS
- language-service incremental importer invalidation — PASS
- packaged structural certificate metadata — PASS
  - product reference: v0.6.1
  - product profile: ps1-v061
  - bound Core compatibility recorded separately
  - metadata tamper rejection: PASS
- KA137 — PASS
- KA140 — PASS
- KA146 — PASS

The independent reference frontend lives in `reference/v061/frontend.ts` and does not import the production parser/elaborator. C1 and C2 are therefore separate from production behavior.

C3 is intentionally bounded to the normative v0.6.1 conformance corpus. It does not imply C4 machine-checked reference theorems, S2/S3 proof claims, runtime correspondence proofs, or full Lean 4 equivalence.

## PS1 closure

PS1 now satisfies its original completion criteria. See `docs/PS1_CLOSEOUT.md`.

Additional current gates include:

- machine-checked package dependency classification — PASS
- deterministic checked-project snapshot/hash regression — PASS
- v0.6.1 production surface corpus — 20/20 PASS

The deeper frontend-next/unified-bridge migration is no longer allowed to keep PS1 open indefinitely. It continues under explicit follow-up milestones with replacement gates.

## Next engineering target

1. Finish PS2 closeout after current plugin/project metadata and scaffold-retirement gates are green; structural certificates, plugin/backend snapshots, and current project profiles now separate product identity from historical Core evidence.
2. Continue CLI convergence at the orchestration layer; both current check paths already share `@proofscript/compiler`, so remaining duplication is command/UX/workflow code rather than a separate checker.
3. Continue extracting useful incremental/module-interface infrastructure from `frontend-next` behind canonical compiler/project APIs.
4. Expand LSP capabilities only from compiler-backed semantic/source-map APIs.
5. Treat C4 machine-checked reference theorems as assurance work; do not block usable compiler/editor releases on full Lean equivalence.

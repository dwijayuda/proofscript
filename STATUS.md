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
- `packages/product-profile` centralizes current product identity/certificate compatibility metadata outside the public CLI router.
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

## PS2 closure

PS2 is complete. See `docs/PS2_CLOSEOUT.md`.

Current PS2 gates:

- current product identity `v0.6.1 / ps1-v061` — PASS
- plugin metadata current/legacy separation — PASS
- project metadata current/legacy separation — PASS
- CLI project-profile stamping/stale rejection — PASS
- production D/E registry equality / X-exclusion governance — PASS
- C0 — PASS
- C1 — 20/20 PASS
- C2 — 12/12 PASS
- C3 — PASS

C4 remains assurance work and is not implied by PS2 closure.

## PS3 progress

Current specified profile: `ps3-pure-contracts0`.

Specified V-features:

- `V-REQUIRES`
- `V-ENSURES`
- `V-RESULT`
- `V-ASSERT`
- `V-GHOST`
- `V-OLD`

Executable pure PS3 corpus: **6 positive / 20 negative PASS**.

Additional pure-profile gates:

- stable, unique obligation IDs — PASS
- statement/theorem hashes detect changed obligation content — PASS
- preconditions remain proof hypotheses and do not alter program function arity — PASS
- parenthesized `result` substitution — PASS
- pure `old(e)` entry-value semantics — PASS
- ghost runtime non-interference check — PASS (syntactic; formal erasure proof not claimed)
- verification profile propagated contract → obligations → proof-status → verify — PASS
- KA142 loop invariant/decreases artifacts classified prototype-only — PASS

Current structural monadic profile: `ps3-monadic-contracts0`.

- `V-MONADIC-CONTRACT` — specified structural alpha
- `V-OLD` — specified structural alpha when entry-state meaning is structurally modeled
- `V-RESULT` — specified structural alpha when confined to the explicit postcondition result binder
- monadic corpus — **6 positive / 13 negative-or-prototype-boundary cases**
- explicit entry-state / result / final-state binder roles — PASS
- descriptor-bound state-observation normalization — PASS
- typed binder + state-observation reference elaboration (`proofscript.stateful-predicate-elaboration/v1`) — PASS
- bounded typed normalized predicate AST (`proofscript.stateful-predicate-ast/v1`, `stateful-predicate-expressions0`) for monadic requires + postconditions — implemented with executable gates
- typed WP/Triple identity binding (`proofscript.stateful-wp-binding/v1`) — implemented with executable internal + KA145 public gates
- used-operation Triple theorem identities required for strict-profile admission — implemented/fail closed
- typed operation-call elaboration (`proofscript.stateful-operation-elaboration/v1`) — implemented/fail closed
- deterministic bounded stateful program lowering (`proofscript.stateful-program-lowering/v1`) — implemented; emitted semantic program uses Lean `StateM`
- inspectable stateful VC planning (`proofscript.stateful-vc-plan/v1`) with stable source-obligation + program provenance — implemented
- concrete `Std.Do` / `StateM` assertion encoding (`proofscript.stateful-lean-semantic-encoding/v1`) — implemented structurally
- Lean VC derivation request blueprint (`proofscript.stateful-vc-request/v1`) — implemented; blocked unless model Lean imports are declared
- Triple skeleton pre/post functions sourced from the WP binding artifact — implemented
- state observation descriptor state-input type validation — PASS
- definite state-observation argument type mismatches downgrade to prototype/fail closed — PASS
- unsupported bounded predicate AST syntax and definite AST type mismatches downgrade to prototype/fail closed — implemented with executable gates
- arbitrary ProofScript/Lean predicate elaboration outside the bounded AST — **not claimed**
- WP/Triple semantic equivalence checking — **false by design**
- state-model adequacy theorem checking — **false by design**
- semantic VC derivation / real verification-condition generation — **false by design**
- operation Triple theorem resolution/checking — **false by design**
- emitted `StateM` program typechecking in the selected Lean environment — **false by design**
- concrete `Std.Do.Triple` target typechecking — **false by design**
- VC request tactic execution / captured Lean goals — **false by design**
- modeled `old(...)` observations rewrite against entry state; ordinary modeled observations rewrite against final state — PASS
- call-free `old(x)` structural admission — PASS
- unclassified calls inside `old(...)` fail closed to prototype — PASS
- `result` inside `old(...)`, `old`/ `result` in requires, and undeclared state operations fail closed — PASS
- validated `proofscript.state-model.v1` binding — PASS
- all strict-profile body operations must be declared by the state model — PASS
- monadic preconditions do not alter program function arity — PASS
- verification profile propagation contracts → lowering → preflight — PASS
- fail-closed `psc contracts --verification-profile ...` public CLI gate — PASS
- stateful postcondition semantic elaboration — **false by design**
- state-model adequacy theorem checking — **false**
- semantic proof discharge — **false by design**
- vcgen/mvcgen connected — **false**
- public CLI router — 1,927 lines (KA146 ceiling 1,950)

## Next engineering target

1. Add a real Lean state-model module/import binding for the promoted bank example so `proofscript.stateful-vc-request/v1` can resolve its types, operations, specs, and Triple target.
2. Execute the request with pinned Lean 4.33.1, capture the goals produced by `vcgen` as a separate inspectable artifact, and only then set `realVerificationConditionsGenerated = true`.
3. Keep exceptional/abrupt-path coverage, state-model adequacy checking, source-to-Lean program equivalence, and semantic proof discharge false until separately modeled and checked.
4. Keep recursive-definition termination in the Lean-compatible language layer; keep loop `decreases` with the later invariant/stateful milestone.
5. Continue CLI convergence at the orchestration layer; both current check paths already share `@proofscript/compiler`.
6. Continue extracting useful incremental/module-interface infrastructure from `frontend-next` behind canonical compiler/project APIs.
7. Expand LSP capabilities only from compiler-backed semantic/source-map APIs.
8. Treat C4 machine-checked reference theorems as assurance work; do not block usable compiler/editor releases on full Lean equivalence.

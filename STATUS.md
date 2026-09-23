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
- Lean 4.34.0: current product stable compatibility lane as of 2026-09-23;
- Lean 4.35.0-rc2: current tracking/RC lane as of 2026-09-23.

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
- monadic corpus — **6 positive / 14 negative-or-prototype-boundary cases**
- explicit entry-state / result / final-state binder roles — PASS
- descriptor-bound state-observation normalization — PASS
- typed binder + state-observation reference elaboration (`proofscript.stateful-predicate-elaboration/v1`) — PASS
- bounded typed normalized predicate AST (`proofscript.stateful-predicate-ast/v1`, `stateful-predicate-expressions0`) for monadic requires + postconditions — implemented with executable gates
- typed WP/Triple identity binding (`proofscript.stateful-wp-binding/v1`) — implemented with executable internal + KA145 public gates
- used-operation Triple theorem identities required for strict-profile admission — implemented/fail closed
- typed operation-call elaboration (`proofscript.stateful-operation-elaboration/v1`) — implemented/fail closed
- deterministic bounded stateful program lowering (`proofscript.stateful-program-lowering/v1`) — implemented; emitted semantic program uses Lean `StateM`
- inspectable stateful VC planning (`proofscript.stateful-vc-plan/v1`) with stable source-obligation + program provenance — implemented
- concrete `Std.Do` / `StateM` assertion encoding (`proofscript.stateful-lean-semantic-encoding/v1`) — implemented structurally; Lean predicates are rendered from the typed AST rather than copied source strings
- real pinned Lean bank model module (`ProofScript.Verification.BankStateModel`) — added under the v0.7 verification Lake project with no `sorry`/`admit`
- canonical bank descriptor now binds its Lean import/namespace and `StateM Bank` constructor
- provable debit-only end-to-end example (`07-bank-debit-stateful-vc.ps`) — added as the first semantic execution target
- Lean VC derivation request blueprint (`proofscript.stateful-vc-request/v1`) — implemented; canonical bank model now has request-source provenance
- Lean >=4.33.1 VC execution runner (`proofscript.stateful-vc-run/v1`) + dedicated `stateful-lean-ci` compatibility workflow — implemented; local proof-required matrix evidence is green, while hosted-run execution remains dependent on GitHub runner availability
- Lean >=4.33.1 stateful compatibility policy — executable gate added; default developer toolchain is 4.34.0, while CI dynamically tracks latest stable and RC
- `Std.Do.Triple -> mvcgen` compatibility rule — enforced by descriptor validation; omitted tactic defaults from Triple identity
- first local Lean 4.34.0 debit semantic evidence — **PROVED** historically; superseded for current provenance by the 2026-09-23 proof matrix after the Bank model gained symmetric cross-account preservation lemmas
- proof-required stateful compatibility matrix at repository commit `94696c4eb41798583e47b708fa445eb9f84c0d16` on 2026-09-23 — **6/6 PROVED**: debit + transfer on Lean 4.33.1, 4.34.0, and 4.35.0-rc2; zero failed lanes; `allProofsDischarged = true`; `provenanceConsistent = true`
- current shared state-model provenance — descriptor `3d749687...`, Lean model `6f2a680d...`
- current debit proof provenance — source `6e5d389b...`, generated program `337b7fe5...`, Triple target `9f9e271a...`, generated request `314212ca...`
- current transfer proof provenance — source `1a47a3c4...`, generated program `e7f178be...`, Triple target `39915963...`, generated request `f2856fbe...`
- profile-wide semantic proof discharge remains unclaimed; the proved claims apply to these two concrete generated theorem families across the recorded three-lane matrix
- public `psc monadic-vc-run` command — implemented; emits the same evidence schema and treats residual Lean VCs as an accepted `vcs-generated` run, not as a proof
- stable Lean-derived residual-goal artifact (`proofscript.stateful-vc-goals/v1`) — implemented with deterministic IDs/hashes
- evidence-based claim promotion is centralized in `@proofscript/monadic-lowering` and covered by synthetic fail-closed stage tests
- stateful VC evidence invariant validation — implemented; contradictory `proved` + residual-goal reports are rejected
- per-run temporary Lean toolchain selection — implemented for the specialized stateful runner and public `psc monadic-vc-run`
- proof-required debit+transfer multi-version matrix — **PASS on local machine, 6/6 proved** across Lean 4.33.1 / 4.34.0 / 4.35.0-rc2
- cross-version provenance consistency — implemented; the same proof case must retain identical source/model/generated theorem hashes across lanes
- consolidated `proofscript.stateful-endtest/v1` local gate — implemented; combines build/static regressions with the proof matrix
- Triple skeleton pre/post functions sourced from the WP binding artifact — implemented
- state observation descriptor state-input type validation — PASS
- definite state-observation argument type mismatches downgrade to prototype/fail closed — PASS
- unsupported bounded predicate AST syntax and definite AST type mismatches downgrade to prototype/fail closed — implemented with executable gates
- arbitrary ProofScript/Lean predicate elaboration outside the bounded AST — **not claimed**
- WP/Triple semantic equivalence checking — **false by design**
- state-model adequacy theorem checking — **false by design**
- semantic VC derivation / real verification-condition generation — **available per executed Lean run; not a profile-wide guarantee**
- operation Triple theorem identity resolution as an independent named check — **not yet separately claimed**
- emitted `StateM` program typechecking — **available per executed Lean run**
- concrete `Std.Do.Triple` target typechecking — **available per executed Lean run**
- VC request tactic execution / captured Lean goals — **available per executed Lean run**
- modeled `old(...)` observations rewrite against entry state; ordinary modeled observations rewrite against final state — PASS
- call-free `old(x)` structural admission — PASS
- unclassified calls inside `old(...)` fail closed to prototype — PASS
- `result` inside `old(...)`, `old`/ `result` in requires, and undeclared state operations fail closed — PASS
- validated `proofscript.state-model.v1` binding — PASS
- all strict-profile body operations must be declared by the state model — PASS
- monadic preconditions do not alter program function arity — PASS
- verification profile propagation contracts → lowering → preflight — PASS
- fail-closed `psc contracts --verification-profile ...` public CLI gate — PASS
- stateful postcondition semantic encoding into concrete Lean `Std.Do` terms — **implemented for the bounded profile**
- state-model adequacy theorem checking/use — **false**
- semantic proof discharge — **true for the recorded debit+transfer matrix cases; not claimed profile-wide**
- `mvcgen` connection for public `Std.Do.Triple` — **working for the recorded debit+transfer matrix cases**
- public CLI router — 1,835 lines after public VC execution routing (below the 1,900-line KA145 architecture guard and 1,950-line KA146 ceiling)

## Next engineering target

1. Preserve the new proof-required compatibility matrix as a regression gate; hosted CI must reject any debit/transfer lane that leaves residual goals.
2. Preserve `stateModelAdequacyChecked = false`, `sourceToLeanProgramEquivalenceChecked = false`, and `exceptionalPathsCovered = false` until those are separately checked.
3. Begin the next bounded stateful-verification increment: explicit frame conditions first, then loop invariant/progress obligations, rather than broadening the profile all at once.
4. Keep recursive termination (`termination_by` / `decreasing_by`) separate from loop-progress verification.
5. Continue CLI/frontend/LSP convergence only behind canonical compiler APIs and existing regression gates.

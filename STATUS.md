# ProofScript Status

## Canonical baseline

- Repository: `dwijayuda/proofscript`
- Baseline commit: `f5ca526d07c4d3521cdc4ec48246cf3962860503`
- Baseline label: KA146 canonical baseline
- Protected archive branch: `archive/legacy-ka146`
- Cleanup branch: `cleanup/ps1-architecture`
- Draft PR: #1


## Product-v1 closure

Status: **CLOSED** on source commit `0abea67df1bef85a567cb08ce52ef9ab8382b543`.

Active closeout branch: `product/v1-completion`.

Machine-readable authority:

- `config/proofscript-product-v1-completion.json`
- final gate: `assurance:product-v1:endtest`
- closeout report: `docs/PRODUCT_V1_CLOSEOUT.md`

Strict closure evidence recorded on 2026-09-23:

- Product-v1 end-test: **25/25 PASS**, 0 failed, 0 skipped;
- diagnostic mode: **false**;
- non-Lean Product-v1 gates: **PASS**;
- proof-required verification end-test: **8/8 PASS**;
- loop proof matrix: **3/3 proved** across Lean 4.33.1, 4.34.0, 4.35.0-rc2;
- stateful proof matrix: **15/15 proved** (debit, transfer, frame, logical, invoice × 3 Lean lanes);
- all state models adequate: **true**;
- proof provenance consistency: **true**;
- `allProductV1GatesPassed = true`.

Implemented since the PS1/PS2 baseline:

- bounded Product-v1 software profile with canonical compiler/CLI gates;
- pure + bounded stateful verification, including V-FRAME, typed Prop connectives, semantic loop invariant/decreases VCs, and fail-closed unsupported stateful control flow;
- proof-required stateful matrix now plans debit, transfer, frame, logical-predicate, and representative invoice cases across each Lean lane;
- exact bounded JS runtime representation profile and runtime/certificate correspondence levels;
- artifact-bound runtime hashes, runtime differential corpus, and tamper checks;
- fail-closed `proofscript.ffi/v1` trusted-external JS/npm boundary;
- bounded `@proofscript/std`, JSON/validation host package, and ProofScript source-package resolution;
- compiler-backed VS Code integration reusing the 0.46 donor for UI/tooling only;
- diagnostics, hover, outline, completion, semantic definition/references/rename, semantic tokens, formatting, bounded code actions, and compiler-backed goal presentation;
- representative CLI, generated npm/TypeScript library, JSON/validation, HTTP host-adapter, and stateful invoice examples;
- deterministic `psc setup --prebuilt` plus packed-release fresh-install gate;
- consolidated `proofscript.product-v1-endtest/v1` runner.

The earlier debit+transfer-only 6/6 evidence has been superseded by the strict Product-v1 closure run: loop 3/3 and stateful 15/15 proof executions are green across Lean 4.33.1, 4.34.0, and 4.35.0-rc2.

Current nonclaims remain explicit:

- no full Lean 4 equivalence;
- no profile-wide stateful proof claim beyond executed evidence;
- no arbitrary exceptional/branching stateful verification in `ps3-monadic-contracts0`;
- no formal Core→TypeScript or TypeScript→JavaScript refinement theorem yet;
- no end-to-end "verified JavaScript" claim from structural certificates alone.

## Native tactics closure

Status: **CLOSED** on source commit `7a98acc8f983b770c6d04c50474c68116b7f483f`.

Branch: `feature/native-tactics`.

Closeout evidence on 2026-09-23:

- consolidated gate: `npm run assurance:native-tactics`;
- **5/5 PASS**, 0 failed, 0 skipped;
- build — PASS;
- parser proof extraction — PASS;
- proof elaborator/kernel-check regression — PASS;
- standalone-small — PASS;
- reference-governance — PASS;
- `allNativeTacticGatesPassed = true`.

Execution-green bounded tactics:

- `show`;
- proof-local `have`;
- target `rw` / reverse `rw` through checked `Eq.rec`;
- bounded target `subst`;
- bounded one-constructor `constructor`;
- bounded nonrecursive `cases`;
- bounded recursor-based `induction`;
- bounded `simp-lite`.

Trust boundary remains unchanged: tactic success only constructs ordinary Core;
PSKernel still accepts or rejects the completed proof. No trusted tactic
primitive was added.

See `docs/NATIVE_TACTICS.md`.

## Tactic ergonomics Phase 2 closure

Status: **CLOSED** on tested source commit `8315cf3e3e1ef467bbdb3f569ebd063895c3cf0f`.

Branch: `feature/tactic-ergonomics`.

Closeout evidence on 2026-09-24:

- consolidated gate: `npm run assurance:tactic-ergonomics`;
- schema: `proofscript.tactic-ergonomics-endtest/v2`;
- **9/9 PASS**, 0 failed, 0 skipped;
- build — PASS;
- parser proof extraction — PASS;
- elaborator/kernel-check proof regression — PASS;
- compiler-backed language service — PASS;
- language worker — PASS;
- LSP transport — PASS;
- active VS Code smoke — PASS;
- standalone-small — PASS;
- reference governance — PASS;
- `allTacticErgonomicsGatesPassed = true`.

Phase 2 adds read-only compiler-backed tactic/branch proof states for
successfully checked proofs. Source spans originate in the canonical parser;
goals and locals are observed during ordinary elaboration, normalized for
display only, and flow through frontend/compiler -> language service -> worker
-> LSP -> VS Code. The observer is fail-open and is never consulted for proof
construction or acceptance.

The same closure includes the dependent-local `assumption` correction:
local candidates are typed by kernel inference in the full current context
before definitional comparison with the goal.

## Tactic ergonomics Phase 3 closure

Status: **CLOSED** on tested source commit `10836538e37f547596cbbbb556bc643d93d17461`.

Closeout evidence on 2026-09-24:

- consolidated gate: `npm run assurance:tactic-ergonomics`;
- schema: `proofscript.tactic-ergonomics-endtest/v3`;
- **9/9 PASS**, 0 failed, 0 skipped;
- build — PASS;
- parser proof extraction — PASS;
- elaborator/kernel-check proof regression — PASS;
- compiler-backed language service — PASS;
- language worker — PASS;
- LSP transport — PASS;
- active VS Code smoke — PASS;
- standalone-small — PASS;
- reference governance — PASS;
- `allTacticErgonomicsGatesPassed = true`.

Phase 3 retains only compiler proof states already emitted before a later
elaboration failure. Rejected proofs remain rejected, rejected declarations are
not exposed as checked theorem goals, observer failures are fail-open, and
parser failures still produce no partial proof states.

No editor-only parser/elaborator, metavariable recovery, syntax repair, or
speculative continuation was added.

See `docs/TACTIC_ERGONOMICS.md`.

## Tactic ergonomics Phase 4 closure

Status: **CLOSED** on tested source commit `7573f5cb3aa8196472020d33d4c83430819f2f3e`.

Closeout evidence on 2026-09-24:

- consolidated gate: `npm run assurance:tactic-ergonomics`;
- schema: `proofscript.tactic-ergonomics-endtest/v4`;
- **9/9 PASS**, 0 failed, 0 skipped;
- build — PASS;
- parser proof extraction — PASS;
- elaborator/kernel-check proof regression — PASS;
- compiler-backed language service — PASS;
- language worker — PASS;
- LSP transport — PASS;
- active VS Code smoke — PASS;
- standalone-small — PASS;
- reference governance — PASS;
- `allTacticErgonomicsGatesPassed = true`.

Phase 4 adds the bounded canonical missing-final-`}` observation path and
explicit proof-state provenance `checked`, `rejected-prefix`, and
`syntax-incomplete`. Project graph discovery now uses canonical leading-import
parsing rather than requiring the entire current editor buffer to parse.

The original syntax error still rejects the source. No synthetic delimiter,
metavariable/hole, speculative continuation, stale-state substitution, or
editor-only parser/elaborator was added.

See `docs/TACTIC_ERGONOMICS.md`.

## Tactic ergonomics Phase 5

Status: **IMPLEMENTED; ACCEPTANCE PENDING**.

Phase 5 adds a proof-free initial goal for an empty `by {` block at EOF. The
canonical parser emits only the already-parsed theorem/example header and
complete declaration prefix, then still rejects the source.

The canonical elaborator now has a dedicated initial-goal path that:

- elaborates the preceding declarations normally;
- rebuilds the checked environment plus same-file structure/class metadata;
- rejects duplicate declaration headers;
- kernel-checks binder domains and the result type;
- returns only the real local context and goal.

It does **not** synthesize a theorem, axiom, metavariable, hole, dummy tactic, or
placeholder proof term. Editor state uses `kind: "goal"` and
`sourceStatus: "syntax-incomplete"`, and remains selectable at the exact EOF
cursor position.

Closure requires a green
`proofscript.tactic-ergonomics-endtest/v5` run on the committed Phase 5
candidate.

See `docs/TACTIC_ERGONOMICS.md`.

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
- first-class state-model adequacy artifact (`proofscript.stateful-adequacy-check/v1`) — implemented for the current `StateM` alpha; deterministically checks the descriptor-bound runner + adequacy theorem against the expected WP-to-run-result bridge shape
- adequacy is now an ordered execution stage between model loading and program typechecking; `proved` / `vcs-generated` evidence cannot be promoted without it
- proof-matrix provenance now requires `generatedAdequacyCheckSha256`; cross-version compatibility must therefore check the same adequacy wrapper as well as the same program/Triple/request
- adequacy-enabled proof-required matrix rerun on 2026-09-23 — **6/6 PROVED** across Lean 4.33.1 / 4.34.0 / 4.35.0-rc2 with `allStateModelsAdequate = true`, `allProofsDischarged = true`, and provenance consistency; generated adequacy-check identity `af7ea2a9...`
- Triple skeleton pre/post functions sourced from the WP binding artifact — implemented
- state observation descriptor state-input type validation — PASS
- definite state-observation argument type mismatches downgrade to prototype/fail closed — PASS
- unsupported bounded predicate AST syntax and definite AST type mismatches downgrade to prototype/fail closed — implemented with executable gates
- arbitrary ProofScript/Lean predicate elaboration outside the bounded AST — **not claimed**
- WP/Triple semantic equivalence checking — **false by design**
- state-model adequacy theorem checking/use — **available per executed Lean run through `proofscript.stateful-adequacy-check/v1`; proved for the recorded debit+transfer three-lane matrix, not profile-wide**
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
- bounded V-FRAME — **implemented structurally** as named entry→final-state predicates with distinct `monadic.frame` obligations and `typed-frame-goal` VC-plan provenance; proof-required frame evidence is pending execution
- state-model adequacy theorem checking/use — **true only for recorded executed runs; no profile-wide claim**
- semantic proof discharge — **true for the recorded debit+transfer matrix cases; not claimed profile-wide**
- `mvcgen` connection for public `Std.Do.Triple` — **working for the recorded debit+transfer matrix cases**
- public CLI router — 1,835 lines after public VC execution routing (below the 1,900-line KA145 architecture guard and 1,950-line KA146 ceiling)

## Next engineering target

1. Run the consolidated Product-v1 gate on a supported machine:
   `npm run assurance:product-v1:endtest -- --toolchains 4.33.1,4.34.0,4.35.0-rc2 --out .proofscript-product-v1-endtest/summary.json`.
2. Fix the first concrete failing gate without weakening semantics or claim boundaries.
3. Promote Product-v1 pillars to complete only from recorded executable evidence.
4. If all bounded product gates pass, continue the separate formal runtime-correspondence/refinement track without blocking the bounded Product-v1 release claim.
5. Keep full Lean/kernel parity on the independent assurance track.

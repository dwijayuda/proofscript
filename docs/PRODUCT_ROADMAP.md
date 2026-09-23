# ProofScript Product Roadmap

Status: active roadmap for the post-KA146 cleanup and product-convergence phase.

This roadmap supersedes KA-number sequencing for new product work. Historical KA/P4/P5/P6 labels remain evidence checkpoints; new work uses product milestones with executable acceptance gates.

## Product goal

ProofScript should become a small, serious Lean-semantic programming language and theorem prover for verified software:

- TypeScript-friendly syntax where that does not change semantics;
- a standalone native ProofScript checker/kernel path;
- canonical Lean export/oracle checking for conformance and assurance;
- executable TypeScript/JavaScript output for a documented safe subset;
- explicit contracts and proof obligations;
- certificates/provenance that state exactly what was checked and what remains an execution-correspondence claim;
- editor/LSP support built on the same compiler semantics, never a separate language implementation.

## Authority hierarchy

1. **Language surface authority:** ProofScript Language Reference v0.6.1 and its registered conformance artifacts.
2. **Native logical authority:** the checked ProofScript Core + PSKernel implementation for the supported native profile.
3. **Lean reference/oracle:** exact pinned Lean versions used for canonical lowering, differential conformance, and proof/oracle evidence.
4. **Runtime backends:** execution artifacts; they are not trusted to accept proofs.

The v0.6.1 reference remains immutable as a versioned baseline. v0.7 is a new specification track, not a silent rewrite of v0.6.1.

---

## PS1 — Architecture stabilization and closure

**Goal:** make the current KA146 implementation understandable, reproducible, and safe to change without removing working behavior.

Required outcomes:

- reproducible Node/TypeScript build toolchain;
- one documented package classification and dependency direction;
- one canonical high-level compiler API;
- existing CLI behavior routed through that API instead of duplicating orchestration;
- explicit disposition for `frontend`, `frontend-next`, and `unified-bridge`;
- language-service API defined for editor consumers;
- current LSP donor implementation rebased only after that API is stable;
- historical assurance workflows separated from normal product CI;
- PS1 regression gates stay green.

Required regression gates:

```bash
npm run build
npm run test:ka137
npm run test:ka140
npm run test:ka146
```

PS1 does not add new language features.

### PS1.1 — Toolchain reproducibility

- pin TypeScript instead of using an ambient global compiler;
- record Node/npm/TypeScript versions in release metadata;
- keep legacy K3-TB Lean 4.33.1 evidence reproducible without treating 4.33.1 as the product-wide future baseline.

### PS1.2 — Package convergence

Keep meaningful package boundaries. Classify each workspace as:

- trusted/logical core;
- active compiler/runtime;
- verification workflow;
- assurance/oracle;
- editor/tooling;
- migration candidate;
- deferred scaffold.

Do not delete `frontend-next` or `unified-bridge` until unique behavior is inventoried and covered by tests.

### PS1.3 — Compiler facade

Promote `@proofscript/compiler` from backend dispatch to the high-level programmatic API.

Target shape:

```ts
checkSource(...)
checkProject(...)
compile(...)
emitCore(...)
emitLean(...)
getDiagnostics(...)
```

The CLI and future language service should use this facade.

### PS1.4 — Editor boundary

Restore/rebase:

```text
compiler/frontend
      ↓
language-service
      ↓
language-worker
      ↓
lsp
```

The LSP must not directly own parser/elaborator semantics.

---

## PS2 — v0.6.1 conformance rebaseline

**Goal:** make the production frontend demonstrably conform to the compiler-ready v0.6.1 reference package.

The v0.6.1 reference defines 12 L/D/E surface entries (1 inherited L plus 11 admitted D/E features) and 3 registered X-class exclusions used by the negative corpus. Import/retain the machine-readable registry and corpus as first-class repository inputs.

Normative conformance gates (Appendix G):

- **C0:** static registry/schema/corpus is well formed;
- **C1:** the **reference frontend** accepts/rejects every corpus case as specified;
- **C2:** the **reference frontend** emits canonical Lean matching the lowering corpus;
- **C3:** the **production frontend** matches the reference frontend on the corpus;
- **C4:** corpus properties are covered by machine-checked reference theorems.

Production-only regression gates are tracked separately and do not borrow C-level names. Production surface-corpus parity, feature-registry drift checks, and production/reference canonical-lowering parity are now normal product gates.

PS2 must explicitly resolve current metadata drift:

- certificates must not claim `proofscriptReference: v0.1` when the active product profile is v0.6.1+;
- product manifests must not use a historical Lean baseline as an implicit global semantic version;
- unknown/unregistered ProofScript-owned syntax fails closed in the verified profile.

### Native checking vs Lean

Default product direction:

```text
psc check
  -> ProofScript parser/elaborator
  -> explicit checked Core
  -> PSKernel
```

Lean remains available as an oracle/reference:

```text
psc verify --oracle lean
psc emit-lean
conformance/differential CI
```

ProofScript should not require Lean to be installed merely to run the native supported profile.

---

## PS3 — v0.7 verification surface

**Goal:** promote existing verification prototypes into a specified, tested product surface.

Existing KA138–KA146 work is treated as implementation evidence/prototype code, not automatically as the final v0.7 semantics.

Add a new registry class:

```text
V — Verification Extension
```

Candidate features:

- V-REQUIRES
- V-ENSURES
- V-RESULT
- V-ASSERT
- V-GHOST
- V-OLD
- V-INVARIANT
- V-DECREASES
- V-MONADIC-CONTRACT
- V-FRAME

Each V feature must define:

1. source grammar;
2. semantic/lowering target;
3. generated proof obligations;
4. trust-boundary impact;
5. runtime erasure/non-interference rule;
6. positive cases;
7. negative cases;
8. diagnostics;
9. certificate/manifest representation.

### PS3 order

1. pure `requires` / `ensures` / `result`;
2. proof-obligation listing and stable obligation IDs;
3. `assert`;
4. `ghost` and erasure/non-interference;
5. `old` and snapshot semantics;
6. termination boundary: recursive definitions keep Lean-compatible `termination_by` / `decreasing_by`; KA142 loop `decreases` remains prototype-only until loop semantics are promoted;
7. stateful/monadic contracts;
8. loop invariants, loop progress measures, and frame conditions.

Do not make monadic verification the foundation for pure contracts.

Current specified `ps3-pure-contracts0` features are `V-REQUIRES`, `V-ENSURES`, `V-RESULT`, `V-ASSERT`, `V-GHOST`, and `V-OLD`. The verification profile is propagated through contract/obligation/proof-status artifacts. Loop invariant/decreases syntax is classified as `ka142-loop-prototype`, not as a v0.7 conformance claim.

Current `ps3-monadic-contracts0` is a **specified structural alpha** profile for `V-MONADIC-CONTRACT`, `V-OLD`, and `V-RESULT`. Its normalized stateful postcondition IR records explicit entry-state, result, and final-state roles and rewrites descriptor-declared state observations against the appropriate structural binder. The downstream `proofscript.stateful-predicate-elaboration/v1` layer now binds state/result types, validates observation signature state inputs, and checks definite simple observation-argument type mismatches. Structurally unmodeled reads, invalid `old`/`result` placement, definite typed observation mismatches, and undeclared state operations fail closed.

The bounded `proofscript.stateful-predicate-ast/v1` layer now typechecks the normalized `stateful-predicate-expressions0` subset used by the promoted corpus. Unsupported normalized syntax and definite AST type mismatches fail closed rather than being treated as typed predicates. This AST is deliberately scoped to verification IR and is not a second general-purpose ProofScript parser.

The `proofscript.stateful-wp-binding/v1` layer now makes typed pre/post predicate shapes, the selected WP/Triple identity, runner identity, and adequacy-theorem identity explicit and makes that artifact the source of the generated Triple skeleton's pre/post functions. Binding an adequacy theorem identity is not checking that theorem.

The `proofscript.stateful-vc-plan/v1` layer records the overall Triple target, stable source-obligation IDs, typed postcondition goals, and the bound Triple theorem identity for every used state operation. This remains deliberately a plan/provenance artifact until Lean executes the request.

A real Lean verification lane now exists under `specs/verification/v0.7/lean/`. Its compatibility floor is Lean 4.33.1; the default developer toolchain is current stable, and CI also tracks the latest stable and RC releases dynamically. It contains `ProofScript.Verification.BankStateModel` with concrete `StateM` operations, schematic `@[spec]` Triple theorems, and a runner adequacy bridge. The canonical bank descriptor binds that module, and `07-bank-debit-stateful-vc.ps` is the first deliberately provable end-to-end semantic target. Lean predicates are emitted from the typed predicate AST, so ProofScript call syntax is no longer copied into semantic Lean.

The `proofscript.stateful-vc-run/v1` runner separately checks the model module, emitted `StateM` program, concrete `Std.Do.Triple` target, and then executes the selected compatible tactic. In the current public profile, `Std.Do.Triple` is paired with `mvcgen`; the newer experimental `vcgen` path is reserved for the newer internal Triple metatheory rather than treated as interchangeable. The same evidence semantics are exposed publicly through `psc monadic-vc-run <lowering.json> --lean-project <dir> --out <run.json>`. Its claims are evidence-driven: no Lean execution means no promoted semantic-VC or proof-discharge claim.

When Lean reaches the tactic but leaves residual goals, `proofscript.stateful-vc-goals/v1` assigns those goals stable IDs and trace hashes. A `vcs-generated` run is useful semantic evidence but is still distinct from `proved`.

A real Lean 4.34.0 run has now completed the first stateful semantic vertical slice. The bank model, emitted `StateM` program, and concrete `Std.Do.Triple` target all typecheck; `mvcgen [withdraw]` plus the checked `simp_all` finisher closes the theorem with zero residual goals. The resulting `proofscript.stateful-vc-run/v1` reports `status = proved` and `semanticProofDischarge = true` for that concrete debit theorem only.

The next target is the corrected two-account transfer contract. It now requires distinct accounts (`from != to`, emitted as Lean `≠`) so its debit and credit postconditions are semantically valid. The generalized VC runner can execute either source through the same evidence pipeline. After transfer is proved, repeat debit/transfer across the 4.33.1 floor/current-stable/current-RC matrix before widening to loop/frame reasoning. Exceptional/abrupt paths, state-model adequacy use, and source-to-Lean program equivalence remain explicitly unclaimed. Exceptional/abrupt paths remain explicitly uncovered until modeled.

A consolidated local end-test and proof-matrix harness are now implemented for
that checkpoint. Per-run toolchain selection is temporary, every child VC report
must satisfy canonical evidence invariants, and each debit/transfer proof case
must retain identical source/model/generated-request provenance across Lean
lanes. These harnesses are infrastructure only until a real machine run produces
the corresponding Lean evidence.

---

## PS4 — Runtime correspondence and certification

**Goal:** separate proof correctness from emitted-program correctness and make both claims precise.

The TypeScript runtime profile must specify exact representations for at least:

- Nat;
- Int;
- Bool;
- String;
- Unit;
- Option;
- List;
- structures;
- inductives;
- equality/BEq;
- effects/IO.

No JavaScript truthiness, implicit `null` for Option, or JS `==` may silently stand in for ProofScript/Lean semantics.

### Certificate model

A certificate/provenance manifest should bind:

- source hashes;
- ProofScript reference/profile version;
- compiler revision;
- kernel revision/core format;
- checked declaration/theorem statements;
- assumptions/axiom policy;
- obligation results;
- Lean oracle version/commit when used;
- runtime profile;
- emitted artifact hashes.

**Important:** binding a TypeScript/JS hash to a proof does not by itself prove runtime correspondence. The manifest must distinguish:

- proof checked;
- source-to-Core conformance;
- Lean differential/oracle checked;
- backend emitted;
- runtime correspondence tested;
- runtime correspondence formally proved.

---

## PS5 — Stateful and monadic verification

**Goal:** verified stateful software after the pure contract layer is stable.

Prefer a friendly ProofScript surface that lowers to established Lean verification concepts rather than inventing a second proof logic.

Target concepts include:

- `Std.Do.Triple` / Hoare triples;
- weakest-precondition/state-model descriptors;
- Lean `mvcgen` / `vcgen` workflows where applicable;
- explicit adequacy theorems for state models;
- loop invariant initialization/preservation/exit obligations;
- frame conditions.

A stateful feature is unsupported unless its state/effect model has an explicit semantic descriptor.

---

## Tooling track — LSP and editor experience

This track begins after the PS1 compiler/language-service boundary is stable; it does **not** wait for full PS3–PS5 completion.

Order:

1. rebase existing language-service implementation;
2. source-map/diagnostic API;
3. document overlays and incremental snapshots;
4. cancellation;
5. hover/completion/definition/references;
6. semantic tokens/rename/code actions as compiler support allows.

The LSP must consume compiler semantics rather than maintain its own parser or type system.

---

## Assurance track — Lean/kernel compatibility

This track runs independently from product shipping.

- preserve existing K3-TB / Lean 4.33.1 evidence as historical pinned assurance;
- maintain differential suites against the current supported stable Lean lane;
- track release candidates separately;
- expand PSKernel/Lean parity by explicit audited features;
- never claim full Lean kernel equivalence until the stated completeness obligations are actually discharged.

A usable ProofScript release must not wait for full Lean 4 parity.

---

## Release targets

### v0.7.0-alpha.1 — architecture/conformance alpha

- PS1 complete;
- v0.6.1 C0 plus reference C1/C2 and production C3 conformance integrated;
- native `psc check` stable for supported profile;
- canonical compiler API;
- correct product metadata/version manifest;
- TypeScript backend smoke examples.

### v0.7.0-alpha.2 — pure verification alpha

- pure contracts;
- obligations;
- assert/ghost/old;
- proof erasure tests;
- Lean oracle workflow;
- initial restored LSP diagnostics/hover if tooling track is ready.

### v0.7.0-alpha.3 — stateful verification alpha

- explicit state-model descriptors;
- monadic contracts;
- invariant/decreases workflow;
- runtime/certificate claim separation.

### v0.7.0-beta.1

- clean install on fresh machines;
- product CI and release CI separated;
- conformance suite green;
- representative real software examples;
- LSP usable for the supported language profile;
- documented compatibility/claim matrix.

## Progress reporting

Do not report subjective percentages.

Report executable gates:

```text
PS1: 7/10 gates
v0.6.1 conformance: C0; production surface corpus: 20/20; reference C1/C2: pending
pure verification cases: 42/42
runtime correspondence corpus: 18/25
LSP protocol tests: 63/70
Lean differential dimensions: 17/21
```

A milestone is complete only when its predefined gates are green.

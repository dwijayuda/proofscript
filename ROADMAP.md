# ProofScript Project A — kernel-first roadmap

Current practical/default trusted-boundary kernel checkpoint: **KERNEL-level-instantiation-conformance1** (Core v71), labeled **K3-TB**. Historical rollback/reference checkpoints remain **KERNEL-resource-bounds0 / Core v68** and **KERNEL-conversion-final-audit0 / Core v67**. The source/frontend producer remains **K3c-section-vars0** (Core v12, certificate v2).

Completed in the kernel-first campaign so far:

- exact Lean 4.33.1 universe normalization/equivalence for the trusted no-metavariable level subset;
- trusted quotient primitives and quotient `lift`/`ind` computation;
- non-mutual empty inductives plus empty-`Prop` arbitrary-Sort elimination;
- Lean-shaped recursor universe ordering/BinderInfo for supported recursor families;
- v15 raw projection expressions and nonrecursive structure eta;
- v16 Lean-compatible strict positivity for supported non-mutual recursion;
- v17 dependent recursive indexed recursors;
- v18 indexed raw projections, dependent projection types, projection iota, and Prop projection safety;
- v19 Lean-faithful Prop elimination classification for empty, singleton, indexed, parameterized, proof-field, recursive-proof-field, and index-exposed-data cases in the admitted non-mutual environment;
- v20 exact Lean `RecursorVal.k` K-like reduction for eligible nullary singleton propositions;
- v21 exact Lean constructor-field universe ceilings, `Prop` impredicativity, and uniform-parameter exemption;
- v22 dependent constructor-local telescopes in the simple zero-parameter/index path, including higher-order strictly-positive recursive fields whose domains depend on earlier fields;
- v23 trusted recursor-telescope preservation of existing `Lam`/`Let` Core terms, including binder capture across simple, recursive, indexed-result, and empty-indexed paths.
- v24 atomic direct mutual `Type` families with shared motives/minors and cross-family iota;
- v25 shared/dependent uniform parameters for the bounded mutual slice, with fixed-parameter admission and parameter-aware recursors/iota.
- v26 indexed mutual `Type` families with per-member index telescopes, mixed index counts, index-aware motives/minors, and target-index-aware cross-family iota.
- v27 strictly-positive higher-order mutual recursion with pointwise cross-family induction hypotheses/iota and exact target-index propagation.
- v28 mutual `Prop` admission plus conservative Prop-only shared motive universes for every mutual result universe not provably nonzero; mutual K-like reduction remains disabled.

Authoritative progress is tracked in `docs/KERNEL_COVERAGE.md` and `kernel-status.json`: **41 implemented / 0 partially implemented / 0 unsupported** across **41** audited kernel checklist items. The practical/default trusted-boundary K3-TB kernel is v71. v68 remains frozen historical rollback evidence, not the current default.

v49 completed the final non-mutual dependent/indexed recursor conformance audit without changing the v48 kernel theory. v50 subsequently composes bounded mutual recursion with nested preprocessing; further shared-parameter mutual+nested generalization remains open.

---

# Roadmap: independent ProofScript, Lean-compatible by evidence

> **Current Project A priority:** keep `KERNEL-level-instantiation-conformance1` / Core v71 as the practical/default trusted-boundary K3-TB base while migrating the rich v0.91 frontend in larger verified waves. `UNIFIED-waveA` introduces the reusable declarative Core-lowering registry and machine-readable coverage matrix, then migrates checked Nat equality/order decision functions plus ordinary nondependent proposition `if` for canonical Nat `=`, `≤`, and `<`. Full proof-carrying `Decidable p`, dependent proof-binder `if`, generic classes, and non-Nat conditions remain separate future waves. Semantic IR and all lowering code remain untrusted; Core v71 K3-TB remains the current practical/default logical authority; v72 owns fully formal K3.


The language version does not change merely because implementation coverage grows. Every milestone below is implementation coverage of **ProofScript Language Reference v0.1.6**, semantically pinned to Lean 4.33.1. v0.1.6 is a source-reference repair and does not redesign the current kernel/compiler work.

## K0-bootstrap — completed

- explicit dependent lambda/Pi core;
- theorem/axiom checking;
- beta, initial eta and proof-irrelevance slices;
- inert artifact replay, certificates and axiom policy;
- npm plugin architecture with non-pluggable kernel;
- optional Lean export/oracle architecture.

## K1a-universes — completed

- immutable `Level` AST: zero/succ/max/imax/parameter;
- declaration universe parameters;
- constant universe instantiation and arity checking;
- conservative level normalization/equality for the implemented fragment;
- versioned core artifacts with backward decoding.

## K1b-inductives0 — completed

- kernel-admitted non-mutual parameterless/indexless inductives;
- direct strictly-positive recursive fields;
- constructor generation/checking;
- deterministic data recursors;
- kernel recursor computation.

## K1c-indexed0 — completed

- explicit parameter/index counts;
- uniform parameter checking in constructor results;
- conservative indexed constructor-result admission;
- no-local-field indexed singleton recursor generation;
- conservative singleton-`Prop` elimination sufficient for the implemented `Eq` shape;
- checked `Eq`, `Eq.refl`, and generic generated `Eq.rec` without a magical equality primitive.

This is **not** general Lean inductive support. Recursive indexed families, mutual/nested inductives, general positivity, and full elimination parity remain future work.

## K1d-foundation0 — completed

- canonical bootstrap source declarations for `Eq`, `Nat`, and `Bool`;
- simple transparent regular `def` declarations and delta reduction;
- `Nat.add` defined through checked `Nat.rec`;
- first arithmetic theorem checked with `Eq.refl` because `Nat.add(n, Nat.zero)` computes to `n`;
- v4 core artifact format with v1/v2/v3 backward replay;
- checked standard-bootstrap artifact and environment loader;
- `--std` source checking and isolated replay;
- Lean-export bootstrap omission/mapping path for exact standard artifacts.

### Assurance still required for K1d

- run paired ProofScript/Lean 4.33.1 differential snapshots in an environment with the pinned Lean toolchain;
- confirm generated `Eq.rec`, `Nat.rec`, `Bool.rec`, universe instantiations, and `Nat.add` observations against the pinned baseline;
- keep the bootstrap mapping status non-certified until that corpus passes.

## K2a-bindings0 — completed

- core `let` expression with explicit type, value, continuation body, and Lean-compatible `nondep` flag;
- kernel zeta reduction;
- `defBodyBlock` ordered-dispatch local `let` and `have` prefixes;
- mandatory body-level `;` after each local binding prefix and no final body-level semicolon;
- typed and untyped local bindings, with untyped values typed by the standalone ProofScript kernel rather than host-language inference;
- `have` preserves `nondep = true` in core/artifacts instead of being rewritten to ordinary `let`;
- core artifact format v5 with v1-v4 backward replay.

This is still a deliberately small slice. Modern Lean `let`/`have` options, local recursion, pattern bindings, local function sugar, `let mut`, instance bindings, and full zeta/transparency-option parity remain deferred.

## K2b-transparency0 — completed

- `abbrev` lowers to a definition carrying distinct reducibility metadata and participates in delta reduction;
- `opaque` values are independently type-checked but do not delta-reduce in kernel conversion;
- `example` proof/program terms are checked and replayable but do not extend the logical environment;
- core artifact format v6 with v1-v5 backward replay;
- Lean export preserves `def` / `abbrev` / `opaque` / `example` source-facing distinctions for the implemented slice.

The current transparency model is still intentionally small: full Lean 4.33.1 transparency modes, attributes such as reducibility controls, opaque declarations without a RHS, declaration modifiers, and elaborator-specific transparency behavior remain deferred.

## K2c-structures-match0 — completed

- parameterless nondependent `structure` declarations;
- frontend lowering of structures to ordinary one-constructor inductives;
- constructor/recursor reuse through the existing kernel-checked inductive path;
- recursor-backed transparent projection definitions;
- projection computation established through ordinary delta + recursor reduction;
- one-discriminant exhaustive constructor `match`;
- match lowering to existing recursor applications;
- recursive-constructor induction hypotheses inserted internally and ignored for nonrecursive match bodies;
- core artifact format v7 with v1-v6 backward replay.

Deliberately deferred at K2c: structure parameters, dependent/recursive fields, structure instance/update syntax, extension/defaults, generalized field notation, dependent match, multiple discriminants, pattern alternatives, motives/generalization, structural recursive definitions, and equation theorem generation.

## K2d-structural-recursion0 — completed current semantic profile

- activated `@proofscript/recursion` as a frontend-only source transformation package;
- one explicit recursive parameter with a top-level constructor match;
- direct recursive calls only on recursive constructor-pattern binders;
- accepted calls lower to internal induction-hypothesis references supplied by existing generated recursors;
- no `RecursiveDef` kernel/core primitive;
- generated `f.eq_1`, `f.eq_2`, ... equation theorem declarations for the supported branches;
- equation proofs are ordinary `Eq.refl` terms validated by delta + recursor computation;
- growth recursion, non-structural recursion, and calls on nonrecursive fields are reported as `unsupported`;
- artifact format remains v7 because no new core wire construct was added; current producer profile advances to K2d while historical K2c v7 artifacts remain replayable.

Deliberately deferred: equation-clause declaration syntax, multiple recursive parameters, mutual recursion, nested/course-of-values recursion, well-founded recursion, `termination_by`/`decreasing_by`, local `let rec`, and full Lean equation-theorem metadata/naming parity.

## K2e-equation-clauses0 — completed historical semantic profile

- canonical one-argument equation-body `def` syntax;
- lowers to the existing match + structural-recursion pipeline;
- recursive and nonrecursive equation clauses generate checked `f.eq_N` theorems;
- no equation-definition kernel/core primitive;
- artifact wire format remains v7.

## K2f-patterns0 — completed historical semantic profile

- explicit frontend pattern AST;
- constructor patterns, final wildcard `_`, and Nat zero `0`;
- lowers to existing recursors with no pattern/match kernel primitive;
- historical v7 profile remains replayable.

## K2g-structure-instances0 — completed historical semantic profile

- expected-type-directed explicit structure instances;
- field punning;
- lowering directly to generated `.mk`;
- no structure/object core node.

## K2h-structure-update0 — completed historical semantic profile

- adds restricted `{ base with field := value }` syntax for same-compilation-unit parameterless/nondependent structures;
- infers the base structure type from the elaborated base term;
- unchanged fields are rebuilt through generated projections;
- changed fields are checked against constructor field types;
- reconstruction uses the existing generated `.mk` constructor in declaration field order;
- duplicate and unknown update fields are rejected;
- non-structure bases are reported unsupported;
- update/projection computation is validated by ordinary `Eq.refl` theorems;
- no object/update kernel/core node is added;
- artifact wire format remains v7; historical K2c/K2d/K2e/K2f/K2g v7 artifacts remain replayable.

Deliberately deferred: nested updates (`address.city`), structure parameters, dependent fields, imported structure metadata, defaults/parents, and generalized field notation.

## K2i-literals0 — completed historical semantic profile

- frontend `true` / `false` lower to checked `Bool.true` / `Bool.false`;
- exact decimal Nat literals `0..4096` lower to `Nat.zero` / repeated `Nat.succ` in this bootstrap slice;
- application elaboration infers the function type, reduces it to the current Pi domain, and passes that domain as the expected type of each argument;
- dependent curried application updates the next expected domain by instantiating the Pi codomain with the checked argument;
- pending inductive self-application uses an explicit uncommitted declaration type in the elaborator rather than pre-admitting the inductive into the kernel environment;
- literal terms disappear before Core serialization; core wire format remains v7;
- general `OfNat`, `OfScientific`, polymorphic literal/typeclass elaboration remains deferred.

## K2j-equality0 — completed historical semantic profile

- canonical `a = b` parses as propositional equality, distinct from `==`;
- equality binds tighter than `→`;
- the left operand is elaborated/inferred first; its type and sort determine `Eq.{u}`;
- the right operand is elaborated against the exact inferred left type;
- source equality lowers to the existing checked `Eq` foundation and adds no Core/kernel equality node;
- `==` and inequality forms remain unsupported until their own Boolean/typeclass layers exist;
- core wire format remains v7; K2i v7 artifacts remain replayable.

## K2k-binder-info0 — completed historical semantic profile

- Core `Pi`/`Lam` preserve explicit, implicit, strict-implicit, and instance-implicit BinderInfo;
- source binder delimiters survive serialization and Lean export;
- `@f(...)` explicitly supplies hidden binders;
- core artifact format advanced to v8; historical v1-v7 nodes decode as explicit.

## K2l-implicit-synthesis0 — completed historical semantic profile

- direct implicit/strict-implicit type parameters can be inferred from a later explicit argument of exactly that hidden type;
- synthesized arguments become ordinary explicit Core `App` nodes;
- instance synthesis and non-inferable hidden parameters remain unsupported.

## K2m-unification0 — completed historical semantic profile

- elaborator-only scoped metavariables;
- occurs-checked first-order structural unification for hidden type parameters;
- structured inference such as `Box A` vs `Box Nat` and `Pair A B` vs `Pair Nat Bool`;
- all metas must be solved before Core emission;
- wire format remains v8 because metas never cross the trusted boundary.

## K2n-typeclass-env0 — completed historical semantic profile

- parameterless structure-style `class` declarations lower to checked one-constructor inductives plus projections;
- named/anonymous global `instance` declarations lower to checked definitions;
- separate class/instance registration metadata is introduced in Core artifact v9;
- instance priorities are recorded (default 1000), with declaration order preserved for equal-priority ordering;
- `[inst : C]` is accepted only when `C` is a registered class in this slice;
- the isolated verifier cross-checks v9 registrations against independently replayed logical declarations;
- Lean export reconstructs actual `class`/`instance` declarations;
- automatic instance synthesis, parameterized classes, scopes, output parameters, default instances, and recursive search remain deferred.

## K2o-instance-search0 — completed historical semantic profile

- exact-goal global instance search over K2n registrations;
- higher priority first, then later declaration order;
- candidate type validated by kernel inference and definitional equality;
- selected instance inserted as ordinary explicit Core;
- missing candidate for a supported exact goal is an elaboration rejection;
- no recursive dependencies or parameterized classes in this cut;
- wire format remains v9 and frozen v9/K2n metadata is replayable.

## K2p-parameterized-typeclasses0 — completed historical profile

- explicit class parameter telescopes such as `class Default(A: Type)`;
- generic kernel generation of recursors for non-indexed parameterized inductives with nonrecursive fields;
- recursor-backed parameterized class projections;
- concrete fully-applied instances such as `Default(Nat)` and `Default(Bool)`;
- parameter-sensitive exact-goal search with existing priority/recency ranking and kernel-verified type equality;
- Core artifact v10 carries class parameter names/BinderInfo and closed field types as validated environment metadata;
- Lean export reconstructs parameterized `class`/`instance` declarations and uses explicit `@` applications for serialized hidden arguments;
- frozen v9/K2n/K2o artifacts remain replayable.

Deliberately deferred beyond K2r: local/scoped candidates, class extension/abbrev/inductive forms, method binder sugar, `outParam`/`semiOutParam`, default instances and Lean-compatible tabling/diamond/backtracking.

## K2r-recursive-instance-search0 — completed historical semantic profile

- hidden type binders on global instances;
- instance-implicit registered-class prerequisites;
- first-order hidden-type solving from the final class goal;
- recursive prerequisite synthesis with active-goal cycle detection;
- hard depth bound 16, surfaced as `resource_exhausted`;
- priority/declaration-order ranking among applicable candidates;
- kernel re-check of every fully instantiated selected candidate;
- explicit selected instance/prerequisite applications in serialized Core;
- v10 metadata validation of prerequisite binder classes and nondependent final targets;
- strict replay performs no search.

## K3a-modules0 — frozen historical module baseline

- plain header `import Foo.Bar;` syntax;
- configured relative `sourceRoots`;
- deterministic module-name to file resolution;
- dependency graph construction with missing-module, cycle, and ambiguity rejection;
- diamond import deduplication and sibling-module isolation;
- declaration ownership and per-module source SHA-256 metadata;
- self-contained Core artifact v11 with no new logical Core constructor;
- certificate v2 binding the complete transitive source set;
- strict imported-source tamper rejection and independent replay with `projectPluginsLoaded: false`;
- historical v1-v10 artifact replay and certificate-v1 replay retained.

Deliberately deferred at this point: `public import`, `meta import`, `import all`, package/system resolution, sections, `open`, private/internal visibility, persistent interface-cache IO, and module-scoped typeclass visibility.

## K3b-module-interfaces0 — completed rollback profile

- explicit canonical module-interface fingerprints bound to full exported Core bodies and owned typeclass metadata;
- deterministic interface/cache identity with checked base-environment fingerprinting;
- explicit export metadata (`exports === declarations` in this profile) and ordered plain import-edge metadata;
- beginning of faithful `public import` semantics only if the required visibility groundwork is sound;
- dependency-interface binding groundwork for future module-scoped registration visibility;
- strict replay recomputation/rejection for base, dependency-interface, module-interface, and cache-key tampering;
- no kernel change.

Do not flatten `public`, `meta`, and `all` imports into identical behavior. If faithful semantics need more groundwork, implement the groundwork first.

## K3c-names0 — frozen names slice

Implemented and frozen: namespaces, nested/dotted hierarchical declarations, current/outward and relative-qualified resolution, `_root_.` resolution, namespace-scoped universes, qualified structural recursion, qualified module ownership, and root-safe Lean export; no kernel change.

## K3c-sections-open0 — frozen environment slice

Implemented: brace-shaped ordinary sections, section-local restoration of universe/open state, ordinary namespace `open`, command-time namespace validation, Lean-validated lookup precedence, ordered multiple opens, qualified suffix lookup through opened namespaces, imported namespace opens, and constructor-pattern resolution through opens. No kernel change.

Explicitly deferred to later slices: section variables / `variable` / `include` / `omit`; selective/hiding/renaming opens; `open scoped`; `open ... in`; private/internal/public visibility; and module-scoped registrations.

## K3c-section-vars0 — current release candidate

Implemented: named explicit/implicit/strict section variables; automatic generalization for supported value declarations; dependency closure; BinderInfo-preserving generated telescopes; theorem-specific named `include` / `omit`; lexical restoration across nested scopes; explicit-binder shadowing; historical v12 profile replay. No kernel change.

Deliberately deferred: section instance variables, omit-by-type, local/scoped registrations, richer open forms, visibility/export semantics, and non-value declaration capture that would require additional environment machinery.

Next after freeze: richer `open` forms that can be modeled without scoped-registration semantics, then local/scoped typeclass environment groundwork before `open scoped` / instance-variable-by-type behavior.

## K3c remainder through K6 — strategic direction

- K3c: namespaces/sections/`open`, qualified resolution, private/internal visibility, module-scoped registrations;
- K3d: elaborator constraints, higher-order pattern-unification subset, named/default arguments, coercions, autoImplicit, transparency modes;
- K3e: local/scoped instances, `outParam`, `semiOutParam`, default instances, stronger search tabling/transparency behavior;
- K4: proof-state/tactic core beginning with `rfl`, `exact`, `intro`, `apply`, `assumption`, always producing kernel-checked Core;
- K4/K5: syntax/macros/metaprogramming;
- K5: remaining logical/programming foundation such as Quot, broader inductives, effects/IO, unsafe/partial, arrays/strings/Int/UInt and stdlib;
- K6: systematic full v0.1 compatibility campaign with positive, negative, differential-Lean, and security fixtures.

After K3b, the immediate project-risk priority was a pinned **Lean 4.33.1 differential validation campaign** covering declaration types, universes, BinderInfo, generated declarations/recursors, reduction, proof irrelevance, Eq behavior, typeclass selection, module environment observations, and axiom dependencies. That initial campaign has now run against the exact official release (`4.33.1`, commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`) and accepted all 24 schema-2 cases across all 15 required dimensions.

The first real run exposed Lean-export precedence/name/codegen issues and several handwritten-reference syntax mistakes; those were repaired and converted to regressions before the all-green rerun. This remains an **initial slice validation**, not full Lean or full ProofScript-v0.1 parity. K3c-names0 is frozen with the namespace/root case; K3c-sections-open0 added the section/open case; K3c-section-vars0 adds the 24th exact-release semantic-equivalence case for section-variable telescope generalization and theorem include/omit policy. Every later K3c semantic addition must continue to extend and preserve this evidence.


## Kernel checkpoint v21 — KERNEL-inductive-universes0

Core v21 freezes exact Lean 4.33.1 constructor-field universe admission for the admitted non-mutual inductive Core: each non-parameter field must live at or below the inductive result universe, except `Prop` is impredicative; uniform parameters are exempt. Historical v1-v20 semantics remain frozen. Its successor is `KERNEL-dependent-fields0`; frontend expansion remains paused.


## KERNEL-dependent-fields0 — historical frozen checkpoint

- Core artifact v22; certificate v2 unchanged.
- Simple zero-parameter/index constructor fields may depend on earlier fields.
- Dependent minor-premise generation preserves field dependencies.
- Higher-order strictly-positive recursive fields may have Pi domains depending on earlier constructor fields, with pointwise IH and iota preserved.
- Exact Lean 4.33.1 dedicated probes pass; source differential remains 25/25.
- Historical v1-v21 profiles keep the prior simple dependent-field rejection.
- Checklist remains 34 implemented / 6 partial / 1 unsupported; full kernel completion remains NO.
- Next: `KERNEL-telescope-terms0`, targeting remaining trusted recursor-telescope term-shape gaps such as lambda/let terms without broadening source language work.


## KERNEL-telescope-terms0 — historical frozen checkpoint

- Core artifact v23; certificate v2 unchanged.
- Existing trusted `Lam`/`Let` terms are preserved through recursor telescope generation rather than rejected by the internal named-term bridge.
- Binder capture is covered for dependent fields; recursive Pi domains, indexed constructor-result terms, and empty indexed telescope domains are covered.
- Exact Lean 4.33.1 dedicated probes pass; source differential remains 25/25.
- Historical v1-v22 profiles preserve the old telescope-term rejection.
- Checklist remains 34 implemented / 6 partial / 1 unsupported; full kernel completion remains NO.
- Next: `KERNEL-mutual-inductives0`.


## KERNEL-mutual-inductives0 — frozen rollback checkpoint

Core v24 introduces the first trusted mutual-inductive block. The admitted slice is intentionally narrow: directly mutually recursive `Type` families, zero parameters/indices, shared result universe, ordinary/dependent nonrecursive fields, and direct recursive fields targeting another member. Admission is atomic and produces Lean-shaped mutual recursor families with shared motives/minors and cross-family iota.

v25 completed the shared-uniform-parameter extension.

## KERNEL-mutual-parameters0 — historical frozen checkpoint

Core v25 extends the atomic v24 mutual `Type` slice through shared uniform parameter telescopes, including dependent parameters. Every member telescope, constructor parameter prefix, recursive occurrence, and constructor result is checked definitionally for fixed-parameter discipline. Generated recursors carry the shared parameters before motives/minors, and cross-family iota reuses the same prefix. Exact Lean 4.33.1 observations cover both positive and mismatch cases.

The next step is `KERNEL-mutual-indices0`: add indexed mutual families without yet broadening to higher-order mutual recursion, mutual `Prop`, or nested preprocessing.


## KERNEL-mutual-higher-order0 / Core v27

v27 extends the direct indexed mutual `Type` block with strictly-positive higher-order recursive fields. Pi-domain mutual occurrences are rejected; Pi-codomain recursion receives pointwise cross-family induction hypotheses, and iota invokes the target family recursor with its exact shared parameters and reconstructed target indices. Historical v26 remains isolated. Mutual `Prop` and nested-inductive preprocessing remain separate gaps.

## KERNEL-mutual-prop0 / Core v28 — frozen checkpoint

v28 adds direct mutual `Prop` families and hardens the shared mutual recursor universe: every block whose result universe is not provably nonzero receives Prop-only motives, including empty mutual predicates and potential-Prop raw Core universes. Provably nonzero mutual Type blocks retain large elimination, and mutual K-like reduction is disabled. Shared parameters, per-family indices, and higher-order pointwise IH/iota remain supported under this policy. Historical v27 behavior is profile-isolated.

The next bounded trusted-kernel target after v28 is `KERNEL-nested-inductives0`; nested preprocessing remains separate from direct mutual recursion.


## KERNEL-nested-inductives0 / Core v29

v29 implements a bounded trusted nested-preprocessing slice by synthesizing an internal auxiliary family for one specialized checked container and reusing the direct-mutual checker. Exact Lean 4.33.1 evidence covers Box-like and recursive List-like nesting, linked helper recursors/iota, negative container rejection, replay, and v28 isolation. Remaining nested gaps are shared outer parameters, indexed/polymorphic containers, multiple/deeper nested specializations, and nested `Prop`.

Next bounded milestone: `KERNEL-nested-parameters0`.


## KERNEL-nested-parameters0 / Core v30

v30 threads shared/dependent outer parameters through the v29 trusted auxiliary-family nested transformation. Exact Lean 4.33.1 evidence covers ordinary and dependent parameters, linked parameter-aware helper recursors/iota, fixed-parameter rejection, serialization/replay, and v29 isolation. Outer indices and broader container forms remain separate.

Next bounded milestone: `KERNEL-nested-indices0`.


## KERNEL-nested-index-expressions0 / Core v32 evidence

v32 extends the v31 closed-specialization branch so fixed nested outer-index tuples may be arbitrary Core expressions over uniform outer parameters. A trusted context projection rejects any constructor-local free variable before auxiliary-family synthesis; recursor restoration re-instantiates the projected expression from the actual shared parameter prefix. Exact Lean 4.33.1 observations cover parameter indices, `succ` expressions, two-parameter expressions, linked indexed iota, local-index rejection, captured-index regression, serialization/replay, and historical v31 isolation.

The audit remains **34 implemented / 7 partially implemented / 0 unsupported** out of 41. Full kernel completion remains **NO**. Next bounded research milestone: `KERNEL-nested-mixed-specializations0`.


## KERNEL-nested-multiple-specializations0 / Core v33 evidence

v33 supports multiple compatible nested auxiliary families while keeping the transformation kernel-derived. Accepted exact-Lean shapes include two distinct fixed specializations of one container, two distinct containers, and multiple captured-current containers. Each unique auxiliary specialization gets an ordered helper motive/recursor, and definitional iota is tested through a later helper. Captured-current plus closed/projectable specialization in the same declaration is rejected, matching Lean 4.33.1 rather than being treated as a feature gap.

Frozen release evidence: exact source differential **25/25**, kernel-only milestone families **21/21**, trusted kernel matrix **23/23**, historical/frontend/tooling **31/31**. Checklist remains **34/7/0**; full kernel completion is **NO**. Next research target: `KERNEL-nested-polymorphic0`.


## KERNEL-nested-polymorphic0 / Core v34 evidence

v34 adds the bounded exact-Lean universe-polymorphic nested slice: explicitly instantiated polymorphic containers are accepted only when their instantiated parameter and result universes match the outer family universe. Linked helper motives/recursors retain Lean-compatible universe ordering and actual helper iota is checked. Universe metavariable inference, indexed containers, deeper nesting, and nested `Prop` remain open.

Development evidence before freeze: exact source differential **25/25**, kernel-only milestone families **22/22**, trusted kernel matrix **24/24**, historical/frontend/tooling **31/31**. Checklist remains **34/7/0**; full kernel completion is **NO**. Next research target: `KERNEL-nested-indexed-containers0`.


## KERNEL-nested-indexed-containers0 / Core v35 evidence

v35 extends v34 to one-parameter indexed nested containers. The trusted auxiliary mutual family preserves the container index telescope and constructors, and linked recursor reduction reconstructs the recursive container indices from trusted field types. Exact Lean 4.33.1 covers full indexed helper motives, recursive container iota, constructor-local indices, parameter-derived indices, replay, and v34 isolation.

Clean release evidence is exact source differential **25/25**, kernel-only milestone families **23/23**, trusted kernel/architecture **25/25**, and historical/frontend/tooling **31/31**. The audit remains **34 implemented / 7 partially implemented / 0 unsupported** because dependent container index domains, deeper nesting, nested `Prop`, general nested preprocessing, and final recursor/resource hardening remain open. Full kernel completion is **NO**. Next bounded positive milestone: `KERNEL-nested-deeper0`; dependent nested-container index domains are exact Lean rejections, not an implementation milestone.

## KERNEL-recursor-minor-order0 / Core v36

v36 corrects the trusted recursive recursor minor-premise order to match exact Lean 4.33.1: every constructor field precedes all induction hypotheses, across simple, parameterized, indexed, mutual, and nested recursors. Generator and definitional-iota application order are profile-gated together; historical v1-v35 retain the frozen interleaved order. Exact source differential is **25/25**, kernel-only milestone evidence **24/24**, clean trusted lineage **26/26**, historical/frontend/tooling **31/31**, and the 31-package standalone consumer rejects v36 fields-first semantic smuggling under v35. Audit remains **34/7/0**; full kernel completion is **NO**. Next positive milestone: `KERNEL-nested-deeper0`.


## KERNEL-nested-deeper0 / Core v37 evidence

v37 extends the trusted nested-inductive translation from one container layer to an exact two-layer closed chain for parameterless/indexless monomorphic `Type` outer families. The kernel derives a private three-member mutual block (outer + two helpers), rechecks it through the trusted mutual checker, restores public container/constructor/recursor identities, and preserves the v36 fields-first minor order. Exact Lean 4.33.1 covers `Box (Box Tree)`, `List (List Tree)`, `Box (Vec Tree i)`, `Vec (Box Tree) i`, recursive three-way linked iota, indexed helper telescopes, replay, and historical v36 rejection.

Exact source differential remains **25/25** and kernel-only milestone families through v37 are **25/25**. Dirty-tree trusted kernel/architecture is **27/27** and historical/frontend/tooling is **31/31**. The audit remains **34 implemented / 7 partially implemented / 0 unsupported** because arbitrary-depth/general nested preprocessing and final recursor/resource closure remain open. Full kernel completion is **NO**. Next bounded milestone: `KERNEL-nested-deeper-generalization0`.


## KERNEL-nested-deeper-parameters0 / Core v39 evidence

v39 extends v38's arbitrary finite linear nested-helper chain through **shared and dependent uniform outer parameters**. Deep fields are projected from constructor-local context into the outer-parameter context before recognition, every synthesized helper carries the same trusted parameter telescope, public recursor restoration reconstructs container specializations from actual shared arguments, and the private mutual checker revalidates fixed-parameter discipline. Parameter-derived container indices are admitted when the container index domains remain independent of the recursive outer family.

Exact Lean 4.33.1 evidence covers `Tree (α)` with `Box (Box (Tree α))`, dependent `(α : Type) (x : α)` nesting, parameter-derived indexed containers, actual linked parameterized iota, and rejection of fixed/transformed recursive parameters. Historical v38 remains profile-isolated. Dirty-tree trusted kernel/architecture is **29/29**, historical/frontend/tooling is **31/31**, exact source differential is **25/25**, and kernel-only milestone families are **27/27**. The audit remains **34 implemented / 7 partially implemented / 0 unsupported**; full kernel completion remains **NO**. Next bounded milestone: `KERNEL-nested-deeper-polymorphic0`.


## v41 — arbitrary-depth polymorphic deeper nesting

`KERNEL-nested-deeper-polymorphic0` / Core v41 combines v40 depth/parameter/index handling with explicit checked universe instantiation from v34. It supports polymorphic deep helper chains, fixed and captured/promoted outer-index modes, linked fields-first recursors/iota, and explicit multi-universe container instantiations whose parameter/result universes normalize to the outer family universe. Universe inference is deliberately not added. Next: `KERNEL-nested-deeper-multiple-fields0`.


## KERNEL-uniform-parameter-defeq0 / Core v47

v47 corrects uniform-parameter admission in the non-mutual checker: recursive family applications and constructor result parameters use trusted contextual definitional equality rather than literal de Bruijn identity. Exact Lean 4.33.1 accepts `id`/`let`/reducible-equal forms for non-indexed, indexed, and higher-order recursion and rejects genuinely different parameters. Actual recursive iota and historical v46 isolation are part of the gate.

Audit remains **35 implemented / 6 partially implemented / 0 unsupported**. Next research target: `KERNEL-dependent-indexed-recursor-completion0`, continuing the exact-oracle audit before any further semantic profile is created.


## KERNEL-dependent-indexed-recursor-completion0 / Core v49

v49 is the final assurance profile for the current non-mutual dependent/indexed recursor target. It adds no new trusted reduction/admission rule over v48. Instead, exact Lean 4.33.1 probes close the outstanding audit: dependent later-index telescopes, higher-order pointwise indexed IHs, linked iota, recursor family/index BinderInfo, and strict replay all agree. A proposed broader singleton-Prop “definitional index exposure” rule was rejected by the oracle: direct field occurrence permits large elimination, while beta/zeta-wrapped occurrences remain Prop-only when index auto-promotion is disabled.

Checklist after this audit: **39 implemented / 2 partially implemented / 0 unsupported**. Remaining rows are overall conversion/WHNF and resource exhaustion controls. Next semantic milestone is **`KERNEL-mutual-nested-generalization0`**, after which conversion must be re-audited over the expanded trusted declaration space.


## KERNEL-mutual-nested-generalization0 / Core v50 frozen evidence

v50 composes the previously separate direct-mutual and nested-preprocessing mechanisms. The bounded candidate supports monomorphic parameterless/indexless mutual `Type` blocks whose fields contain any finite set of one-level recursive specializations through already checked monomorphic one-parameter zero-index `Type` containers. Private helper members are synthesized deterministically, the entire enlarged graph is rechecked atomically by the trusted mutual checker, and public helper recursors/iota are restored to Lean-shaped container identities. Exact Lean confirms multiple distinct helper specializations and recursive containers, while negative-variance containers are rejected.

Exact Lean also confirms shared-parameter mutual+nested blocks as positive, so `inductives.mutual-nested` is reopened to partial. Frozen audit: **38 implemented / 3 partial / 0 unsupported**. Next bounded semantic slice: `KERNEL-mutual-nested-parameters0`.


## KERNEL-mutual-nested-parameters0 / Core v51

v51 threads shared and dependent uniform parameter telescopes through the v50 mutual+nested synthetic helper graph. Exact Lean 4.33.1 validates parameterized helper motives/recursors, dependent shared parameters, multiple helper specializations, and non-uniform parameter rejection. Next bounded target after release: `KERNEL-mutual-nested-indices0`.


## KERNEL-mutual-nested-indices0 / Core v52

v52 preserves each original mutual member's index telescope while synthesizing indexless nested helpers for fixed/shared-parameter-derived nested target specializations. Exact Lean rejects nested parameters containing constructor-local/index-local variables, and v52 rejects that same boundary. Multiple distinct fixed target tuples produce deterministic helper recursors. Next bounded slice: `KERNEL-mutual-nested-polymorphic0`.


## KERNEL-mutual-nested-polymorphic0 / Core v53

v53 composes v52's parameter/index-aware mutual+nested preprocessing with explicit universe polymorphism. Nested-container universe arguments are preserved and trusted-instantiated, helper families inherit the mutual block universe parameters, and the enlarged graph is rechecked atomically. Exact Lean 4.33.1 covers same-universe polymorphism, explicit independent container universe arguments, indexed composition, linked iota, and mismatch rejection. Next bounded slice: `KERNEL-mutual-nested-prop0`.


## KERNEL-mutual-nested-prop0 / Core v54

v54 admits the bounded Prop-valued mutual+nested composition for zero/fixed/shared-parameter-derived nested target indices. All original and helper motives are Prop-only, linked helper proof iota is exact-Lean validated, and shared universe parameters are preserved without adding a motive universe. Exact Lean source elaboration can auto-promote constructor-local apparent Prop indices, but with `inductive.autoPromoteIndices false` the kernel rejects that nested-local-target shape; it is therefore an elaborator concern rather than a kernel milestone.


## KERNEL-mutual-nested-indexed-containers0 / Core v55

v55 composes the one-level mutual/nested helper graph with indexed nested containers for both Type and Prop blocks. Helper families retain the checked container index telescope; target-family specializations remain bounded to shared-parameter/fixed target indices. Exact Lean confirms indexed helper motives and linked iota. Constructor-local Prop target auto-promotion is classified as frontend elaboration, not a kernel rule. Next bounded trusted-kernel slice: `KERNEL-mutual-nested-deeper0`.


### KERNEL-mutual-nested-deeper-parameters0 / Core v57

v57 carries shared and dependent fixed mutual parameters through the arbitrary-depth linear helper chain from v56. The helper graph is still synthetic-and-rechecked, not trusted metadata. Exact Lean validates parameter telescope/helper ordering and fixed-parameter rejection; ProofScript validates linked deep iota and constructor-local capture rejection. Outer indices/universes/multiple deep fields/indexed or dependent deep containers remain explicit later composition work.


### KERNEL-mutual-nested-deeper-indices0 / Core v58

v58 carries the original mutual families' per-member outer index telescopes through the parameter-aware arbitrary-depth helper chain. Deep target indices are allowed only when closed or derived from shared uniform parameters; constructor/index-local capture remains rejected, while ordinary direct mutual recursion may vary its target indices. The whole enlarged helper graph is rechecked by the existing trusted mutual checker. Exact Lean 4.33.1 confirms helper/index ordering and the locality boundary. Frozen v58 closes this bounded composition; the next bounded composition is explicit universe polymorphism across this deep indexed graph.


### KERNEL-mutual-nested-deeper-polymorphic0 / Core v59

v59 carries explicit universe polymorphism across v58's arbitrary-depth indexed mutual/nested helper chain. Public container level instantiations are preserved exactly, helper families share the mutual block universe telescope, and specialized result universes are rechecked atomically. Exact Lean 4.33.1 validates helper universe order and multi-layer `LiftBox.{u,0}` specializations. Next bounded research target: `KERNEL-mutual-nested-deeper-prop0`.


### KERNEL-mutual-nested-deeper-prop0 / Core v60

v60 carries the arbitrary-depth indexed/polymorphic mutual/nested chain into Prop while preserving the existing trusted Prop-only motive policy. No new elimination rule is introduced. Next bounded research target: `KERNEL-mutual-nested-deeper-indexed-containers0`.


### KERNEL-mutual-nested-deeper-indexed-containers0 / Core v61

v61 preserves live indexed-container helper telescopes across the arbitrary-depth Prop mutual/nested graph. Exact Lean 4.33.1 confirms that a current-layer container index may remain constructor-local/live, while a local value buried in a deeper container parameter specialization is rejected with auto-promotion disabled. The enlarged graph is rechecked by the trusted mutual checker. Next bounded research target: `KERNEL-mutual-nested-deeper-multi-parameter-containers0`.


### KERNEL-mutual-nested-deeper-multi-parameter-containers0 / Core v62

v62 extends v61's arbitrary-depth indexed Prop-container chain to arbitrary container parameter arity while requiring exactly one recursive-carrying parameter slot per layer. Fixed/nonrecursive parameter specializations are projected to the shared mutual-parameter context; current helper indices remain live. Exact Lean validates recursive slot positions 0 and 1, linked proof iota, and locality/multiple-recursive-slot rejection. Frozen release matrix is 52/52 kernel, 31/31 historical/tooling, exact 25/25, kernel milestone families 50/50, CLI/replay/tamper and conformance PASS, 31/31 package hashes verified, and a Lean-free external consumer independently checks/replays Core v62. Frozen v61 is the immediate rollback checkpoint. Next bounded target: `KERNEL-mutual-nested-deeper-multiple-fields0`.


### Core v63 frozen

v63 composes dependent container parameter telescopes into the deep indexed Prop mutual/nested helper graph using sequential staged validation. Frozen release gates are green: 53/53 kernel/architecture, 31/31 historical/frontend/tooling, exact Lean 25/25, 51/51 kernel milestone families, CLI/replay/tamper and conformance PASS, 31/31 package hashes, and a fresh Lean-free external consumer. Next bounded target: `KERNEL-mutual-nested-deeper-multiple-fields0`.

### v64 frozen evidence: multiple deep fields

v64 composes v63 dependent-container validation with a breadth-first, definitionally deduplicated helper-specialization graph across multiple compatible deep recursive fields. Exact Lean 4.33.1 validates complete helper reuse for identical fields (4 motives), distinct outer helpers sharing one inner helper (5 motives), deterministic first-occurrence ordering, linked iota, and locality rejection. Frozen release gates are clean kernel/architecture 54/54, clean historical/frontend/tooling 31/31, exact source differential 25/25, kernel milestone families 52/52, CLI/replay/tamper and conformance PASS, 31/31 package hashes verified, and a fresh Lean-free external consumer independently checks/replays Core v64. Frozen v63 is the immediate rollback checkpoint. Next bounded semantic target: `KERNEL-mutual-nested-deeper-multiple-recursive-parameter-slots0`.


### KERNEL-mutual-nested-deeper-multiple-recursive-parameter-slots0 / Core v65 frozen evidence

v65 permits a deep helper node to expose several recursive-carrying container parameter slots. The helper graph remains breadth-first and definitionally deduplicated; each recursive slot is rewritten to the matching helper or mutual target, and the existing trusted direct-mutual checker derives one IH per rewritten slot. Exact Lean 4.33.1 confirms shared-helper `PairP` graphs and linked iota. Frozen release gates are clean kernel/architecture **55/55**, clean historical/frontend/tooling **31/31**, exact source differential **25/25**, kernel milestone families **53/53**, CLI/replay/tamper and conformance **PASS**, 31/31 package hashes verified, and a fresh Lean-free external consumer independently checks/replays Core v65 with `projectPluginsLoaded:false`. Frozen v64 is the immediate rollback checkpoint. Next: `KERNEL-mutual-nested-final-generalization-audit0` before any promotion of the broad mutual/nested checklist row; then complete conversion/WHNF closure and resource/adversarial hardening.


### KERNEL-mutual-nested-final-generalization-audit0 / Core v66 frozen evidence

v66 completes the audited mutual/nested target by removing legacy Prop/universe-parameter routing restrictions, composing higher-order positive recursion with nested preprocessing, and closing helper discovery transitively over admitted mutually recursive container families. Exact Lean 4.33.1 covers Type/Prop nonlinear graphs, monomorphic Type 0, indexed/non-indexed blocks, higher-order codomains/function-valued recursive parameters, container-family closure, linked Type iota, and negative locality/universe boundaries. Audit: **39 implemented / 2 partially implemented / 0 unsupported**. Next: `KERNEL-conversion-final-audit0`, then `security.resource-bounds`.


### KERNEL-conversion-final-audit0 / Core v67 frozen evidence

v67 performs the full admitted-space conversion/WHNF audit after mutual/nested closure. It fixes the exact-Lean transparent-head application-spine case for partial recursors and quotient recursors without weakening opacity. All prior conversion families remain regression-covered. Audit: **40 implemented / 1 partially implemented / 0 unsupported**. The only remaining kernel checklist row is `security.resource-bounds`; next milestone: `KERNEL-resource-bounds0`.


### KERNEL-resource-bounds0 / Core v68 frozen

v68 is the final audited kernel row. It provides deterministic typed resource exhaustion across artifact decode, direct Core checking, conversion/WHNF/positivity, nonlinear helper graphs, certificates/verifier input, and CLI replay. The checklist is **41/41 implemented**. Clean source-only reproduction, 31-package distribution, fresh Lean-free consumer, filtered ZIP integrity, and hash gates all pass. The full audited trusted-kernel checkpoint is frozen; the next project phase should be selected outside the kernel checklist rather than inventing another semantic kernel milestone.

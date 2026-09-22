# Implementation matrix

`partial` means only the explicitly documented profile is implemented. It never means full Lean/ProofScript feature-family conformance.

| Reference area | `K3c-section-vars0` | Next owner | Notes |
|---|---:|---|---|
| universes / dependent Core | partial | kernel | zero/succ/max/imax/params; Pi/Lam/App/Let; broader Lean parity pending |
| BinderInfo | partial | parser/elaborator/codec | explicit/implicit/strict/instance preserved; optional/auto deferred |
| hidden type synthesis/unification | partial | elaborator | K2m frontend metas, occurs check, first-order structured type inference; no metas in Core |
| theorem/axiom/transparency | partial | frontend/kernel | direct terms; assumptions; def/abbrev/opaque/example distinctions |
| inductives/recursors | partial | kernel | non-mutual/parameter/index slices plus v16 strict positivity, v17 indexed recursors, v18 indexed projections, v19 Prop-elimination classification, and v20 RecursorVal.k reduction; general recursor/universe/mutual-nested behavior still partial |
| `Eq`, `Nat`, `Bool`, `Nat.add` | partial/bootstrap | kernel/std | checked standard bootstrap |
| literals / propositional `=` | partial | elaborator | bounded Nat/Bool lowering; `=` lowers to Eq; general typeclass literal/operator semantics deferred |
| structures/match/recursion/equations | partial | elaborator/recursion | current restricted lowering slices; no source-level kernel primitives |
| `class` declarations | partial | elaborator/typeclass | K2r-inherited structure-style global class registry with explicit parameter telescopes |
| `instance` declarations | partial | elaborator/typeclass | named/anonymous concrete plus polymorphic hidden-type global instances, priority/default-1000/order metadata |
| `[inst : C]` class validity | partial | elaborator/typeclass | requires registered class target in supported slice |
| instance synthesis | partial | typeclass/elaborator | K2r-inherited fully-known parameterized/global class goals; hidden type parameters solved first-order; bounded recursive instance prerequisites; cycle/depth guards; priority then recency; kernel verifies the instantiated candidate |
| parameterized classes/concrete instances | partial | typeclass/elaborator/kernel | explicit class parameters + concrete/polymorphic instances + bounded instance-implicit prerequisite chains |
| recursive instance dependencies | partial | typeclass/elaborator | K2r-inherited bounded global prerequisite recursion; cycle guard; depth 16; no Lean tabling/backtracking parity |
| local/scoped instances | unsupported | environment/typeclass | later |
| `outParam` / `semiOutParam` | unsupported | typeclass | later search controls |
| default instances | unsupported | typeclass/elaborator | later |
| cycle/diamond/tabling/search backtracking | partial/unsupported | typeclass | active-goal cycle guard + hard depth bound implemented; Lean tabling/diamond/backtracking semantics deferred |
| `OfNat` / `BEq` / arithmetic typeclass operators | unsupported | elaborator/typeclass/std | later |
| plain multi-file modules/imports | partial | project/parser/frontend/codec/certificates | K3a/K3b header `import Foo.Bar;`, source roots, deterministic graph, cycle/missing/ambiguity rejection, diamond dedup, sibling isolation, v12 ownership/export/source/interface/cache provenance, certificate v2 |
| module interface/cache identity | partial | kernel-codec/frontend/project | K3b canonical interface v1 + cache-key v1 + base-environment fingerprint; strict recomputation implemented; persistent cache IO deferred |
| module visibility/export metadata | partial | environment/project | explicit exports implemented, but K3b requires `exports === declarations`; private/public semantics deferred |
| `public`/`meta`/`import all`, package/system resolution | unsupported | project/environment | post-K3b; semantics must not be flattened |
| namespaces / sections / `open` | partial | environment/parser/elaborator | K3c-section-vars0 implements namespace blocks, hierarchical/current/outward/relative-qualified/`_root_.` resolution, ordinary sections/open, named explicit/implicit/strict section variables, auto-generalization with dependency closure, and theorem include/omit; section instance variables, omit-by-type, richer open forms, and visibility remain unsupported |
| tactics/macros/metaprogramming | unsupported | tactics-core/macro | later |
| quotients/full inductive parity | unsupported/partial | kernel | later |
| execution backends | architecture only | compiler/plugins | no general execution-correctness claim |
| pinned Lean 4.33.1 differential validation | initial pinned campaign passed | oracle/differential | official 4.33.1 release commit `819816b2...`; schema-2 25-case source corpus accepted 25/25 plus 7/7 kernel-only milestone families through v19 across 15 required dimensions; exact version+commit gate; standalone runtime remains independent; broader/full-reference parity still future work |


### Kernel v53 mutual+nested polymorphism

`KERNEL-mutual-nested-polymorphic0` composes explicit universe-polymorphic mutual members and already-admitted polymorphic nested containers with the v52 helper graph. Explicit universe arguments are preserved and rechecked; linked helper recursors/iota are exact-Lean validated. Mutual+nested Prop, deeper combined graphs, and indexed nested containers remain partial.


### Kernel v54 mutual+nested Prop

`KERNEL-mutual-nested-prop0` composes the v53 mutual+nested graph with Prop-valued mutual families for zero/fixed/shared-parameter-derived nested target indices. The existing trusted mutual-Prop checker supplies one Prop-only motive policy to originals and helpers; linked proof iota and shared polymorphic parameters are exact-Lean validated. Constructor-local Prop target-index promotion, deeper combined graphs, and indexed nested containers remain partial.

- v56 `KERNEL-mutual-nested-deeper0`: bounded arbitrary-depth linear mutual+nested helper chains for monomorphic zero-parameter/index Type or Prop blocks; broader deep composition remains partial.

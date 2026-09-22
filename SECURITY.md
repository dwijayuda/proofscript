# Security and trust model

1. The kernel receives explicit inert core declarations, never source syntax or plugin callbacks.
2. Strict verification decodes bounded JSON and creates a fresh environment.
3. `psc verify` delegates logical replay to the separate `psverify` executable. Project configuration and project plugins are not loaded in that process.
4. Axioms are explicit and rejected by strict verification unless approved by name.
5. Hashes bind artifacts but are not proofs; the verifier rechecks declarations. For certificate v2, strict verification additionally requires the certificate module set to equal decoded module metadata and every actual source hash to equal both recorded hashes.
6. Backend success is not proof of execution correspondence.
7. Oracle success is additional evidence; it does not retroactively make frontend translation correct unless statement/environment binding is also checked.
8. Resource exhaustion and implementation errors are not semantic rejection.

## Plugin threat model

Compiler plugins execute as Node code in the compiler process and are therefore operationally trusted with the developer's local process permissions. They are **not logically trusted**. A future hardened host may use subprocess/permission isolation for untrusted compiler plugins.

Strict verification does not execute project plugins.


## Module and certificate provenance

K3b/K3c module resolution, namespace/name resolution, interface construction, and cache identity are untrusted frontend/codec logic. The kernel never reads source paths, resolves imports, or trusts cache decisions. Artifact v12 module metadata is inert provenance validated by `@proofscript/kernel-codec`; ownership/import graphs are validated and the base-environment, dependency-interface, module-interface, export, and cache-key identities are recomputed from decoded data before replay.

Certificate v2 binds the entry module, complete transitive source set, each source path/SHA-256, and the Core artifact SHA-256. Strict verification rejects module-set mismatch, source-hash mismatch, artifact-provenance mismatch, or logical replay failure. Changing an imported file after certification therefore invalidates verification even when the entry file is unchanged.

Strict `psc verify`/`psverify` does not load project configuration semantics or project plugins and does not rerun import resolution, elaboration, typeclass search, tactics, or macros. Those layers may only have produced candidate Core beforehand.

## Interface/cache threat model

Module-interface and cache hashes are integrity/identity mechanisms, not proofs. An attacker who edits v12 metadata without making it consistent with the decoded declarations, registration metadata, dependency graph, and source hashes is rejected by the codec. Even a perfectly consistent metadata record cannot admit an invalid theorem: strict verification still independently checks the explicit Core with the kernel. Persistent compiled cache IO is not implemented in K3c-section-vars0, so there is currently no trusted deserialization path for cached elaborator state.



## Namespace/name-resolution threat model

`namespace`, `section`, ordinary `open`, relative-qualified lookup, and `_root_.` are frontend environment operations only. K3c-section-vars0 resolves source names and section-variable references to explicit hierarchical Core constants and ordinary Pi/Lam telescopes before the trust boundary. The kernel has no namespace/section stack, `open` table, property-access semantics, or source-name fallback. Open targets are validated at the command point, open state is lexically restored, and exact Lean 4.33.1 differential fixtures cover namespace/root and section/open precedence. Named section-variable generalization and theorem include/omit are implemented in the untrusted frontend; the kernel has no section-variable policy state. Section instance variables, omit-by-type, richer open forms, and visibility remain unsupported rather than emulated.

## Differential evidence trust

Lean differential evidence is development evidence outside the trusted kernel. Only an executable whose parsed version is exactly `4.33.1` **and** whose reported release commit is exactly `819816b2e0a3bf405af45ae5c7af2491d8f5bee6` may satisfy the pinned oracle gate. Missing, near-version, missing-commit, or wrong-commit oracles are `unsupported`. The schema-2 harness distinguishes semantic equivalence, negative agreement, and capability gaps and validates structured ProofScript observations before invoking Lean. The fake-oracle harness self-test exercises control flow only; it is never accepted as semantic evidence and writes only to a temporary report.

## Kernel-only v14 empty-inductive threat model

`KERNEL-empty-inductives0` is a kernel-only Core v14 profile. Empty-inductive admission is intentionally profile-gated because historical v1-v13 artifacts were produced when zero-constructor inductives were unavailable. The strict decoder therefore rejects empty inductives under historical profiles instead of replaying them with newly introduced semantics.

Strict v14 replay selects the exact recursor-generation profile: Lean-shaped motive-first universe ordering, BinderInfo for the supported recursor families, and the dedicated empty-recursion layout. Historical artifacts retain the legacy recursor profile. This prevents a kernel upgrade from silently changing the meaning of serialized historical applications to generated recursors.

Generated empty recursors are not serialized as forgeable declarations; they are reconstructed after inductive admission. Admission remains atomic, including generated-name collisions. Empty `Prop` arbitrary-sort elimination is available only through a kernel-generated empty recursor for an admitted empty proposition.

## Kernel-only v15 projection / structure-eta threat model

`KERNEL-structure-eta0` is a kernel-only Core v15 profile. Raw `proj` terms are accepted only under v15; v1-v14 strict decoding rejects them so historical artifacts cannot acquire new projection or eta semantics retroactively.

The trusted checker validates the projection target as an admitted one-constructor inductive, requires the v15-supported zero-index shape, bounds/checks the field index, independently infers the major expression type, reconstructs dependent field types from the constructor telescope, and only performs projection iota reduction when the major reduces to the unique constructor. Multiple-constructor, wrong-type, malformed-index, unknown-type, and indexed projection terms fail closed.

Structure eta is enabled only for a one-constructor, zero-index inductive whose constructor fields contain no recursive occurrence of the inductive. Recursive one-constructor types still admit raw projections in the v15 zero-index slice but deliberately do **not** receive eta. Exact Lean 4.33.1 raw `Expr.proj` / `isDefEq` probes cover this boundary. Indexed raw projection inference remains an explicit capability gap, not an approximation.


## Kernel-only v16-v19 semantic profile isolation

`KERNEL-inductive-positivity0` (v16), `KERNEL-indexed-recursors0` (v17), `KERNEL-indexed-projections0` (v18), `KERNEL-prop-elimination0` (v19), and `KERNEL-recursor-k0` (v20) each add trusted semantics only behind their explicit artifact profile. Historical artifacts cannot acquire later positivity, indexed-recursion, indexed-projection, Prop-elimination, or K-like reduction behavior by relabeling. Generated constructor/recursor capabilities are reconstructed and checked from admitted declarations rather than trusted from forgeable frontend metadata.

## Kernel-only v18 indexed-projection threat model

v18 extends raw `Proj` checking to the admitted non-mutual one-constructor indexed environment. The checker independently validates the major type head, universe arity, parameter/index arity, field bounds, dependent later-field substitution, recursive indexed majors, projection iota, and Lean's Prop projection safety. Indexed families do not gain structure eta. Historical v1-v17 profiles reject v18-only indexed projection semantics.

## Kernel-only v19 Prop-elimination threat model

v19 derives the recursor motive-universe permission from the admitted inductive declaration itself; no serialized `allowLargeElimination` flag is trusted. Empty propositions may eliminate to arbitrary Sort. Multi-constructor propositions remain Prop-only. A one-constructor proposition receives large elimination only when every non-parameter constructor field is either proof-valued or directly exposed through constructor-result indices. Tests cover hidden data fields, proof-only and dependent proof fields, recursive proof fields, parameters, indices, multiple constructors, and index-exposed data. Historical v1-v18 artifacts cannot acquire this permission by profile relabeling.

Lean's `RecursorVal.k` K-like reduction remains deliberately separate from elimination permission. v20 implements it by deriving K eligibility from the checked declaration and reconstructing the unique nullary constructor from the major's parameters; reduction occurs only when the reconstructed constructor type is definitionally equal to the actual major type. No serialized/frontend K flag is trusted.


## Kernel-only v20 RecursorVal.k threat model

`KERNEL-recursor-k0` never trusts an artifact field saying that a recursor supports K. The kernel re-derives eligibility from the admitted inductive declaration: the family must live in `Prop`, there must be exactly one constructor, and that constructor must have zero non-parameter fields. Before iota reduction on an arbitrary proof major, the kernel infers the major type, reconstructs the unique nullary constructor using the major type's parameters and universes, and requires definitional equality between the reconstructed constructor type and the actual major type. Thus Eq-like mismatched indices remain stuck, while matching or definitionally equal indices reduce. Historical v1-v19 profiles keep K reduction disabled, and the v20 replay tests require semantic-smuggling attempts to fail.


## Kernel-only v21 inductive-universe threat model

`KERNEL-inductive-universes0` derives universe admission exclusively from the checked inductive result sort and constructor telescope. No frontend or serialized flag can waive the check. Every non-parameter constructor field is independently inferred in its local constructor context and must satisfy `fieldSort <= resultSort`; `Prop` is the exact impredicative exception, and uniform parameters are intentionally exempt as in Lean 4.33.1. The profile is an admission tightening: historical v1-v20 profiles deliberately retain their frozen pre-v21 behavior rather than being silently reinterpreted.


## v22 dependent-field trust boundary

`KERNEL-dependent-fields0` does not trust a serialized “dependent fields allowed” bit. The v22 profile selects a kernel capability, but every constructor type is still inferred in the trusted environment, each field is checked in the exact constructor-local context of earlier fields, v21 universe ceilings remain active, and v16 positivity remains active for recursive occurrences. Historical v1-v21 profiles preserve their old simple-path rejection. Recursor generation converts de Bruijn field dependencies to internal named telescope references and lowers them back to Core before replay; malformed/unbound dependencies fail closed during inference/generation.


## Kernel-only v24 mutual-inductive threat model

`KERNEL-mutual-inductives0` introduces a new Core block kind only for v24. Historical v1-v23 codecs reject it. The kernel stages the entire block atomically: all member headers are made visible only in a cloned environment while constructor types, common result universe, field universes, direct recursive targets, generated recursor types, and name collisions are checked. Any failure discards the whole block. No serialized field can mark an arbitrary occurrence positive or authorize mutual recursion.

The first slice intentionally admits only zero-parameter/index `Type` families and only direct recursive fields whose WHNF is exactly a mutual-family constant at the shared universe instantiation. Pi-wrapped/higher-order mutual occurrences, mutual `Prop`, mutual indices/parameters, and nested preprocessing fail closed rather than inheriting non-mutual rules accidentally. Generated recursor metadata records the target family of each recursive field and global minor position; reduction reuses the shared motives/minors and invokes the target family recursor, matching exact Lean 4.33.1 behavior for the supported slice.


## Kernel-only v25 mutual-parameter threat model

`KERNEL-mutual-parameters0` adds no serialized “uniform parameter” authority. The v25 profile only enables the trusted checker to admit a nonzero shared parameter count inside the already-atomic v24 mutual block. Every member must have the same parameter count and a definitionally equal telescope in the corresponding local context; parameter types may depend on earlier parameters but may not depend on the families being defined.

Constructor parameter binders are checked against that shared telescope. Direct recursive fields must target a mutual member at the same universe instantiation and at exactly the corresponding shared parameters; constructor results are checked by the same fixed-parameter rule. A mismatch anywhere aborts the entire staged block. Generated recursors reconstruct the shared parameter telescope from the checked member type and prepend those parameters before motives/minors; reduction reuses the already-checked prefix rather than trusting metadata to invent parameters. Historical v24 replay decodes the syntax but rejects parameterized mutual semantics in the kernel. Mutual indices, higher-order mutual recursion, mutual `Prop`, and nested preprocessing remain fail-closed.

## Kernel-only v26 mutual-index threat model

`KERNEL-mutual-indices0` adds no serialized authority saying an index is safe. The trusted checker derives each member's parameter/index telescope from the admitted declaration, requires exact target-family arity and universe instantiation for recursive fields/results, keeps shared parameters definitionally fixed, and rejects any mutual-family occurrence nested inside recursive or constructor-result indices. Whole-block admission remains atomic. Historical v25 replay does not acquire indexed-mutual semantics by relabeling.


## KERNEL-mutual-higher-order0 trust boundary

`KERNEL-mutual-higher-order0` adds no serialized authority that a recursive function field is positive. The trusted checker walks the field's Pi telescope, rejects every mutual-family occurrence in a Pi domain, requires the terminal codomain to be a direct mutual-family application with exact universe instantiation, fixed shared parameters, and valid target indices, and then derives the pointwise induction hypothesis/reduction path itself. Admission remains atomic for the whole mutual block. Historical v26 replay cannot acquire v27 higher-order semantics by relabeling.

## KERNEL-mutual-prop0 trust boundary

`KERNEL-mutual-prop0` adds no serialized “large elimination allowed” authority. The trusted checker derives one shared motive-universe policy from the checked mutual result level. A result universe proven nonzero retains the existing fresh motive universe; otherwise the recursors are restricted to `Prop`, including empty mutual predicates and raw Core universe parameters that may instantiate to zero. Mutual recursors never receive `RecursorVal.k`. Shared parameters, indices, and strictly-positive higher-order recursive fields reuse their previously checked target-family metadata under this policy.

This is also a historical-profile hardening boundary. v27 explicitly rejects mutual `Prop`, but its raw Core accepted a mutual result `Sort u` and generated the older fresh-motive recursor. v28 does not silently alter v27 replay: the old behavior stays frozen in v27, while v28 alone applies the conservative potential-`Prop` rule. No contradiction exploit is claimed; the old behavior is tracked as semantic/trust-boundary over-permissiveness and a potential soundness risk relative to Lean's mutual-predicate elimination rule.

## KERNEL-nested-indices0 trust boundary

`KERNEL-nested-indices0` adds no serialized authority saying an outer index is safe to capture or specialize. The trusted checker derives one of two bounded Lean-compatible transformations from the checked nested field itself. In captured-index mode, constructor-local outer indices are promoted into the private auxiliary mutual block's fixed parameter prefix; the existing mutual checker then requires every constructor result and recursive occurrence to keep those promoted indices definitionally uniform. In closed-specialization mode, the outer family retains its real index telescope while the private helper family is specialized to one closed fixed index tuple. Constructor-local variables are not accepted in that closed tuple. Linked helper reduction reconstructs the target outer recursor indices from the checked recursive field type. Historical v30 replay keeps indexed nested preprocessing disabled.


## KERNEL-nested-index-expressions0 trust boundary

`KERNEL-nested-index-expressions0` adds no serialized authority saying that a nested index is parameter-only. For the new v32 branch, the trusted kernel projects each candidate fixed index expression from the full constructor-local context into the uniform outer-parameter context. Projection succeeds only when every free de Bruijn reference denotes one of those uniform parameters; any constructor-local field/index reference rejects the nested transformation. The projected expression is later re-instantiated from checked actual parameter arguments when helper recursors and iota reductions reconstruct the target outer index. Historical v31 keeps its original captured-index and closed-constant classifier/reduction path and cannot acquire v32 semantics by relabeling.


## KERNEL-nested-multiple-specializations0 trust boundary

`KERNEL-nested-multiple-specializations0` adds no serialized authority declaring a container or specialization safe. The v33 kernel discovers every nested occurrence from checked constructor types, classifies each occurrence using the existing trusted captured-current or parameter-context projection rules, and synthesizes one auxiliary mutual family per unique compatible specialization. Definitionally equal fixed specializations may share an auxiliary; different specializations/containers get distinct helpers in first-occurrence order. A declaration is admitted only when all nested occurrences use one global mode (all closed/projectable or all captured-current). Captured+closed mixtures reject atomically, matching exact Lean 4.33.1. Historical v32 and earlier profiles cannot acquire v33 semantics by artifact relabeling.


## KERNEL-nested-polymorphic0 trust boundary

`KERNEL-nested-polymorphic0` adds no serialized authority declaring a universe-polymorphic container safe. The v34 kernel reads the explicit universe arguments from the checked nested container constant, instantiates the already-admitted container type and constructors, and requires both the container parameter universe and result universe to be definitionally equal to the outer family universe before synthesizing the auxiliary mutual block. It does not solve universe metavariables or trust frontend metadata. Historical v33 and earlier profiles cannot acquire v34 semantics by artifact relabeling.


## KERNEL-nested-deeper0 trust boundary

`KERNEL-nested-deeper0` adds no serialized permission bit for deep nesting. The v37 kernel recognizes one exact closed two-container chain in the checked constructor field, derives two private auxiliary families from already-admitted container declarations, and rechecks the resulting three-member mutual block through the trusted mutual-inductive checker. Public helper recursors are restored from that checked block; their linked reduction metadata is kernel-derived. Historical v36 and earlier profiles cannot acquire v37 deeper-nesting semantics by artifact relabeling. Container index domains that depend on the recursive outer family remain rejected, matching exact Lean 4.33.1 observations.


## Kernel-only v49 conformance-profile threat model

`KERNEL-dependent-indexed-recursor-completion0` / Core v49 introduces a new artifact/profile identity but no new trusted type-theory rule over frozen v48. Its purpose is to bind the final non-mutual dependent/indexed recursor evidence to an explicit replay profile. v49 and v48 must therefore accept the same checked declarations for this audited slice. Decoder/version pairing is still strict: a v49 artifact cannot claim format 48 while retaining the v49 profile string.

The exact Lean 4.33.1 audit rejected a proposed broadening of singleton-Prop large elimination. When automatic index promotion is disabled, only direct syntactic exposure of a data field in the constructor result index receives large elimination; beta/zeta-wrapped occurrences remain Prop-only. The trusted kernel preserves that negative boundary.


## Kernel-only v50 mutual+nested generalization threat model

`KERNEL-mutual-nested-generalization0` does not trust serialized helper-family, motive, positivity, or recursion metadata. The checker recognizes one-level nested recursive specializations from the actual checked constructor field types and already admitted container declarations. It synthesizes private auxiliary mutual members deterministically, rewrites the public mutual block into that enlarged graph, and submits the whole graph atomically to the existing trusted direct-mutual checker. Only after successful admission are public container identities and linked helper recursors restored. Distinct specializations have deterministic first-occurrence helper order and identical specializations deduplicate. Negative-variance containers remain rejected by strict positivity. Historical v1-v49 profiles never enable this preprocessing, so profile relabeling cannot grant v50 semantics.

The supported v50 slice is intentionally bounded to monomorphic parameterless/indexless mutual `Type` blocks and already checked monomorphic one-parameter zero-index `Type` containers. Exact Lean-positive shared-parameter mutual+nested blocks and further indexed/polymorphic/Prop/deeper compositions remain explicit gaps; they are not approximated by this profile.


## Kernel-only v51 mutual+nested parameter threat model

`KERNEL-mutual-nested-parameters0` does not trust serialized parameter-helper metadata. The checker recognizes nested recursive specializations from constructor field types, projects the actual shared parameter arguments, synthesizes parameterized private helper families, and submits the enlarged block to the existing trusted mutual checker. The same checker therefore enforces shared/dependent parameter telescope compatibility and definitional parameter uniformity. Non-uniform nested targets fail atomically. Historical v1-v50 profiles never enable the v51 parameterized preprocessing path.


## Kernel-only v52 mutual+nested index threat model

`KERNEL-mutual-nested-indices0` never trusts serialized helper or fixed-index metadata. The checker recognizes each nested specialization directly from constructor field types, projects every nested target index through the constructor-local context into the shared mutual-parameter context, and rejects the declaration if any projected index references a constructor/index-local binder. Distinct fixed tuples are deduplicated only by trusted definitional equality in the parameter context. The enlarged synthetic mutual block is then rechecked by the existing trusted mutual checker. Historical v1-v51 profiles never enable this preprocessing path.


## Kernel-only v53 mutual+nested polymorphism threat model

`KERNEL-mutual-nested-polymorphic0` never trusts serialized claims that a universe specialization is valid. The checker reads explicit level arguments from the nested container constant, instantiates the already-admitted container type and constructors under the mutual block's declared universe parameters, requires the instantiated helper/result universe to be compatible with the original mutual result universe, and submits the complete synthetic block to the existing trusted mutual checker. It does not solve universe metavariables or manufacture level equalities. Historical v1-v52 profiles never enable this preprocessing path, and decoder/profile pairing rejects relabeling.


## KERNEL-mutual-nested-prop0 / Core v54 threat model

`KERNEL-mutual-nested-prop0` adds no serialized authority that a mutual/nested declaration may eliminate into a large universe. The kernel first requires every original mutual member to live in `Prop`, synthesizes helper predicates only from checked one-parameter/zero-index Prop containers, and submits the complete enlarged block to the already-trusted mutual-Prop checker. That checker derives one Prop-only motive policy for every original/helper recursor; no frontend motive-universe flag is trusted. Nested target indices must still project into the shared parameter context, so constructor/index-local captures fail closed in v54. Exact Lean 4.33.1 accepts a broader promoted-local-index Prop transformation; v54 records that as unsupported rather than reusing the stricter Type-valued locality rule incorrectly. Historical v1-v53 profiles cannot acquire v54 semantics by relabeling.


## KERNEL-mutual-nested-indexed-containers0 / Core v55 threat model

v55 does not trust artifact metadata to declare helper indices. The nested container declaration must already be kernel-admitted with exactly one recursive parameter and one-or-more indices; its explicit universe instantiation is checked, its parameter/result universe must match the mutual block, and the helper index telescope is derived directly from the checked container type. The bounded slice rejects container index domains that depend on the recursive mutual target. Mutual target indices still cannot capture constructor/index locals. Exact Lean source behavior that appears to accept such a local Prop target is caused by `inductive.autoPromoteIndices`; disabling auto-promotion makes the kernel reject it, so that source transformation remains outside the trusted kernel. Historical v1-v54 profiles cannot acquire v55 preprocessing by relabeling.


## KERNEL-mutual-nested-deeper0 / Core v56 threat model

v56 trusts no serialized helper graph. The kernel discovers one exact closed linear deep recursive field, derives every helper family from already checked container declarations, orders helpers outermost-to-innermost, rewrites the original and helper constructors into one synthetic mutual block, and submits that complete block to the existing trusted mutual checker. Only monomorphic one-parameter zero-index containers and parameterless/indexless mutual members in one common `Type` or `Prop` result sort are admitted. Any second deep field, constructor-local capture, incompatible container result sort, or negative occurrence is rejected. Historical v1-v55 profiles keep this preprocessing disabled.


## KERNEL-mutual-nested-deeper-parameters0 / Core v57 threat model

v57 never trusts serialized helper declarations or a claim that a recursive occurrence preserves mutual parameters. The kernel derives the shared/dependent parameter context from the admitted mutual declarations, projects every recursive field out of constructor-local context, requires exact contextual definitional equality with the common fixed parameter tuple, synthesizes every deep helper deterministically, and submits the complete enlarged block to the existing trusted mutual checker. A recursive field that depends on a constructor-local value is rejected immediately before helper synthesis. Historical v1-v56 profiles keep this composition disabled.


## KERNEL-mutual-nested-deeper-indices0 / Core v58 threat model

v58 does not trust serialized fixed-index or helper-graph claims. The kernel derives the shared parameter context from the mutual declarations, projects the selected deep nested field out of constructor-local context, and rejects it if any nested target index refers to a constructor/index-local value. Original mutual index telescopes are retained exactly, while helper families are synthesized deterministically from already admitted monomorphic one-parameter zero-index containers. Ordinary direct recursive fields may still carry varying indices and are rechecked in their full constructor context by the existing trusted mutual checker. Historical v1-v57 profiles keep this deep-index composition disabled and strict artifact profile/version pairing rejects relabeling.


## KERNEL-mutual-nested-deeper-multiple-recursive-parameter-slots0 / Core v65 threat model

v65 adds no serialized authority saying which container parameters are recursive. The checker derives top-level recursive carrier slots from the actual constructor field term and already-admitted container declarations. Every helper parameter specialization must project into the shared mutual-parameter context; helper nodes are deduplicated only by trusted contextual definitional equality. Dependent parameter telescopes are specialized and type-checked sequentially in the staged environment. `rewriteNestedV45` rewrites all matching recursive child slots, after which the entire synthetic graph is admitted atomically by the existing direct-mutual checker, which independently re-derives positivity, recursive targets, induction hypotheses, recursor types, and iota rules. Historical v1-v64 profiles never enable this path, and strict codec/profile pairing rejects relabeling.

## KERNEL-mutual-nested-final-generalization-audit0 / Core v66 threat model

v66 adds no serialized authority for helper graph membership, recursive slots, result-Sort eligibility, higher-order recursion, or container-family closure. The checker re-derives all of these facts from admitted declarations. Nonlinear helper nodes are identified by their complete specialization and trusted contextual definitional equality; nested occurrences under Pi codomains are rewritten while Pi-domain occurrences remain subject to the existing strict-positivity rejection. Transitive dependencies through an admitted mutual container family are discovered from that family's checked constructor graph and folded into the same atomic synthetic mutual block. Potentially-Prop bare `Sort u`, mixed result universes, constructor/index-local capture, malformed profile relabeling, and historical v65 semantic smuggling fail closed. Exact Lean 4.33.1 covers the positive and negative boundary cases in the dedicated v66 differential test.

## KERNEL-conversion-final-audit0 / Core v67 threat model

v67 changes no serialized reduction authority and introduces no frontend-controlled transparency flag. It only continues WHNF after a trusted transparent delta step exposes a new application spine. The rebuilt spine is reprocessed by the existing kernel reducers, so recursor/quotient/K/projection rules retain their own independently checked applicability conditions. Opaque and theorem heads remain stuck. A dependent replay fixture requires the completed conversion and therefore fails under frozen v66; malformed v66/v67 profile relabeling is rejected by the codec.


## KERNEL-resource-bounds0 / Core v68 threat model

v68 treats resource exhaustion as a first-class non-semantic outcome. It does not infer exhaustion from generic exception text: trusted components throw typed `KernelResourceError`, `ArtifactResourceError`, or `CertificateResourceError`, and standalone replay maps those to `resource_exhausted`. Malformed logical Core remains `rejected`; missing capability remains `unsupported`; unexpected runtime faults remain `implementation_error`.

The v68 profile applies a stack-safe 1024 nesting ceiling to artifact decode and direct-Core preflight, bounds term/level nodes and declaration-family sizes, retains typed defEq/WHNF/positivity fuel, limits mutual/nested helper specialization to 512 nodes, and rejects standalone verifier inputs/bindings above 64 MiB before full parse/check. A generated 513-helper nested graph proves the nonlinear graph ceiling terminates deterministically. `psverify --json` exposes resource exhaustion with exit code 3. These ceilings are implementation-security policy and are not presented as Lean 4.33.1 operational semantics. Historical v67 codec policy remains frozen.

## Unified integration trust rule

`UNIFIED-integration1` changes only untrusted frontend/bridge/exporter code. The frozen `kernel`, `kernel-codec`, `verifier`, and `certificates` source trees remain byte-identical to UI0. The bridge is an allowlist translator: unsupported Semantic IR is rejected before Core acceptance. `bif` lowers to checked `Bool.rec`; local `let` lowers to native Core `let`. Proposition-based `if` remains unsupported in UI1 rather than being approximated as Bool control flow.


## UNIFIED-integration2 trust rule

`UNIFIED-integration2` changes only untrusted frontend/bridge/test/documentation code. The frozen `kernel`, `kernel-codec`, `verifier`, and `certificates` sources remain byte-identical to UI1. Core v68 contains no built-in `Nat.mul`, so UI2 does **not** add a trusted multiplication primitive. Instead, the bridge recognizes only the canonical frontend `HMul Nat Nat Nat` dictionary path and conditionally inserts `ProofScript.Internal.UI2.Nat.mul`, a normal Core definition expressed with the already-trusted `Nat.rec` and `Nat.add`. The standalone kernel checks that definition and all users of it. A source program that selects a noncanonical multiplication dictionary, a non-Nat multiplication, `HSub`, or an otherwise unsupported arithmetic operation is rejected by the allowlist bridge. Exact Lean 4.33.1 oracle evidence proves the checked helper extensionally equal to the pinned `Nat.mul` logical model.


## UNIFIED-integration3 trust rule

`UNIFIED-integration3` changes only untrusted frontend/bridge/test/documentation code. The frozen `kernel`, `kernel-codec`, `verifier`, and `certificates` source trees remain byte-identical to UI2. Core v68 contains no built-in `Nat.sub`, so UI3 does **not** add a trusted subtraction primitive. The bridge recognizes only the canonical frontend `HSub Nat Nat Nat` dictionary path and conditionally inserts two ordinary Core definitions: `ProofScript.Internal.UI3.Nat.pred` and `ProofScript.Internal.UI3.Nat.sub`. Both are built from the already-trusted `Nat.rec`; the standalone kernel independently checks the definitions and all uses. The model is saturated Nat subtraction: `sub a 0 = a` and `sub a (succ b) = pred (sub a b)`. Exact Lean 4.33.1 oracle evidence proves the checked predecessor equal to `Nat.pred` and the checked subtraction extensionally equal to ordinary `a - b`. Noncanonical/non-Nat subtraction, proposition-based `if`, and order/decidability relations remain outside UI3 rather than being approximated.


## UNIFIED-integration4 trust rule

`UNIFIED-integration4` changes only untrusted frontend/bridge/test/documentation code. The frozen `kernel`, `kernel-codec`, `verifier`, and `certificates` source trees remain byte-identical to UI3. Core v68 has no standard `LE`/`LT` library declarations, so UI4 does **not** add order primitives to the kernel. The bridge accepts only the canonical frontend `LE Nat` / `LT Nat` dictionary identities and conditionally inserts the exact Lean 4.33.1 kernel-level propositions: protected indexed inductive `Nat.le` (one parameter, one index, constructors `Nat.le.refl` and `Nat.le.step`) and `Nat.lt n m := Nat.le (Nat.succ n) m`. Custom/noncanonical dictionaries are rejected instead of being collapsed to canonical ordering. Proposition-based `if` remains unsupported because checked `Decidable` evidence has not yet been migrated; UI4 therefore does not identify Prop with Bool. Exact Lean 4.33.1 accepts the emitted user theorems after the duplicate builtin `Nat.le`/`Nat.lt` declarations are omitted from oracle source. False ordering `rfl` goals are rejected by the standalone kernel.


## v71 K3-TB Trust Boundary

The v71 K3-TB Trust Boundary is a trusted-boundary engineering release lane. It does not mean full formal K3, does not prove full Lean 4 equivalence, and depends on the audited TypeScript/Node execution environment, including the vendored TypeScript compiler used for reproducible builds. The exact Lean 4.33.1 oracle is evidence and regression infrastructure, not a runtime verifier dependency.

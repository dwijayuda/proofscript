# ProofScript Project A — Kernel Coverage Matrix

**Audit baseline:** ProofScript Language Reference v0.1.6  
**Pinned semantic oracle:** Lean 4.33.1, release commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`  
**Audited practical/default kernel profile:** `KERNEL-level-instantiation-conformance1` / trusted-boundary K3-TB  
**Frontend producer retained:** `K3c-section-vars0`  
**Core artifact:** v68 kernel-only / v12 frontend  
**Certificate:** v2

This document describes the *trusted logical Core/kernel* only. It deliberately does not count parser, namespace/section/open handling, typeclass search, tactics, pattern compilation, recursion elaboration, module discovery, plugins, backends, or the CLI as kernel features.

Allowed authoritative statuses are: `implemented`, `partially_implemented`, `unsupported`, `blocked`, `needs_validation`.

## Target-boundary decisions

The following Lean-internal expression/declaration machinery is intentionally **not required as a serialized ProofScript Core constructor** when it can be soundly eliminated before the trust boundary:

- unresolved expression metavariables and universe metavariables: rejected/absent at the trust boundary;
- free-variable nodes: local contexts are represented canonically with de Bruijn bound variables;
- metadata (`MData`): erased before trusted replay because it is semantically inert to kernel typing;
- literal nodes: current ProofScript literals lower to ordinary checked constructors/definitions before Core;
- projection nodes: v15 adds trusted raw `Proj`; v18 completes the audited indexed one-constructor projection slice, including dependent fields, recursive indexed majors, iota, and Prop projection safety;
- `unsafe` / executable-only `partial` declarations: outside the proof-validating trusted Core; they must never be accepted as proof-producing logical declarations;
- mutual definition *environment kind*: frontend recursion compilation may emit ordinary checked definitions/recursor applications, but this does not remove the separate requirement for Lean-compatible mutual/nested **inductive** admission where v0.1 requires it.

These exclusions reduce representation surface; they are not permission to weaken observable ProofScript/Lean semantics.

## Coverage

| Feature family | Semantic requirement | Status | Current evidence | Known deviation / next action |
|---|---|---|---|---|
| Level syntax | `0`, `succ`, `max`, `imax`, universe parameters | implemented | `level.ts`; K1 universe tests; artifact codec | Unresolved level mvars intentionally excluded from trusted Core. |
| Level parameter validity | Every referenced level parameter is declared by the declaration | implemented | declaration validation + codec/replay tests | — |
| Level normalization/equivalence | Lean 4.33.1 observable `Level.normalize` / equivalence behavior | implemented | `kernel-universe-completeness-tests`; K1 tests; exact Lean differential case | Pinned no-mvar level normalization/equivalence implemented, including `imax 1 u = u`, max flattening/ordering, and offset subsumption. |
| `Sort` / `Prop` / `Type` | Predicative universe hierarchy plus impredicative `Prop` | implemented | kernel inference + K1/K1d tests | Broader compatibility still depends on remaining inductive/recursor universe constraints and mutual/nested support. |
| Bound variables/local context | Correct de Bruijn lookup, lifting, substitution | implemented | `core.ts`, kernel tests across lambdas/Pi/let/recursors | Add larger malformed-index adversarial corpus during full-kernel gate. |
| FVar/MVar/MData trust-boundary policy | No unresolved elaborator state in serialized trusted Core | implemented | Core union/strict decoder excludes these constructors | Formal exclusion retained. |
| Constants + universe instantiation | Exact universe arity and level substitution | implemented | `infer` + universe tests + differential cases | Depends on exact level equivalence fix. |
| Applications | Dependent function application/checking | implemented | kernel + frontend/conformance tests | Kernel is intentionally non-cumulative like Lean. |
| Lambdas | Dependent lambda inference/checking | implemented | kernel/K1 tests | — |
| Pi types | Sort computation using `imax` | implemented | kernel universe completeness + K1 tests | Uses the now-completed pinned level equivalence for the trusted no-mvar subset. |
| Let expressions | Type/value checking and zeta | implemented | K2a + differential `let-zeta` | — |
| Raw projection expressions | Lean `Expr.proj` checking/reduction | implemented | `kernel-structure-eta-tests` + `kernel-indexed-projections-tests`; exact Lean raw projection/type/isDefEq probes | v18 covers the admitted non-mutual one-constructor zero-index and indexed families, including dependent later fields, recursive indexed majors, projection iota, no indexed eta, and Prop projection safety. |
| Beta reduction | Lambda application | implemented | kernel + conformance/differential | — |
| Zeta reduction | Let reduction | implemented | K2a + exact Lean differential | — |
| Delta reduction | Definitions reducible; theorem/opaque unavailable to ordinary reduction | implemented | K2b transparency + reject-opaque differential | Reducibility hints are not yet performance-faithful, but logical transparency boundary is enforced. |
| Function eta | Lean-style function eta in definitional equality | implemented | `defEqInternal`; tests | Add dedicated exact Lean stress fixtures. |
| Structure/product eta | Nonrecursive one-constructor, zero-index eta observable in Lean conversion | implemented | `kernel-structure-eta-tests`; exact Lean raw `Expr.proj` + `isDefEq` probe | v15 applies eta only when the inductive has exactly one constructor, no indices, and no recursive field occurrence; recursive one-constructor types do not receive eta. |
| Proof irrelevance | Any proofs of the same proposition are definitionally equal | implemented | `defEqInternal`; proof-irrelevance/Eq differential | Needs broader adversarial stress, but semantic rule exists. |
| Definitional equality overall | Lean-compatible conversion behavior | implemented | beta/delta/zeta/function eta/structure eta/proof irrelevance/recursor/quotient/projection + `kernel-conversion-final-audit-tests` | v67 closes the admitted-space conversion audit, including transparent-head spine re-flattening for partial recursor/quotient redexes; opaque heads remain stuck. |
| WHNF/reduction overall | Lean-compatible reduction needed by inference/conversion | implemented | `kernelWhnf`; all reduction families through v67 plus exact-Lean transparent partial-rec/Quot cross-product | Logical WHNF behavior for the audited target is closed; bounded exhaustion/performance controls are tracked separately under `security.resource-bounds`. |
| Axioms | Type-check declaration and track assumptions | implemented | verifier assumption tests + differential axiom dependencies | — |
| Definitions / abbrev | Check type/value; regular/reducible definition behavior | implemented | K2b + replay/differential | Exact reducibility-hint heuristics are outside logical semantics; performance behavior not claimed. |
| Theorems | Proposition-valued declaration; checked proof; opaque for reduction | implemented | kernel + transparency/differential | — |
| Opaque declarations | Checked witness, opaque to delta reduction | implemented | K2b + negative differential | — |
| Examples | Check but do not install as reusable constants | implemented | current declaration checker/tests | Source/environment behavior only; no new kernel kind needed. |
| Unsafe/partial logical exclusion | Unsafe executable declarations must not extend proof-validating Core | implemented | Core declaration union excludes unsafe/partial kinds | Future executable semantics belong outside Project A trusted Core. |
| Quotient primitives | Exact `Quot`, `Quot.mk`, `Quot.lift`, `Quot.ind`; `Quot.sound` as explicit axiom/library declaration | implemented | `kernel-quotient-tests`; v13 strict replay; exact Lean 4.33.1 probe | Kernel `quot` marker atomically installs the four trusted primitives only after canonical Eq/Eq.refl validation; `Quot.sound` remains an explicit tracked axiom. |
| Quotient computation | `Quot.lift/ind` computation on `Quot.mk` | implemented | trusted WHNF/defEq tests + exact Lean 4.33.1 computation probe | Reduction is enabled only for kernel-installed quotient primitive entries. |
| Basic inductive declaration checking | Inductive type + constructors + generated entries | implemented | K1/K1c + v21-v49 admission/recursor audit families | v49 completes the audited current trusted target, including dependent index telescopes and final exact-oracle non-mutual admission checks. Future semantic expansions must be re-audited explicitly. |
| Empty inductives | Lean-compatible empty inductive admission/elimination | implemented | `kernel-empty-inductive-tests`; v14 strict replay; exact Lean 4.33.1 recursor probe | Non-mutual empty Type/Prop/parameterized/indexed families are admitted; empty Prop eliminates to arbitrary Sort. Historical v1-v13 profiles reject the new semantics. |
| Parameters / indices | Uniform parameters and dependent indexed families | implemented | K1c/indexed/dependent/mutual/nested tests + v47/v48 + `kernel-dependent-indexed-recursor-completion-tests` | v49 adds explicit exact-oracle coverage for later index domains depending on earlier indices and higher-order recursive IH indices; uniform-parameter defEq and BinderInfo remain preserved. |
| Recursive inductives | Strictly positive recursive occurrences | implemented | positivity/indexed/dependent/mutual/nested exact-Lean families through v66 | Audited target includes direct/indexed/higher-order mutual recursion and arbitrary-depth nested preprocessing with nonlinear helper graphs; future semantic expansions require re-audit. |
| Positivity | Lean-compatible positivity checker | implemented | `kernel-inductive-positivity-tests`; exact Lean 4.33.1 positivity probe | v16 supports supported non-mutual strict positivity through Pi codomains, uniform parameters, dependent inner binders, pointwise recursor IH/iota; negative domains, non-uniform parameters and recursive index occurrences reject. v17 recursive indexed recursors are implemented for the tested non-mutual dependent slice; mutual/nested preprocessing remains separate. |
| Inductive universe constraints | Lean-compatible universe admission | implemented | `kernel-universe-completeness-tests` + `kernel-inductive-universe-tests`; exact Lean 4.33.1 probes | v21 enforces every non-parameter field sort ≤ inductive result sort, waives the ceiling for `Prop`, and exempts uniform parameters. Mutual shared-result checks belong to the separately unsupported mutual/nested feature. |
| Constructor typing | Constructor result/parameter/index validity | partially_implemented | K1/K1c + v17 indexed-recursors tests | v17 validates uniform parameters, local-field-dependent recursive indices, multiple index tuples and recursive result indices; full universe/dependent edge coverage and mutual/nested constructors remain incomplete. |
| Recursor generation/types | Lean-compatible recursor type/universe ordering | implemented | simple/parameterized/indexed/empty/mutual/nested generators + v48 BinderInfo + v49 completion audit | v49 closes the current audited recursor-shape target, including dependent later-index telescopes and higher-order pointwise indexed IHs. |
| Recursor computation | Iota reduction for generated recursors | implemented | K1 recursor + indexed/mutual/nested + `kernel-dependent-indexed-recursor-completion-tests` | v49 explicitly observes dependent-index recursive iota plus higher-order indexed IH application; all prior simple/indexed/K/mutual/nested computation families remain green. |
| Prop elimination restrictions | Impredicative `Prop` with Lean empty/singleton large-elimination exceptions | implemented | `kernel-empty-inductive-tests` + `kernel-prop-elimination-tests`; exact Lean 4.33.1 probes | v19 derives permission from admitted declaration shape: empty Prop arbitrary Sort; multi-constructor Prop-only; singleton large elimination only when non-parameter fields are proof-valued or directly exposed by result indices. `RecursorVal.k` is implemented separately in v20 and regression-covered. |
| Mutual/nested inductives | Lean-compatible mutual/nested positivity/admission/recursors | partially implemented | v24–v46 mutual/nested milestone tests | v46 closes the audited Lean-positive mutual/nested preprocessing space; remaining local-dependent nested parameter shapes are exact Lean rejections. |
| Eq bootstrap | Eq represented as ordinary checked inductive/bootstrap declarations with canonical Lean shape available to kernel initialization | implemented | K1d foundation; equality differential; quotient admission; `kernel-empty-inductive-tests` | The v14 trusted kernel admits canonical Lean-shaped `Eq`/`Eq.refl` and generates Lean-shaped `Eq.rec`. Historical K3c source still spells the type parameter explicitly; that remaining mismatch is frontend/bootstrap-source work, not a kernel capability gap. |
| Declaration environment/order | No duplicate constants; dependencies available only after installation | implemented | environment + replay/adversarial tests | Add explicit declaration-order attack corpus to full-kernel security gate. |
| Dependency/axiom closure | Compute transitive declaration assumptions | implemented | verifier + exact differential + quotient replay | `Quot.sound` is explicitly tracked and requires allowlisting during strict replay. |
| Artifact codec | Strict versioned decode with resource bounds | implemented | historical compatibility + v14 empty-inductive + v15 projection/eta replay/tamper tests | v15 gates raw projection semantics; v1-v14 artifacts cannot acquire `Proj` semantics retroactively. |
| Independent replay | Strict verifier rechecks Core without frontend/plugins/Lean | implemented | verifier + packed external consumer | Core semantic completeness remains incomplete. |
| Result taxonomy | accepted/rejected/unsupported/resource_exhausted/implementation_error | implemented | runner/verifier/CLI tests | Continue classifying new resource failures explicitly. |
| Resource exhaustion controls | Bound serialized/direct-Core depth/nodes/declarations, conversion/WHNF/positivity, nonlinear helper graphs, verifier input, and expose deterministic taxonomy | implemented | `kernel-resource-bounds-tests`; codec/kernel/verifier typed-error paths; direct 513-helper graph attack; replay/CLI exit-code checks | v68 policy ceilings are implementation-security bounds, not claimed to equal Lean operational limits; ordinary semantic conformance remains separately pinned to Lean 4.33.1. |
| Exact Lean differential framework | Exact 4.33.1 authenticated oracle, structured semantic comparisons | implemented | 25/25 source-level corpus + 37/37 kernel-only milestone families through v49 | Every newly completed kernel slice must extend this evidence where practical. |

## Full-kernel completion decision

**FULL PROOFSCRIPT KERNEL TARGET: NOT IMPLEMENTED.**

Current blockers are semantic/hardening blockers, not packaging/frontend blockers. The largest are:

1. complete the remaining Lean-positive mutual+nested kernel preprocessing through deeper combined helper graphs in `KERNEL-mutual-nested-deeper0`;
2. final conversion/WHNF re-audit after that semantic expansion;
3. broader adversarial/resource-exhaustion validation of the final trusted checker.

Completed during this kernel-first campaign: exact universe normalization/equivalence, quotient primitive/computation semantics, non-mutual empty inductives, canonical trusted Eq/recursor shape, exact recursor universe/BinderInfo for supported families, v15 raw zero-index projections plus nonrecursive one-constructor eta, v16 strict positivity, v17 dependent recursive indexed recursors, v18 indexed raw projections/Prop projection safety, v19 Prop-elimination classification, v20 `RecursorVal.k` K-like reduction, and v21 constructor-field universe admission for the admitted non-mutual slice.

No frontend feature should be used to claim these gaps are solved: rich source syntax must elaborate to Core that this independent checker can validate.

## KERNEL-dependent-fields0 / Core v22 evidence

v17 established dependent indexed recursors; v18 completed indexed raw projections; v19 added Lean-faithful Prop-elimination permission; v20 added exact `RecursorVal.k`; v21 added Lean 4.33.1 constructor-field universe admission. v22 closes the remaining simple zero-parameter/index constructor-telescope restriction: later constructor fields may depend on earlier fields, and higher-order strictly-positive recursive fields may use earlier fields in their Pi domains. Generated minor premises preserve those dependencies and iota replay succeeds.

Exact Lean validation uses release commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`; the source-level differential corpus is **25/25**, and all **10/10** kernel-only milestone families through v22 pass. Historical v1-v21 profiles retain their frozen pre-v22 simple dependent-field admission behavior.

This does **not** close the broader `inductives.recursors`, `inductives.recursor-computation`, constructor/index completeness, or mutual/nested inductive items. The audited checklist at v22 remained **34 implemented / 6 partially implemented / 1 unsupported**. The next smallest bounded trusted-kernel milestone is `KERNEL-telescope-terms0`.


## KERNEL-telescope-terms0 / Core v23 evidence

v23 removes the internal recursor-generator restriction that previously rejected trusted `Lam` and `Let` terms encountered while reconstructing telescope metadata. The named-term bridge now preserves lambda binders, let binders, values/types/bodies, BinderInfo, nondep state, and references to surrounding constructor/index binders. Coverage includes simple fields, dependent outer-binder capture, strictly-positive recursive Pi domains, indexed constructor-result indices, empty indexed telescope domains, iota, strict replay, and explicit v22 historical rejection.

Exact Lean 4.33.1 validation remains **25/25** for the source corpus and is now **11/11** for kernel-only milestone families. The audited checklist remains **34 implemented / 6 partially implemented / 1 unsupported** because mutual/nested inductives and broader recursor/dependent edge completion remain open.


## KERNEL-mutual-inductives0 / Core v24 evidence

The previously unsupported combined mutual/nested checklist item is now **partially implemented**, not complete. v24 admits an atomic direct mutual `Type` slice with zero parameters/indices, enforces a common result universe, preserves dependent nonrecursive fields, admits only direct positive cross-family recursive fields, generates all member recursors with shared motives/minors, and performs cross-family iota reduction.

Exact Lean 4.33.1 evidence covers direct mutual admission, recursor shape/use, cross-family iota, dependent nonrecursive fields, same-universe enforcement, and rejection of a negative mutual occurrence. Strict Core v24 replay succeeds independently and historical v1-v23 decoders reject the new block kind.

Remaining mutual/nested gaps are shared parameters, indices, higher-order mutual recursion, mutual `Prop` elimination behavior, and nested-inductive preprocessing. The audit is now **34 implemented / 7 partially implemented / 0 unsupported** out of 41. Full kernel completion remains **NO**. Next milestone: `KERNEL-mutual-parameters0`.


## KERNEL-mutual-parameters0 / Core v25 evidence

v25 extends the partial mutual/nested checklist item through shared uniform parameter telescopes while keeping the block atomic. It accepts dependent shared parameters such as `(α : Type) (x : α)`, requires every member to expose a definitionally equal parameter telescope, requires constructor parameter binders to repeat it, and requires both direct recursive mutual fields and constructor results to preserve the corresponding parameters definitionally.

The generated mutual recursors prepend the shared parameters before all motives and minors, and cross-family iota invokes the target family recursor with the same parameter prefix. Exact Lean 4.33.1 evidence covers ordinary and dependent shared parameters, parameter-aware recursor/iota behavior, parameter-count/type mismatch rejection, and recursive/result parameter variation rejection. Strict Core v25 replay succeeds independently; relabeling the same declarations as v24 is rejected by the historical v24 kernel.

The audit remains **34 implemented / 7 partially implemented / 0 unsupported** out of 41 because this advances the already-partial mutual/nested item rather than closing it. Remaining gaps are mutual indices, higher-order mutual recursion, mutual `Prop`, nested-inductive preprocessing, remaining general recursor/dependent edge cases, and resource-exhaustion hardening. Full kernel completion remains **NO**. Next milestone: `KERNEL-mutual-indices0`.

## KERNEL-mutual-indices0 / Core v26 evidence

v26 extends the partial mutual/nested checklist item through per-member index telescopes while preserving the atomic v25 shared-parameter block. Mutual members may have different index counts after the common parameter prefix. Constructor results and direct recursive mutual fields are checked for exact target-family arity, fixed shared parameters, compatible universe instantiation, and absence of nested mutual-family occurrences inside index terms.

Generated mutual recursors use a distinct motive telescope for each member, carry each member's own indices, and reconstruct the recursive target family's exact index tuple during cross-family iota. The exact Lean 4.33.1 corpus covers ordinary indexed mutual families, shared-parameter indexed mutual families, mixed index counts, recursor/iota observations, and rejection of nested family occurrences in recursive or result indices. Strict Core v26 replay succeeds independently; relabeling the same declarations as v25 is rejected by the historical v25 kernel.

The audit remains **34 implemented / 7 partially implemented / 0 unsupported** out of 41 because v26 advances the already-partial mutual/nested and recursor items rather than closing them. Remaining major gaps include higher-order mutual recursion, mutual `Prop`, nested-inductive preprocessing, remaining general dependent recursor edges, and resource-exhaustion hardening. Full kernel completion remains **NO**. Next milestone: `KERNEL-mutual-higher-order0`.


## KERNEL-mutual-higher-order0 / Core v27 evidence

v27 extends the admitted atomic direct mutual `Type` block through strictly-positive higher-order recursive fields. A mutual occurrence may be reached only through Pi codomains; any occurrence in a Pi domain is rejected. Generated recursors provide pointwise cross-family induction hypotheses, and reduction invokes the recursively targeted family recursor with that family’s exact shared parameters and reconstructed indices, including indexed targets under function binders. Exact Lean 4.33.1 observations agree, replay is profile-gated, and historical v26 rejects the same higher-order semantics.

The audit remains **34 implemented / 7 partially implemented / 0 unsupported** out of 41 because v27 advances the already-partial mutual/nested and recursor items rather than closing them. Remaining major gaps include mutual `Prop`, nested-inductive preprocessing, remaining general dependent recursor edges, and resource-exhaustion hardening. Full kernel completion remains **NO**. Next candidate: `KERNEL-mutual-prop0`, only after exact-oracle research.

## KERNEL-mutual-prop0 / Core v28 frozen evidence

v28 extends the admitted atomic direct mutual block to mutual predicates. The trusted checker derives one shared recursor motive-universe policy from the checked result universe: if that universe is provably nonzero, mutual Type families keep a fresh motive universe; otherwise the mutual block is restricted to Prop-valued motives. This includes empty mutual predicates and trusted raw-Core universe parameters that may instantiate to Prop. Mutual `RecursorVal.k` is disabled. Shared parameters, per-member indices, data-valued Prop fields, and strictly-positive higher-order pointwise cross-family IH/iota are regression-covered under the Prop-only policy.

Historical v27 semantics are not rewritten: explicit mutual `Prop` remains rejected in v27, and its prior raw-Core `Sort u` recursor behavior remains frozen. v28 is the profile that closes that trust-boundary over-permissiveness. Exact Lean 4.33.1 source observations agree for representable mutual `Prop`/`Type` cases; Lean source elaboration rejects universe-polymorphic `Sort u` mutual declarations, while the lower-level v28 trusted Core conservatively applies the kernel-style Prop motive policy.

The audit remains **34 implemented / 7 partially implemented / 0 unsupported** out of 41 because v28 advances the already-partial mutual/nested and recursor items rather than closing nested preprocessing. Full kernel completion remains **NO**. Next bounded candidate: `KERNEL-nested-inductives0`.


## KERNEL-nested-inductives0 / Core v29 evidence

v29 adds the first bounded nested-inductive preprocessing slice. The trusted kernel does not bless arbitrary positive containers: it synthesizes an internal auxiliary family for a specialized previously checked monomorphic one-parameter zero-index container and reuses atomic mutual positivity/universe admission. Exact Lean 4.33.1 observations and standalone tests cover Box-like nesting, recursive List-like nesting, linked outer/helper recursors, definitional helper iota, negative container-parameter rejection, serialized replay, and historical v28 isolation.

The audit remains **34 implemented / 7 partially implemented / 0 unsupported** out of 41 because parameterized/indexed/polymorphic/multiple-container/deeper/nested-`Prop` preprocessing remains open. Full kernel completion remains **NO**. Next bounded milestone: `KERNEL-nested-index-expressions0`.


## KERNEL-nested-parameters0 / Core v30 evidence

v30 extends the bounded nested-inductive preprocessing slice through shared and genuinely dependent outer parameter telescopes. The private auxiliary family shares the exact parameter telescope with the outer family, and trusted mutual admission enforces fixed recursive parameters. Lean-shaped linked recursors place those parameters before the two motives/minors, and parameter-aware helper iota is tested end-to-end. Exact Lean 4.33.1 rejects nested recursive parameter variation in the same cases. Historical v29 replay remains unchanged.

The audit remains **34 implemented / 7 partially implemented / 0 unsupported** out of 41 because outer indices, polymorphic/multiple/deeper nesting, nested `Prop`, and remaining general dependent recursor edges remain open. Full kernel completion remains **NO**. Next bounded milestone: `KERNEL-nested-indices0`.


## KERNEL-nested-indices0 / Core v31 evidence

v31 extends the bounded nested-inductive transformation through two exact Lean 4.33.1 indexed-outer modes. Captured constructor-local indices are promoted into the synthesized mutual block parameter prefix; closed fixed specializations keep the outer index telescope while specializing the helper family. Dependent captured index telescopes, helper-to-indexed-outer definitional iota, changed-local-index rejection, serialization/replay, and historical v30 isolation are covered. The audit remains **34 implemented / 7 partially implemented / 0 unsupported** because parameter-dependent closed index expressions, polymorphic/multiple/deeper/nested-`Prop` preprocessing remain open.


## KERNEL-nested-index-expressions0 / Core v32 evidence

v32 extends the bounded indexed nested transformation so a closed helper specialization may use a fixed outer-index expression depending only on uniform parameters. The trusted kernel projects the expression into the parameter context, rejects all constructor-local dependencies, then re-instantiates the projected term from actual recursor parameter arguments. Coverage includes direct parameter indices, successor expressions, multiple uniform parameters, linked helper iota back into the indexed outer recursor, captured-index regression, replay, and historical v31 rejection.

Exact Lean 4.33.1 source differential remains **25/25**, and kernel-only milestone families through v32 are **20/20**. The audit remains **34 implemented / 7 partially implemented / 0 unsupported** because general mixed-specialization, polymorphic, indexed-container, multiple/deeper-container, nested-`Prop`, and remaining general recursor/resource-hardening work remains open. Full kernel completion is **NO**. Next bounded research milestone: `KERNEL-nested-mixed-specializations0`.


## KERNEL-nested-multiple-specializations0 / Core v33 evidence

v33 extends the bounded nested transformation to multiple compatible auxiliary nested families. The trusted kernel synthesizes one auxiliary mutual family per unique nested specialization, groups definitionally equal fixed specializations, preserves first-occurrence helper ordering, and restores linked public helper recursors with definitional iota through later helpers. Exact Lean 4.33.1 accepts multiple fixed specializations, multiple distinct containers, and multiple captured-current containers, while captured+closed mixing is rejected. Historical v32 remains isolated.

Exact Lean 4.33.1 source differential remains **25/25**, and kernel-only milestone families through v33 are **21/21**. The audit remains **34 implemented / 7 partially implemented / 0 unsupported** because polymorphic/deeper/indexed-container/nested-`Prop` preprocessing and remaining general recursor/resource-hardening work remain open. Full kernel completion is **NO**. Next bounded research milestone: `KERNEL-nested-polymorphic0`.


## KERNEL-nested-polymorphic0 / Core v34 evidence

v34 extends the trusted bounded nested transformation to explicitly instantiated universe-polymorphic outer/container families. The kernel checks the instantiated container parameter/result universes against the outer family universe before auxiliary-family synthesis, preserves explicit universe arguments on restored public constants, and restores helper recursors with motive universe first followed by outer declaration universes. Exact Lean 4.33.1 covers same-universe polymorphic `Box`, parameterized outer families, an explicitly instantiated multi-universe container, linked helper iota, mismatch rejection, replay, and historical v33 isolation.

Exact source differential remains **25/25** and kernel-only milestone families through v34 are **22/22**. The audit remains **34 implemented / 7 partially implemented / 0 unsupported** because indexed containers, deeper nesting, nested `Prop`, general nested preprocessing, and final recursor/resource-hardening work remain open. Full kernel completion is **NO**. Next bounded research milestone: `KERNEL-nested-indexed-containers0`.


## KERNEL-nested-indexed-containers0 / Core v35 evidence

v35 extends the bounded nested transformation to already-checked one-parameter indexed containers. The synthesized helper family retains the container index telescope and every container constructor, and linked reduction passes the exact recursive index tuple to the helper recursor. Exact Lean 4.33.1 covers indexed helper motives, recursive indexed-container iota, constructor-local and uniform-parameter container indices, replay, and historical v34 isolation.

Exact Lean 4.33.1 source differential remains **25/25**, and kernel-only milestone families through v35 are **23/23**. The audit remains **34 implemented / 7 partially implemented / 0 unsupported** because dependent container index domains, deeper nesting, nested `Prop`, and remaining general recursor/resource-hardening work remain open. Full kernel completion is **NO**. Next bounded positive milestone: `KERNEL-nested-deeper0`; dependent nested-container index domains are exact Lean rejections, not an implementation milestone.

## KERNEL-recursor-minor-order0 / Core v36 frozen evidence

v36 corrects a pre-existing recursor-shape mismatch with exact Lean 4.33.1. For recursive constructors, minor premises now quantify **all constructor fields first, then all induction hypotheses in recursive-field order** across simple, parameterized, indexed, mutual, and nested recursor generators. The definitional-iota reducer applies minor arguments in that same fields-first order. Historical v1-v35 remain profile-isolated and preserve the earlier interleaved field/IH order.

Exact Lean 4.33.1 source differential is **25/25** and kernel-only milestone evidence is **24/24**. Clean release evidence is **26/26** trusted kernel/architecture plus **31/31** historical/frontend/tooling; bootstrap/certification/replay/tamper/conformance pass; 31 packages and hashes reproduce; and a fresh Lean-free consumer accepts v36 while rejecting a v36 fields-first recursor definition under historical v35 replay. The audit remains **34 implemented / 7 partially implemented / 0 unsupported** because broader recursor/nested completeness and resource hardening remain open. Next positive milestone: `KERNEL-nested-deeper0`.


## KERNEL-nested-deeper0 / Core v37 evidence

v37 extends the trusted nested-inductive translation from one container layer to an exact two-layer closed chain for parameterless/indexless monomorphic `Type` outer families. The kernel derives a private three-member mutual block (outer + two helpers), rechecks it through the trusted mutual checker, restores public container/constructor/recursor identities, and preserves the v36 fields-first minor order. Exact Lean 4.33.1 covers `Box (Box Tree)`, `List (List Tree)`, `Box (Vec Tree i)`, `Vec (Box Tree) i`, recursive three-way linked iota, indexed helper telescopes, replay, and historical v36 rejection.

Exact source differential remains **25/25** and kernel-only milestone families through v37 are **25/25**. Dirty-tree trusted kernel/architecture is **27/27** and historical/frontend/tooling is **31/31**. The audit remains **34 implemented / 7 partially implemented / 0 unsupported** because arbitrary-depth/general nested preprocessing and final recursor/resource closure remain open. Full kernel completion is **NO**. Next bounded milestone: `KERNEL-nested-deeper-generalization0`.


## KERNEL-nested-deeper-parameters0 / Core v39 evidence

v39 extends v38's arbitrary finite linear nested-helper chain through **shared and dependent uniform outer parameters**. Deep fields are projected from constructor-local context into the outer-parameter context before recognition, every synthesized helper carries the same trusted parameter telescope, public recursor restoration reconstructs container specializations from actual shared arguments, and the private mutual checker revalidates fixed-parameter discipline. Parameter-derived container indices are admitted when the container index domains remain independent of the recursive outer family.

Exact Lean 4.33.1 evidence covers `Tree (α)` with `Box (Box (Tree α))`, dependent `(α : Type) (x : α)` nesting, parameter-derived indexed containers, actual linked parameterized iota, and rejection of fixed/transformed recursive parameters. Historical v38 remains profile-isolated. Dirty-tree trusted kernel/architecture is **29/29**, historical/frontend/tooling is **31/31**, exact source differential is **25/25**, and kernel-only milestone families are **27/27**. The audit remains **34 implemented / 7 partially implemented / 0 unsupported**; full kernel completion remains **NO**. Next bounded milestone: `KERNEL-nested-deeper-polymorphic0`.


### KERNEL-nested-deeper-polymorphic0 / Core v41

Exact Lean 4.33.1 validates arbitrary-depth explicit-universe polymorphic nested preprocessing across parameterized/indexed outer families, including fixed and captured/promoted outer-index modes, linked iota, and mismatch rejection. Kernel-only milestone families are **29/29**. Audit remains **34/7/0** because multiple deep fields/specializations, nested `Prop`, and final general recursor/resource-hardening remain open. Next: `KERNEL-nested-deeper-multiple-fields0`.


## KERNEL-nested-deeper-multiple-fields0 / Core v42

Exact Lean 4.33.1 validates multiple compatible nested fields with identical-helper reuse, shared-prefix deduplication, independent Box/List chains, distinct fixed indexed specializations, captured/promoted duplicate fields, polymorphic parameterized fields, and actual linked iota. Mixed captured+fixed outer-index regimes are rejected by both Lean and ProofScript. Kernel-only milestone families are **30/30** and dirty-tree trusted kernel/architecture is **32/32**; historical/frontend/tooling remains **31/31**. The audit remains **34/7/0** because nested `Prop`, nonlinear/multi-parameter nested preprocessing, remaining general recursor/conversion edges, and resource hardening remain open. Next: `KERNEL-nested-deeper-prop0`.


### Current v43 nested Prop evidence

Exact Lean 4.33.1 validates graph-based arbitrary-depth nested `Prop` preprocessing with single and multiple deep fields, shared/dependent outer parameters, fixed indexed outer families, helper reuse, Prop-only motives, linked proof-level iota, and rejection of large elimination. Kernel-only milestone families are **31/31** and clean trusted kernel/architecture is **33/33**; historical/frontend/tooling remains **31/31**. The audit remains **34/7/0** because multi-parameter/nonlinear nested container structure, remaining general recursor/conversion edges, and resource hardening remain open. Next: `KERNEL-nested-deeper-multi-parameter0`.


## KERNEL-nested-deeper-dependent-container-parameters0 / Core v46 evidence

v46 completes the audited nested-preprocessing campaign by supporting dependent nested-container parameter telescopes such as `(A : Type) (B : A → Type)`, including recursion in later dependent parameter families, multiple recursive dependent positions, deeper dependent chains, and nested helper specializations under binder terms when they project to the shared outer-parameter context. Exact Lean 4.33.1 rejects nested specializations that depend on parameter-local variables, and v46 rejects the same class. Strict positivity remains enforced by the synthesized mutual block.

Exact source differential remains **25/25** and kernel milestone families are **34/34**. The audit is now **35 implemented / 6 partially implemented / 0 unsupported**: `inductives.mutual-nested` is promoted to implemented. Remaining work is concentrated in general dependent/indexed recursor completeness, overall recursor/conversion closure, and resource hardening. Next research milestone: `KERNEL-dependent-indexed-recursor-completion0`.


## KERNEL-uniform-parameter-defeq0 / Core v47 evidence

v47 matches exact Lean 4.33.1 uniform-parameter admission for non-mutual inductives: recursive occurrences and constructor result parameters may be definitionally equal to the declared uniform parameter rather than syntactically identical. Exact probes cover `id α`, `let β := α; β`, reducible aliases, indexed recursion, higher-order indexed recursion with pointwise IH/iota, and rejection of genuinely different parameters. Historical v46 preserves the older syntactic boundary.

The authoritative audit remains **35 implemented / 6 partially implemented / 0 unsupported** pending the final general recursor/admission audit, conversion closure, and resource hardening.


## KERNEL-dependent-indexed-recursor-completion0 / Core v49 evidence

v49 is an assurance/conformance profile over v48 rather than a new kernel-theory rule. Exact Lean 4.33.1 and standalone ProofScript tests cover a two-index family whose second index domain depends on the first, higher-order recursive fields whose pointwise IH carries an inner dependent index, and linked iota reconstructing the exact recursive index tuple. The profile also records a critical negative Prop-elimination observation: with `inductive.autoPromoteIndices false`, direct constructor-field occurrence as a result index yields a universe-polymorphic recursor, but beta/zeta-wrapped occurrences remain Prop-only. Therefore v49 deliberately preserves v19’s syntactic direct-exposure rule rather than broadening it by definitional equality.

The four rows waiting specifically on the final non-mutual recursor audit are promoted: `inductives.basic`, `inductives.parameters-indices`, `inductives.recursors`, and `inductives.recursor-computation`. Audit: **39 implemented / 2 partially implemented / 0 unsupported** out of 41. `conversion.overall` and `security.resource-bounds` remain partial. Full kernel completion is **NO**. Next semantic milestone: `KERNEL-mutual-nested-generalization0`.

## KERNEL-mutual-nested-generalization0 / Core v50 evidence

v50 adds a deterministic synthetic mutual graph for fields such as `Box B` or recursive `List B` inside an existing mutual block. Distinct specializations create ordered linked helper motives/recursors; identical specializations deduplicate. The enlarged private block is revalidated by the trusted mutual checker, so strict positivity, constructor admission, recursor typing, and iota remain kernel-derived rather than artifact-controlled. Exact Lean 4.33.1 validates the three-/multi-motive shape, public helper recursors, linked iota, recursive-container traversal, and negative-variance rejection. Historical v49 rejects the same mutual+nested source shape.

The v50 research also demonstrates that shared-parameter mutual+nested blocks are Lean-positive. Therefore the earlier v46 promotion of `inductives.mutual-nested` was too broad for the expanded audit and is reopened to `partially_implemented`. Frozen audit: **38 implemented / 3 partially implemented / 0 unsupported** out of 41. The other partial rows are `conversion.overall` and `security.resource-bounds`. Next bounded milestone after v50 release: `KERNEL-mutual-nested-parameters0`.


## KERNEL-mutual-nested-parameters0 / Core v51 evidence

v51 extends v50 through shared/dependent uniform parameters. Exact Lean 4.33.1 confirms recursor/helper parameter ordering for ordinary and dependent shared telescopes, multiple deterministic helper specializations, and rejection of non-uniform target parameters. Historical v50 rejects the same parameterized mutual+nested declarations. Audit remains **38 implemented / 3 partially implemented / 0 unsupported**. Next bounded milestone: `KERNEL-mutual-nested-polymorphic0`.


## KERNEL-mutual-nested-indices0 / Core v52 evidence

v52 preserves per-member mutual index telescopes and composes them with the bounded mutual+nested helper graph. Nested target indices must project to the shared parameter context, so closed and parameter-derived fixed tuples are accepted while constructor/index-local capture is rejected. Exact Lean 4.33.1 confirms indexed motive counts/helper shape and the local-variable rejection boundary. Multiple definitionally distinct fixed target tuples produce distinct deterministic helpers. Audit remains **38 implemented / 3 partially implemented / 0 unsupported**; `inductives.mutual-nested`, `conversion.overall`, and `security.resource-bounds` remain partial.


## KERNEL-mutual-nested-polymorphic0 / Core v53 evidence

v53 carries explicit universe polymorphism through the bounded mutual+nested helper graph. The kernel preserves explicit universe levels on nested container constants, instantiates the checked container declaration at those levels, creates helper members under the mutual block's universe parameters, and rechecks the whole synthetic block through the trusted mutual checker. Exact Lean 4.33.1 confirms same-universe and explicitly multi-universe container shapes, indexed composition, helper level order, actual linked iota, universe-mismatch rejection, replay, and historical v52 isolation. Audit remains **38 implemented / 3 partially implemented / 0 unsupported**; `inductives.mutual-nested`, `conversion.overall`, and `security.resource-bounds` remain partial.


## KERNEL-mutual-nested-prop0 / Core v54 evidence

v54 composes the v53 universe/parameter/index-aware mutual+nested helper graph with Prop-valued mutual families. The synthetic original/helper block is submitted to the trusted mutual checker, which derives the Prop-only motive universe and keeps mutual K-like reduction disabled. Exact Lean 4.33.1 confirms monomorphic and shared-polymorphic parameter cases, fixed indexed target specializations, helper motive count/order, linked proof iota, and rejection of large elimination. Historical v53 rejects the same Prop graph.

Exact Lean also accepts a larger Prop-specific case in which a constructor-local target index such as `WrapP (B α n)` is promoted into an additional helper/recursor parameter. v54 deliberately rejects this case because the Type-valued v52 locality rule cannot be reused soundly for Prop; it is the next explicit milestone. Audit remains **38 implemented / 3 partially implemented / 0 unsupported**.


## KERNEL-mutual-nested-indexed-containers0 / Core v55 evidence

v55 adds one-level mutual/nested composition with checked indexed nested containers. The helper preserves the container's index telescope for Type and Prop cases, and exact Lean 4.33.1 validates the indexed motive shape and linked helper iota. Target-family indices remain fixed/shared-parameter-derived as in v52; container indices are ordinary helper indices and may vary at constructor use sites. Historical v54 remains isolated. Exact no-auto-promotion probing also establishes that constructor-local Prop target promotion is frontend elaboration rather than a kernel admission rule.


## KERNEL-mutual-nested-deeper0 / Core v56 evidence

v56 admits one closed linear mutual+nested recursive path of arbitrary finite depth >= 2 in monomorphic zero-parameter/index `Type` or `Prop` mutual blocks. Exact Lean 4.33.1 confirms original motives first followed by helper motives outermost-to-innermost, linked iota through all helpers, depth-3 dynamic helper generation, and Prop-only motive families. Negative variance is rejected by rechecking the complete synthetic block. Historical v55 cannot acquire v56 semantics by relabeling.

Current frozen audit after v66: **39 implemented / 2 partially implemented / 0 unsupported** of 41. `inductives.mutual-nested` is implemented for the audited target. Remaining partial rows are overall conversion/WHNF and resource bounds. Next trusted task: `KERNEL-conversion-final-audit0`.


## KERNEL-mutual-nested-deeper-parameters0 / Core v57 evidence

v57 admits the same single arbitrary-depth linear deep mutual/nested path as v56 while preserving an ordinary or dependent shared uniform parameter telescope across every original/helper family. Exact Lean 4.33.1 validates ordinary and dependent shared parameters, depth-2/depth-3 motive/helper order, and fixed-parameter mismatch rejection; the ProofScript gate validates actual linked parameter-aware iota, universe-valid constructor-local capture rejection, serialized replay, and v56 isolation. Current audit remains **38 implemented / 3 partially implemented / 0 unsupported** of 41.


## KERNEL-mutual-nested-deeper-indices0 / Core v58 evidence

v58 extends the v57 arbitrary-depth shared/dependent-parameter mutual/nested chain across per-member outer index telescopes. Original families retain their index counts; synthetic helpers represent fixed/shared-parameter-derived target specializations and carry zero outer-family indices in this bounded slice. Direct recursive mutual fields may vary indices normally. Exact Lean 4.33.1 validates fixed and parameter-derived deep targets, depth-2/depth-3 helper order, and constructor-local target-index rejection with auto-promotion disabled; ProofScript validates actual indexed linked iota, strict replay and v57 isolation. Current audit remains **38 implemented / 3 partially implemented / 0 unsupported** of 41.


## KERNEL-mutual-nested-deeper-polymorphic0 / Core v59 evidence

v59 composes explicit universe instantiations with the v58 arbitrary-depth indexed mutual/nested graph. Exact Lean 4.33.1 validates universe-polymorphic indexed A/B families, depth-2 helper order, helper universe telescope `{motiveUniverse, u}`, and repeated `LiftBox.{u,0}` layers; ProofScript additionally validates actual linked iota, target-index locality, strict replay, and v58 isolation. Current audit remains **38 implemented / 3 partially implemented / 0 unsupported** of 41.


## KERNEL-mutual-nested-deeper-prop0 / Core v60 evidence

v60 composes universe-polymorphic indexed arbitrary-depth mutual/nested helpers with Prop-valued original/helper families. Exact Lean 4.33.1 validates Prop-only motive families, no fresh motive universe, fixed deep target specialization, and large-elimination rejection; ProofScript additionally validates actual linked proof iota, local-target rejection, replay, and v59 isolation. Current audit remains **38 implemented / 3 partially implemented / 0 unsupported** of 41.


## KERNEL-mutual-nested-deeper-indexed-containers0 / Core v61 evidence

v61 extends the v60 deep polymorphic indexed Prop mutual/nested chain through indexed Prop containers. Each synthetic helper retains the current container index telescope; deeper container parameter specializations and final recursive-target indices remain closed/shared-parameter-derived. Exact Lean 4.33.1 confirms outer-live-index acceptance and deeper-local-specialization rejection, while ProofScript checks actual linked indexed proof iota, target-dependent index-domain rejection, strict replay and v60 isolation. Current audit remains **38 implemented / 3 partially implemented / 0 unsupported** of 41.


## KERNEL-mutual-nested-deeper-multi-parameter-containers0 / Core v62 frozen evidence

v62 extends v61 to indexed Prop containers with arbitrary parameter arity along the arbitrary-depth mutual/nested chain. Exactly one parameter slot per layer carries the recursive path; it may appear at any parameter position. All fixed/nonrecursive parameter specializations must project to the shared mutual-parameter context, while each helper retains the current container index telescope. Exact Lean 4.33.1 validates recursive parameter slots 0 and 1, live helper indices, linked proof iota, rejection of multiple recursive parameter slots, and constructor-local fixed-parameter rejection. Frozen release evidence is clean kernel/architecture **52/52**, clean historical/frontend/tooling **31/31**, exact source differential **25/25**, kernel milestone families **50/50**, CLI/replay/tamper and conformance **PASS**, 31/31 package hashes verified, and a fresh Lean-free external consumer independently checks/replays Core v62 with `projectPluginsLoaded:false`. Current audit remains **38 implemented / 3 partially implemented / 0 unsupported** of 41. Frozen v61 is the immediate rollback checkpoint.


## KERNEL-mutual-nested-deeper-dependent-container-parameters0 / Core v63 frozen evidence

v63 composes dependent container parameter telescopes into the arbitrary-depth indexed `Prop` mutual/nested graph. Later parameter domains are specialized and checked sequentially in a staged environment containing the already-checked context plus the mutual family signatures. The current helper's index telescope remains live, while dependent parameter specializations must project to the shared mutual-parameter context. Exact Lean 4.33.1 validates a dependent `(P : Prop) (Q : P → Prop)` indexed container, four-motive helper order, linked proof iota, and constructor-local dependent-parameter rejection with auto-promotion disabled. Frozen release evidence is clean kernel/architecture **53/53**, clean historical/frontend/tooling **31/31**, exact source differential **25/25**, kernel milestone families **51/51**, CLI/replay/tamper and conformance **PASS**, 31/31 package hashes verified, and a fresh Lean-free external consumer independently checks/replays Core v63 with `projectPluginsLoaded:false`. Current audit remains **38 implemented / 3 partially implemented / 0 unsupported** of 41. Frozen v62 is the immediate rollback checkpoint. Next bounded kernel milestone: `KERNEL-mutual-nested-deeper-multiple-fields0`.


## KERNEL-mutual-nested-deeper-multiple-fields0 / Core v64 frozen evidence

v64 generalizes v63 from one deep recursive field to multiple compatible deep recursive fields in the arbitrary-depth indexed `Prop` mutual/nested graph. Unique helper specializations are discovered breadth-first and deduplicated by trusted contextual definitional equality over the complete specialized parameter vector. Exact Lean 4.33.1 validates two identical fields producing four motives with complete outer+inner helper reuse, two distinct outer specializations sharing one inner helper producing five motives, deterministic first-occurrence helper ordering, linked proof iota, and constructor-local dependent-parameter rejection with auto-promotion disabled. Frozen release evidence is clean kernel/architecture **54/54**, clean historical/frontend/tooling **31/31**, exact source differential **25/25**, kernel milestone families **52/52**, CLI/replay/tamper and conformance **PASS**, 31/31 package hashes verified, and a fresh Lean-free external consumer independently checks/replays Core v64 with `projectPluginsLoaded:false`. Current audit remains **38 implemented / 3 partially implemented / 0 unsupported** of 41. Frozen v63 is the immediate rollback checkpoint. Next bounded semantic target: `KERNEL-mutual-nested-deeper-multiple-recursive-parameter-slots0`.


## KERNEL-mutual-nested-deeper-multiple-recursive-parameter-slots0 / Core v65 frozen evidence

v65 extends v64 so one deep nested helper container may carry recursive paths in multiple top-level parameter slots. Helper nodes are still keyed by the complete specialized parameter vector and discovered breadth-first; repeated child specializations reuse one helper. `rewriteNestedV45` rewrites every matching recursive parameter slot, so the ordinary trusted direct-mutual checker derives a separate induction hypothesis and linked recursive recursor for each slot. Exact Lean 4.33.1 validates the two-slot outer and inner `PairP` graph with four motives and shared helper reuse, while constructor-local nested target indices remain rejected with `inductive.autoPromoteIndices false`. Frozen release evidence is clean kernel/architecture **55/55**, clean historical/frontend/tooling **31/31**, exact source differential **25/25**, kernel milestone families **53/53**, CLI/replay/tamper and conformance **PASS**, 31/31 package hashes verified, and a fresh Lean-free external consumer independently checks/replays Core v65 with `projectPluginsLoaded:false`. Current audit remains **38 implemented / 3 partially implemented / 0 unsupported** of 41 pending `KERNEL-mutual-nested-final-generalization-audit0`. Frozen v64 is the immediate rollback checkpoint.


## KERNEL-mutual-nested-final-generalization-audit0 / Core v66 evidence

v66 closes the broad `inductives.mutual-nested` audit row for the current target. Exact Lean 4.33.1 validates Prop and Type nonlinear helper graphs, monomorphic `Type 0`, universe-polymorphic and indexed/non-indexed blocks, higher-order positive nesting, function-valued recursive container parameters, transitive closure through admitted mutual container families, linked Type iota, and the negative boundaries for local capture, mixed result universes, potentially-Prop bare `Sort u`, and positivity. Strict Core 66 replay and historical v65 isolation pass.

Audit: **39 implemented / 2 partially implemented / 0 unsupported** of 41. Remaining rows: `conversion.overall` and `security.resource-bounds`. Full kernel completion: **NO**.


## KERNEL-conversion-final-audit0 / Core v67 evidence

v67 closes `conversion.overall` after the full v66 admitted-space audit. Exact Lean 4.33.1 confirms transparent definitions containing partial recursors and `Quot.lift` must continue reducing after caller arguments complete the redex; a dependent witness checks that this affects kernel conversion, while an opaque-head negative confirms the transparency boundary is unchanged. Existing beta/zeta/delta/eta/proof-irrelevance/projection/quotient/K/ordinary-indexed-mutual-nested recursor families remain green.

Audit: **40 implemented / 1 partially implemented / 0 unsupported** of 41. Only `security.resource-bounds` remains partial. Full kernel completion: **NO**.


## KERNEL-resource-bounds0 / Core v68 evidence

v68 closes the last audited kernel row, `security.resource-bounds`. The profile introduces typed resource-limit errors across the kernel, artifact codec, certificates, and verifier; a stack-safe 1024 recursive decode/direct-Core depth ceiling; one-million term/level node ceilings; 10,000 declaration and constructor-family bounds; typed 512-depth definitional-equality exhaustion; 20,000-step WHNF fuel; existing positivity/mutual-positivity bounds; a 512-specialization mutual/nested helper-graph ceiling; and a 64 MiB standalone-verifier input/binding ceiling. The adversarial suite verifies direct-AST bypass resistance, deep terms/levels, declaration floods, defEq/WHNF exhaustion, a generated 513-node nested helper chain, oversized files, malformed-vs-resource taxonomy, `psverify` exit code 3, plugin-free replay, and historical v67 isolation.

The resource ceilings themselves are ProofScript implementation-security policy, not a claim that Lean 4.33.1 uses identical operational limits. Logical conformance below those ceilings remains backed by the exact Lean corpus. Audit: **41 implemented / 0 partially implemented / 0 unsupported** of 41. No audited trusted-kernel checklist row remains open.

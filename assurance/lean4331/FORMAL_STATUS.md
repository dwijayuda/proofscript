# ProofScript v71 ↔ Lean 4.33.1 Formal Status

The target is semantic equivalence on the declared normalized safe shared Core,
not source-code identity and not equality of implementation resource limits.

## Machine-checked now

| Layer | Result |
|---|---|
| Level constructor embedding | proved |
| Level denotation preservation | proved |
| Structural absence of universe metavariables | proved |
| Level embedding injectivity | proved |
| `isNeverZero` / `isAlwaysZero` correspondence | proved |
| `getOffset` / `getLevelOffset` correspondence | proved |
| `addOffset` / cheap-normalization classifier / constructor rank | proved |
| Historical/raw universe-parameter substitution translation | proved |
| v71 cheap `max`/`imax` universe-parameter substitution translation | **proved** |
| v71 shared-expression universe instantiation translation | **proved** |
| Shared expression constructor embedding | proved |
| Structural exclusion of fvar/mvar/lit/mdata | proved |
| Positive de Bruijn lifting correspondence | proved |
| Outer-binder `instantiate1` correspondence | proved |
| Conversion-free PS→Lean typing refinement for Sort/BVar/Const/App/Lam/Pi/Let | **proved** |
| Primitive beta and zeta correspondence | **proved** |
| Transparent delta soundness/completeness/stuck boundary | **proved** |
| Finite ordinary beta/zeta/delta/application-head reduction preservation | **proved** |
| Canonical function-eta expansion translation | **proved** |
| Ordinary logical definitional-equality fragment: reduction + congruence + eta + proof irrelevance | **PS→Lean refinement proved** |
| Basic conversion-dependent typing over that ordinary equality fragment | **PS→Lean refinement proved** |
| Projection loose-bvar dependency classifier | **proved** |
| Dependency-aware raw projection field traversal with Prop gating | **PS→Lean refinement proved relative to Prop-classifier soundness** |
| Raw constructor projection/iota selection | **proved** |
| Recursor metadata positions (`firstMinor` / `firstIndex` / `major`) relative to actual `Lean.RecursorVal` | **proved under explicit metadata correspondence** |
| Recursor rule constructor/field keys and K flag relative to actual `Lean.RecursorVal` | **proved under explicit metadata correspondence** |
| Direct recursive IH generation and fields-first recursor iota assembly | **PS→Lean structural refinement proved** |
| K-major replacement | **PS→Lean refinement proved relative to a sound type-equality premise** |
| Quotient primitive metadata (`name` / universe parameters / full type / kind) relative to actual `Lean.QuotVal` | **proved under explicit metadata correspondence** |
| `Quot.lift` / `Quot.ind` iota, including applications after the major | **PS→Lean structural refinement proved** |

All formal files are checked with exact Lean 4.33.1. No theorem in this layer
uses `sorryAx`.

## Definitional-equality theorem boundary

`DefEqOrdinary.lean` defines a deliberately explicit logical relation rather than
pretending to have already verified the shipped TypeScript search procedure. Its
current fragment contains:

- reflexivity, symmetry and transitivity;
- ordinary beta/zeta/transparent-delta/application-head reduction;
- application congruence and same-domain binder-body congruence;
- canonical function eta, with a direct typing premise;
- proof irrelevance for two direct-typed inhabitants of the same proposition.

Under the existing delta and direct-typing environment relations,
`OrdinaryDefEq.sound` proves that every such ProofScript equality derivation
translates to the corresponding Lean-expression equality derivation.

This is a real PS→Lean semantic-refinement theorem for the modeled ordinary
fragment, but it is **not yet the final theorem that Lean 4.33.1 native
`Meta.isDefEq` or the C++ kernel algorithm accepts exactly the same pairs**.
The exact native behavior is currently linked by the pinned differential corpus;
the native-algorithm/specification bridge remains part of O-DEF/O-IMPL.

## Conversion-dependent typing theorem boundary

`TypingConversion.lean` closes the non-circular ordinary conversion layer for
Sort, bound variables, constants, application, lambda, dependent Pi and let.
The dependency direction is:

```text
DirectTyping
     ↓
OrdinaryDefEq (eta/proof-irrelevance premises use DirectTyping only)
     ↓
ConversionTyping
```

so the theorem does not assume itself through definitional equality.

`ConversionTyping.typing_sound` proves PS→Lean typing refinement when type
agreement is justified by the already-proved ordinary equality relation.
The ordinary typing theorem itself still excludes projection syntax. Projection field-type reconstruction is now proved separately in `Projection.lean`; connecting constructor metadata lookup and native proposition classification to installed declarations remains O-DECL/O-PROJ.

## Delta/transparency theorem boundary

`DeltaTransparency.lean` isolates the logical transparency projection of the
environment. Its lookup is already indexed by universe arguments and returns the
instantiated body. It proves delta soundness, translated-constant completeness,
and the `none`/stuck opacity boundary.

The proof does **not** yet establish that declaration installation and
universe-level substitution in the shipped environments implement that lookup;
that remains O-DECL.

## Exact executable evidence

- Native Lean universe predicates: 30,000 generated pairs / 60,000 comparisons,
  zero mismatch.
- ASCII universe-name order: 5,000 cases, zero mismatch.
- v71 universe instantiation: 1,000 level + 1,000 shared-expression cases against exact Lean 4.33.1, zero mismatch.
- Native expression operations: 500 lift + 500 instantiate1 cases, zero mismatch.
- Direct typing: 1,000 TypeScript + 1,000 exact Lean cases, zero failures.
- Beta/zeta WHNF: 1,000 TypeScript + 1,000 exact Lean cases, zero failures.
- Delta/transparency: 1,000 TypeScript + 1,000 exact Lean cases, zero failures.
- Transparent-head ordinary WHNF: 1,000 TypeScript + 1,000 exact Lean cases,
  zero failures.
- Eta/proof irrelevance: 1,000 TypeScript + 1,000 exact Lean decisions,
  zero failures, including positive and negative controls; exact Lean performs
  2,000 kernel checks.
- Conversion-dependent typing: 1,000 TypeScript + 1,000 exact Lean cases,
  zero failures across eta-under-type-constructor, proof-irrelevance-under-type-
  constructor, beta, zeta and delta conversion; exact Lean performs 2,000 kernel
  checks.
- Projection typing/reduction: 1,000 TypeScript + 1,000 exact raw-Lean cases,
  zero failures, including indexed metadata, invalid indices, Prop data rejection,
  dependent-proof rejection, independent-proof acceptance, and constructor iota.
- Historical v69 projection counterexample remains reproducible and is rejected
  by the inherited v70 projection-conformance path and therefore by v71.
- Recursor metadata: seven direct raw-kernel shapes (`U`, one-field, recursive list-like,
  parameterized, explicitly indexed, Eq-like K, and Prop-with-field non-K) match
  **line-for-line** between the inherited ProofScript projection/recursor implementation and exact Lean 4.33.1. The Lean fixture
  uses `Lean.addDecl (.inductDecl ...)`, so surface parameter inference is not part
  of this comparison.
- Existing exact-Lean recursor suites remain green for K-major reconstruction,
  fields-first recursive minor/iota ordering, and direct/higher-order indexed recursion.
- Quotient primitives: all four generated `QuotVal` structures match exact Lean 4.33.1 line-for-line (name, universe parameters, kind, binder info, levels, full expression tree); 500 `Quot.lift` + 500 `Quot.ind` TypeScript cases and 500 + 500 exact Lean cases pass, with half exercising post-major applications.

These executable checks are differential evidence, not substitutes for the
formal theorems.

## Still open before a K3 equivalence claim

1. Pure universe normalization theorem and exact native `isEquiv`/`geq` bridge.
2. Close the projection environment/native-classifier bridge and integrate the projection rule into the full typing/defeq model.
3. Finish inductive admission/positivity and generated recursor type/RHS correspondence,
   including indexed/mutual/nested metadata and reduction closure. The direct metadata,
   direct-IH/iota, and abstract K-major slices are now partially proved.
4. Quotient admission bridge: formed primitive environment installation/lookup is now proved; exact Eq/Eq.refl precondition + atomic quotient initialization remain open.
5. Remaining full definitional-equality congruence/contextual closure and the
   final exact native-defeq bridge.
6. Declaration/environment preservation is partially closed: ordinary safe declarations and formed quotient entries now preserve installation/lookup/type-instantiation/delta relations. Inductive/constructor/recursor admission and quotient initialization preconditions remain open.
7. Resource theorem: PS acceptance implies Lean acceptance; exhaustion is
   semantically neutral; sufficient budget gives completeness.
8. Shipped TypeScript TCB ↔ formal checker implementation correspondence.
9. Final bidirectional whole-shared-domain acceptance/type/defeq theorem.

The direct recursor-metadata and direct iota/K structural slice is now partially closed.
The quotient primitive metadata/iota slice is now partially closed, and formed quotient entries now share the same proved environment relation as ordinary declarations. O-DECL ordinary lookup/installation is closed at the structural theorem + exact native differential layer. The next highest-value formal priority is the **quotient admission precondition/atomic initialization bridge**, followed by inductive/constructor/recursor environment preservation under O-IND/O-DECL. Inductive admission/positivity and generated-recursors environment/RHS correspondence remain open. The ordinary function/let conversion foundation should remain
frozen unless a new exact-Lean discrepancy is discovered.


## Historical supersession chain

- **Core v68 / `KERNEL-resource-bounds0`** — retained for historical replay; superseded after a confirmed universe-admission/conformance defect.
- **Core v69 / `KERNEL-universe-conformance1`** — retained for historical replay; superseded after exact Lean 4.33.1 exposed a raw-projection dependency/Prop-gating discrepancy.
- **Core v70 / `KERNEL-projection-conformance1`** — retained for historical replay; projection repair remains inherited and green, but v70 is superseded for exact trusted-use because its level substitution rebuilt changed `max`/`imax` nodes structurally rather than through Lean 4.33.1 cheap constructors.
- **Core v71 / `KERNEL-level-instantiation-conformance1`** — current formal-equivalence candidate.

## v71 level-instantiation theorem boundary

`LevelInstantiationV71.lean` models the actual shipped v71 no-mvar substitution behavior, including cheap `max`/`imax` rebuilding, while preserving `LevelInstantiation.lean` as the historical raw-substitution reference. `ExprLevelInstantiationV71.lean` lifts that model through every shared Core expression constructor.

The machine-checked result is a structural Core→Lean correspondence theorem for the explicit v71 specification. The exact pinned Lean implementation bridge is separately exercised by 1,000 generated levels and 1,000 generated shared expressions with zero mismatch. This closes the level/expression substitution sub-obligation needed by O-DECL, but does not yet prove declaration/environment preservation itself.


## v71 declaration/environment checkpoint — ordinary + formed quotient entries

`DeclarationOrdinary.lean` relates ordinary safe `axiom`, regular/abbrev `definition`, `theorem`, and `opaque` entries directly to the actual Lean 4.33.1 `ConstantInfo` constructors. It proves translated lookup, exact v71 universe-instantiated type lookup, ordinary delta-body lookup, and discharges the `DirectEnvSound` / `DeltaEnvExact` premises used by the earlier typing and reduction theorems.

`DeclarationEnvironment.lean` then generalizes that model to a single environment containing both ordinary declarations and already-formed quotient primitives. Entry translation targets actual `Lean.ConstantInfo`, quotient translation targets actual `Lean.QuotVal`, batch installation commutes with translation, constant type lookup remains exact, and quotient entries are correctly non-delta-unfolding. The dependency chain through this module is 20 formal modules with no `sorryAx`.

The implementation/native bridge submits seven ordinary declarations directly with `Lean.addDecl`. Their `ConstantInfo` kind/name/universe-parameter/type/transparent-body signatures match the shipped v71 TypeScript environment line-for-line. A deterministic 1,000-case corpus additionally compares every universe-instantiated inferred constant type expression-for-expression; exact Lean performs 1,000 `Meta.checkWithKernel` checks and reports zero failures. Duplicate insertion is rejected by both implementations without replacing the existing declaration.

This does **not** yet prove that the ProofScript `quot` marker and Lean `.quotDecl` have equivalent admission behavior. Exact `Eq`/`Eq.refl` preconditions and atomic installation of all four quotient primitives remain the next O-DECL/O-QUOT boundary.

## v71 declaration/quotient checkpoint — fresh quotient admission + formed inductive metadata

`DeclarationInductiveMetadata.lean` now gives an explicit structural image of already-admitted ProofScript inductive and constructor metadata as actual `Lean.InductiveVal` and `Lean.ConstructorVal` objects.  The canonical `Eq` / `Eq.refl` pair used by quotient initialization is represented in this relation with the exact pinned Lean 4.33.1 metadata observed in a fresh kernel environment.

`DeclarationEnvironment.lean` now carries ordinary, quotient, inductive, and constructor entries in one translated environment.  It proves exact translated lookup/type-instantiation and delta behavior, preserves the canonical quotient-readiness precondition in the PS→Lean direction, and proves that installation of an already-formed quotient primitive batch commutes with Core→Lean translation.  The dependency chain through this layer is **21 formal modules with no `sorryAx`**.

The implementation bridge is no longer limited to already-installed built-ins.  `QuotientAdmissionNativeDifferential.lean` constructs a truly fresh Lean kernel environment, installs canonical raw `Eq`, then invokes actual `Lean.addDecl .quotDecl`.  The resulting `Quot`, `Quot.mk`, `Quot.lift`, and `Quot.ind` structures are identical to the shipped v71 structures.  One positive case and four representative negative cases (missing Eq, malformed/non-inductive Eq, missing Eq.refl, and a pre-existing quotient-name collision) agree between v71 and exact Lean; every negative case is atomic and leaks no tail primitives.

This materially narrows O-QUOT, but it is not a whole-kernel equivalence claim.  A complete bidirectional theorem characterizing every possible quotient-admission failure remains optional work for exact operational `.quotDecl` parity.  The larger trust-critical remaining obligation is now **generic inductive/constructor admission and positivity, followed by generated recursor type/RHS and environment preservation** under O-IND/O-DECL.

## v71 direct-inductive admission checkpoint — normalized direct slice

`DeclarationRecursorMetadata.lean` extends the formed declaration image to actual
`Lean.RecursorVal` objects.  Recursor name, universe parameters, type, family list,
parameter/index/motive/minor counts, rule constructor/field keys, K classification,
and safety metadata are explicit in the relation; the earlier reduction-metadata
model is recovered by theorem rather than duplicated informally.

`InductiveDirectAdmission.lean` adds the first admission/positivity theorem rather
than assuming already-formed metadata.  For the normalized parameterless/indexless
direct slice it proves that Core→Lean translation preserves constant occurrence,
nonrecursive field classification, strictly-positive recursive field shapes, and
constructor telescope/result shapes.  This is deliberately a direct slice theorem,
not a claim about all of Lean's indexed/mutual/nested positivity machinery.

The native bridge submits raw `.inductDecl` declarations through actual
`Lean.addDecl` in fresh Lean 4.33.1 environments and compares the generated
inductive, constructor, and recursor metadata with the shipped v71 TypeScript
kernel.  Six positive families (unit-like, list-like recursive, higher-order
positive, empty, Prop-valued, and universe-polymorphic) agree structurally.  Four
negative families (negative occurrence, wrong constructor result, oversized field
universe, duplicate constructor name) reject in both implementations, and all four
rejections are atomic.  The corpus records **18 generated metadata lines, zero
mismatches, 6 positive / 4 negative cases, and 4/4 atomic failures**.  Recursor
universe parameter names are alpha-normalized because both kernels instantiate
those parameters positionally.

The formal dependency stack at this direct-only checkpoint contained **23 modules with zero `sorryAx`** when
compiled under the pinned Lean 4.33.1 executable.  The parameterized/indexed direct slice is extended below.


## v71 parameterized/indexed direct-inductive checkpoint — normalized indexed slice

`InductiveIndexedAdmission.lean` extends the normalized direct admission theorem to
parameterized and indexed non-mutual families.  It proves Core→Lean preservation of
application spines, the copied parameter telescope, exact uniform-parameter de Bruijn
positions at field depth, exact index arity, nonrecursive indices, normalized
strictly-positive indexed recursive fields, and the exact terminal constructor
result-family shape.  This mirrors the invariants used by shipped v71 rather than
replacing them with a weaker “is indexed” predicate.

`RecursorIndexed.lean` adds the corresponding direct indexed computation layer.  It
proves structural correspondence for indexed recursive-hypothesis assembly and
fields-first indexed iota, and extracts the exact index tuple arity from an admitted
recursive occurrence.

The raw-kernel differential submits parameterized/indexed `.inductDecl` values to
actual pinned `Lean.addDecl` in fresh environments.  Six positive families are
accepted by both implementations: index-only, parameter+index, dependent two-index,
higher-order indexed recursion, multiple indices/two recursive fields, and an
Eq-like universe-polymorphic family.  Six representative malformed families are
rejected by both: mismatched parameter telescope, nonuniform result parameter,
nonuniform recursive parameter, underapplied indexed result, wrong index type, and
incompatible family universe instantiation.  All six negative cases are atomic.
Across the accepted corpus, **19 generated inductive/constructor/recursor structural
records match with zero mismatch** after positional alpha-normalization of generated
recursor universe-parameter names.

A second exact bridge compares computation rather than only generated metadata.
Six indexed recursor applications are checked by the pinned Lean kernel and reduced
with `Meta.whnf`; shipped v71 produces the same canonical WHNF in all six cases,
including dependent-index, higher-order pointwise-IH, multi-index and Eq-like K
cases.  Result: **6 exact WHNF comparisons, zero mismatches, 6 kernel checks**.

Lean stores a literal `RecursorRule.rhs`, while ProofScript v71 stores procedural
recursor metadata and performs iota procedurally.  Therefore this checkpoint claims
**generated recursor type/metadata correspondence plus extensional iota
correspondence**, not byte-identical stored RHS representation.

The pinned formal stack is now **25 modules plus the target statement, with zero
reported `sorryAx`**.

Remaining trust-critical O-IND work is narrower:

1. integrate WHNF/definitional-equality parameter matching into one generic
   non-mutual admission theorem rather than the current normalized structural slice;
2. prove the field-universe ceiling/admission rule generically;
3. prove the generic generated-recursion construction/type theorem and extensional
   RHS/iota theorem beyond the pinned corpus;
4. extend admission, positivity, generated-recursors and environment preservation to
   mutual and nested inductive families;
5. close the resulting whole-environment induction needed for the final K3 theorem.

No kernel semantics changed in this checkpoint.

## v71 non-mutual inductive integration checkpoint — normalized integrated slice

`InductiveNonMutualIntegration.lean` connects the previously separate non-mutual
inductive-admission obligations into one normalized boundary.  It adds a formal
constructor-field universe predicate with the Lean Prop exemption, proves that
this field-universe predicate commutes with Core→Lean level translation, models
uniform parameter matching through ordinary definitional equality rather than raw
syntax, and proves that this defEq-based matching translates through the existing
ordinary `defEq` theorem.

The same module defines an integrated constructor-field premise combining field
sort typing, the universe ceiling, nonrecursive classification, and indexed
strict positivity.  `integratedField_sound` transports that whole premise to the
Lean side using the existing conversion typing theorem, the new field-universe
theorem, and the indexed positivity theorem.  It also packages the procedural
recursor/iota boundary as an extensional specification: ProofScript v71 stores
procedural recursor metadata, while Lean stores recursor rules; the current
claim is extensional iota/WHNF correspondence, not byte-identical stored RHS.

The exact bridge `kernel-inductive-nonmutual-integration-tests.ts` composes the
pinned Lean 4.33.1 checks for constructor-field universe admission, Prop
exception, uniform-parameter definitional equality, direct raw admission,
parameterized/indexed raw admission, and indexed recursor WHNF computation.  All
subchecks pass with zero failures.

The formal stack is now **26 modules plus the target statement, with zero
reported `sorryAx`**.  This narrows O-IND substantially, but does **not** prove
K3 whole-kernel equivalence.  Remaining non-mutual work is to replace the
current normalized structural premises with a full generic admission theorem
using WHNF/defEq and to prove generic generated recursor construction/type plus
extensional RHS/iota preservation before moving to mutual/nested inductives.


## v71 generated non-mutual recursor checkpoint — type + extensional RHS boundary

`RecursorNonMutualGenerated.lean` adds a generic generated-recursor boundary for
normalized non-mutual families.  It does not try to assert that ProofScript stores
the same internal `RecursorRule.rhs` object as Lean.  Instead it models the part
that must be semantically identical: the generated recursor declaration type, the
minor-premise type spines, constructor rule keys/counts, and the extensional iota
behavior obtained by applying the recursor to a constructor major.

The new theorem layer proves Core→Lean preservation of:

1. motive-result application to indices plus major;
2. final major-family applications over parameters and indices;
3. generated Π-telescope recursor type spines;
4. generated minor-premise type spines with fields-first recursive IH binders;
5. constructor rule key/count projection;
6. per-rule minor type plus before/after extensional iota images;
7. whole generated non-mutual recursor packages.

The exact bridge composes the already-pinned raw `Lean.addDecl` direct and
parameterized/indexed admission corpora with the indexed WHNF/iota corpus and the
older dependent-indexed recursor completion observations.  The resulting evidence
records **37 generated structural records** (18 direct + 19 indexed), **12 positive
and 10 negative non-mutual admission cases**, **10/10 atomic rejection cases**, and
**6 exact WHNF/iota comparisons** with zero mismatch.

The pinned formal stack is now **27 modules plus the target statement, with zero
reported `sorryAx`**.

Remaining O-IND work is now focused on theorem generality rather than finding the
basic shape: full generic non-mutual admission with WHNF/defEq, field-universe and
positivity validation, generic recursor construction beyond the normalized witness
structures, whole-environment induction, and then mutual/nested families.


## v71 non-mutual whole-environment induction checkpoint

`EnvironmentNonMutualInduction.lean` connects the ordinary declaration, quotient, formed inductive/constructor/recursor, direct/indexed admission, and generated non-mutual recursor layers into one ordered environment-preservation theorem. It defines normalized non-mutual packages as lists of already-generated v71 environment entries plus generated recursor specifications, then proves that installing any sequence of such packages commutes with Core→Lean environment translation.

The theorem also re-establishes the exact direct-typing lookup premise, delta/transparency lookup premise, universe-instantiated constant type lookup, and transparent-body lookup after the whole package sequence is installed. Every generated recursor inside the packages inherits the structural/extensional recursor bridge from `RecursorNonMutualGenerated.lean`.

This closes the current normalized non-mutual whole-environment induction boundary, but it still depends on the normalized/witnessed admission slices already stated in O-IND. It is not a complete generic Lean inductive-admission theorem and it is not K3 whole-kernel equivalence.

The pinned formal stack is now **28 modules plus the target statement, with zero reported `sorryAx`**.

## v71 generic non-mutual admission checkpoint — raw constructor boundary

`InductiveNonMutualGenericAdmission.lean` removes one important normalized-witness
assumption from the non-mutual theorem boundary.  Previous modules described
already-normalized constructor bodies or already-formed packages.  The new module
starts from raw constructor type expressions and defines a checked body-admission
predicate that peels the copied parameter telescope, checks each field through the
integrated field rule, and terminates only at the exact indexed result-family
shape.

The new theorem proves that if the ProofScript generic raw-constructor checker
accepts this fragment, the translated Lean-side checker accepts the translated
raw constructor/family under the same ordinary environment correspondence.  It
also connects checker-produced generic packages to the existing ordered
whole-environment theorem, so the DirectEnvSound and DeltaEnvExact premises used
by typing/reduction remain available after package installation.

This checkpoint is intentionally a **generic raw-admission boundary**, not a
claim that every possible Lean non-mutual inductive admission path has already
been characterized.  The remaining non-mutual gap is the implementation-complete
normalizer/classifier theorem: prove that the shipped checker's WHNF-driven
parameter extraction, field-universe classifier, and positivity traversal always
produce exactly these structural obligations when they accept, and reject every
malformed non-mutual input Lean rejects.

The effective formal stack is now **29 modules**: the inherited 28-module
`ENV_INDUCTION1` stack plus this new generic raw-admission module, all under
exact Lean 4.33.1 with zero reported `sorryAx`.

Exact executable evidence is inherited and recomposed by
`kernel-inductive-nonmutual-generic-admission-tests.ts`: direct and indexed
raw-kernel admission, generated recursor structure/iota, and ordered
environment-induction bridges all remain clean.  The composed bridge reports
`GENERIC_NONMUTUAL_ADMISSION_FAILURES=0`.

Remaining trust-critical work before mutual/nested families:

1. prove implementation-complete non-mutual normalization/classifier
   correspondence, not only this structural raw boundary;
2. strengthen the generic field-universe theorem from representative exact
   cases to all accepted non-mutual field sorts;
3. close generic recursor construction/type and extensional RHS/iota for all
   accepted non-mutual packages;
4. then begin mutual inductive admission.

No trusted kernel semantics changed in this checkpoint.

## v71 non-mutual classifier-correspondence checkpoint — witness boundary

`InductiveNonMutualClassifierCorrespondence.lean` connects the raw generic
admission theorem to the actual shipped classifier boundary.  It does not claim
to be a full Lean reimplementation of the TypeScript code; instead it states the
precise certificate interface that the implementation must expose: after WHNF,
ordinary definitional equality, field-universe checking, recursive-occurrence
classification and constructor-result analysis, each accepted constructor must
produce a `PSCtorClassifierWitness`.  Such a witness is proved sufficient for
`PSGenericCtorAdmission`, and therefore translates to Lean-side generic
admission under the existing ordinary-environment correspondence.

The module also lifts the witness to whole families and classifier-produced
packages.  A sequence of classifier-produced packages inherits the existing
non-mutual whole-environment theorem, preserving translated installation,
constant type lookup, direct-typing environment soundness and ordinary
delta/transparency exactness.

The effective pinned formal stack is now **30 modules**: inherited 29-module
`GENERIC_NONMUTUAL_ADMISSION1` plus the new classifier-correspondence module,
with **zero reported `sorryAx`**.

New executable vectors exercise the classifier-facing cases that matter most for
this boundary:

- accepted recursive parameter matching through ordinary defEq/WHNF;
- accepted indexed recursive parameter matching through ordinary defEq/WHNF;
- accepted higher-order indexed recursion with pointwise IH generation;
- accepted Eq-like Prop/K metadata boundary;
- accepted Prop impredicativity field-universe exemption;
- rejected negative recursive occurrence;
- rejected malformed recursive/indexed occurrence before admission;
- rejected nonuniform constructor-result parameter;
- rejected constructor-field universe overflow;
- atomic rejection for all four malformed vector cases.

The classifier bridge composes those vectors with the existing generic admission,
non-mutual integration, generated-recursors and whole-environment evidence:
`NONMUTUAL_CLASSIFIER_COMPONENTS=5 FAILURES=0`.

This still does **not** prove implementation-complete non-mutual equivalence.
The remaining implementation-correspondence task is to prove, against the actual
TypeScript source subset or a extracted executable model, that every successful
branch of the shipped normalizer/classifier constructs this formal witness, and
that every rejection branch agrees with exact Lean for the declared non-mutual
input domain.  After that the next major frontier remains mutual and nested
inductive families.

## v71 direct TypeScript non-mutual classifier implementation bridge

`TypeScriptClassifierImplementationContract.lean` adds a small implementation-evidence contract for the shipped v71 TypeScript non-mutual classifier path.  It does not model JavaScript execution and does not claim full O-IMPL.  It states the concrete source/runtime evidence boundary required before the existing classifier-witness theorem may be applied to the actual implementation path: source obligations must be present, accepted outcomes must expose the witness boundary, and rejected outcomes must be atomic and remain outside the accepted package path.

`kernel-inductive-nonmutual-ts-implementation-correspondence-tests.ts` audits the actual shipped TypeScript source slices for:

- `checkAndAddDeclaration`;
- `checkSimpleInductive`;
- `checkIndexedInductive0`;
- `positiveRecursiveFieldType`;
- `checkConstructorFieldUniverse`;
- `propEliminationMotivePolicy`.

The audit records six source-slice hashes and checks **46 source obligations**: WHNF before recursive classification, Pi-domain positivity rejection, uniform-parameter `defEq`, recursive-index rejection, constructor field universe ceiling and Prop exemption, staged atomic admission, exact constructor-result parameter/index checks, and the generator branches that feed recursor metadata.  Runtime sentinels exercise the exported `checkAndAddDeclaration` path with **5 accepted families, 4 rejected families, 4/4 atomic rejections, 4 option sentinels, and zero failures**, then compose the result with the exact Lean-backed classifier correspondence bridge.

This upgrades the non-mutual classifier status from a pure witness boundary to a **source-audited direct TypeScript implementation bridge** for the bounded non-mutual corpus.  It remains short of full implementation correspondence: O-IMPL still needs either a formal semantics for the restricted TypeScript TCB or extraction of the classifier/checker into a proof-oriented model, followed by whole-kernel coverage.

## v71 merged O-DECL + TypeScript classifier checkpoint

The `ts-classifier-impl1` branch is the stronger baseline and the `odecl1` branch
contributes a local ordinary declaration-environment preservation regression.  The
merged checkpoint adds `kernel-declaration-environment-preservation-tests.ts` and
`kernel-v71-local-merged-regression-tests.ts` without changing kernel semantics.

The local merged gate verifies two non-Lean-required invariants: ordinary
O-DECL lookup/delta/opaque/example behavior still uses v71 universe/expression
instantiation, and the shipped TypeScript non-mutual classifier implementation
bridge still exposes all 46 audited source obligations with accepted/rejected
runtime sentinels and atomic failures.  The exact Lean bridge remains gated by
`PROOFSCRIPT_LEAN_BIN`; it is not claimed rerun in environments where the pinned
Lean executable is unavailable.

## v71 mutual formed-environment checkpoint — atomic formed O-DECL boundary

`InductiveMutualFormedEnvironment.lean` adds the first mutual-specific formal
environment theorem.  It intentionally works at the **formed package** boundary:
once the executable mutual checker has atomically produced family, constructor,
recursor and auxiliary entries for a mutual block, installing those entries
commutes with Core→Lean translation and preserves the direct constant-typing and
ordinary delta/transparency environment premises.

The checkpoint is paired with an exact Lean-backed executable gate covering the
current v71 mutual slices: direct mutual Type families, shared/dependent mutual
parameters, mutual indices, higher-order positive mutual recursion, and mutual
Prop behavior.  The source audit targets `checkDirectMutualInductive` and checks
39 admission/atomicity obligations, including shared telescope checks, family and
constructor freshness, universe equality, field-universe checking, strict
positivity classification, constructor-result parameter/index constraints,
recursor generation, staged installation and final `env.replaceWith(final)`
atomicity.

This is not yet a full mutual admission theorem.  The next mutual K3 work should
prove the accepted mutual classifier/witness boundary directly, then lift mutual
recursor type/RHS correspondence beyond executable differential evidence.

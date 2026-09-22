# KERNEL-empty-inductives0 profile

Semantic baseline: ProofScript Language Reference v0.1 / Lean 4.33.1 (`819816b2e0a3bf405af45ae5c7af2491d8f5bee6`).

This is a **kernel-only hardening profile**. The source frontend remains the frozen v12 `K3c-section-vars0` producer; v14 adds no parser syntax and no frontend module metadata.

## Core/artifact boundary

- Core artifact format: **v14**.
- Implementation profile: `KERNEL-empty-inductives0`.
- v14 permits non-mutual inductive declarations with zero constructors.
- Historical v1-v13 codecs keep their original semantics and reject empty-inductive payloads that were unavailable in those profiles.
- v14 also inherits the v13 trusted quotient marker.

## Empty inductive admission

The standalone kernel admits well-typed non-mutual empty inductives after the same declaration-name, universe-parameter, telescope, and result-sort checks used by the corresponding nonempty inductive family. Parameterized and indexed empty families are supported within the existing non-mutual parameter/index representation.

Admission is atomic. A collision with the generated `.rec` declaration rejects without installing the inductive.

## Lean 4.33.1 empty recursors

Empty recursors use Lean's special shape rather than the nonempty indexed-recursion template:

- the motive universe parameter is first in the recursor universe parameter list;
- inductive parameters and indices become implicit recursor parameters;
- the motive is **explicit**, because there are no minor premises from which Lean can infer it;
- the major premise is explicit;
- the motive ranges over the already-instantiated empty family;
- there are no minor premises and no iota rules because there are no constructors.

Empty `Prop` therefore supports Lean's arbitrary-sort elimination rule.

## Shared recursor-fidelity hardening

For supported **nonempty** recursor shapes, the v14 exact profile also corrects previously approximate generated metadata:

- motive universe parameter first, followed by inductive universe parameters;
- recursor parameters implicit;
- motive implicit when nonempty minor premises permit inference;
- repeated indices implicit while motive-index binders preserve the inductive BinderInfo;
- constructor-local field BinderInfo preserved in minor premises;
- recursive induction-hypothesis binders remain explicit.

This gives canonical Lean-shaped `Eq.rec` for a canonical `Eq`/`Eq.refl` Core declaration. Historical v1-v13 artifacts continue using the legacy recursor-generation profile during replay.

## Security/replay

The v14 strict decoder rejects:

- empty inductives in v1-v13 profiles;
- frontend module metadata on the kernel-only v14 profile;
- malformed parameter/index telescope counts;
- malformed terms/universes under the existing codec budgets.

Strict verification selects the v14 exact kernel profile from authenticated artifact metadata and performs independent replay without parser, elaborator, plugins, or Lean.

## Exact Lean evidence

`tools/kernel-empty-inductive-tests.ts` authenticates exact Lean 4.33.1 and observes recursor universe ordering/BinderInfo for parameterless `Type`, empty `Prop`, parameterized empty, indexed empty, and Eq-like singleton families. It also checks v14 standalone replay and adversarial profile gating.

Missing Lean never changes standalone acceptance; it only removes optional oracle evidence.

## Deferred

This profile does **not** complete Lean inductives in general. Remaining kernel work includes complete positivity/universe admission, dependent recursive indexed recursors, full singleton-Prop elimination conditions, structure eta, mutual/nested inductives, and final resource/adversarial hardening.

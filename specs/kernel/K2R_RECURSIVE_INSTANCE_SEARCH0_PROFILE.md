# K2r-recursive-instance-search0 implementation profile

K2r is an implementation-coverage profile of ProofScript Language Reference v0.1 targeting the pinned Lean 4.33.1 semantic baseline. It does not redefine ProofScript.

## Added in K2r

K2r extends the K2q polymorphic global-instance slice with **bounded recursive synthesis of instance-implicit prerequisites**. A supported instance telescope has the shape:

```text
implicit/strict-implicit type parameters*
instance-implicit registered-class prerequisites*
fully applied registered-class target
```

Example source:

```ts
instance {A: Type} [m: Marker(A)] boxMarker: Marker(Box(A)) := {
  tag := Marker.tag(A, m)
};
```

For a fully known goal `Marker(Box(Nat))`, elaboration:

1. ranks global candidates by priority then declaration recency;
2. first-order unifies the candidate final class target with the goal, solving hidden type parameters;
3. recursively synthesizes each instance-implicit prerequisite;
4. rejects active-goal cycles;
5. enforces a search-depth limit of 16 (reported as `resource_exhausted`);
6. asks the standalone kernel to infer the fully instantiated candidate and requires definitional equality with the requested goal;
7. emits only the resulting explicit Core application.

No search state, metavariable, cycle table, or typeclass rule enters kernel Core. Strict replay never reruns instance search.

## Conservative restrictions

K2r does not yet support:

- explicit value prerequisites on instance declarations;
- hidden type parameters after an instance prerequisite;
- final instance targets that depend on prerequisite *values*;
- local/scoped instances;
- `outParam` / `semiOutParam`;
- default instances;
- Lean-compatible tabling, diamond handling, general backtracking, transparency modes, or reducibility controls during search.

These remain ProofScript v0.1 features outside the current implementation coverage and must be reported as unsupported where applicable.

## Artifact/trust boundary

K2r continues to use Core artifact format v10. Recursive search requires no new wire constructor: instance prerequisites are ordinary `Pi` binders with `instImplicit` BinderInfo and the selected prerequisite terms are ordinary explicit `App` nodes. v10 metadata validation independently checks that registered prerequisites name fully applied registered classes and that the final class target does not depend on prerequisite values.

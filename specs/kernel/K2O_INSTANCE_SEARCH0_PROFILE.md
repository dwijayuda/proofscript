# K2o-instance-search0 implementation profile

K2o is an implementation-coverage milestone of ProofScript Language Reference v0.1. It does not define a new language dialect.

## Added coverage

K2o builds the first automatic instance-synthesis rule on top of the K2n class/instance environment.

For an ordinary application whose next hidden binder is `instImplicit`, K2o can synthesize that binder when:

- the goal weak-head-normalizes to a **fully known parameterless registered class** `C`;
- candidate instances are global K2n registrations for `C`;
- candidate declarations require no universe arguments in this slice;
- the candidate's independently kernel-inferred type is definitionally equal to the goal.

Candidate ranking is deterministic:

1. larger instance priority first;
2. for equal priorities, larger declaration order first (newer registration first).

The first exact candidate is inserted as an ordinary explicit Core constant/application.

Example source:

```ts
class Flag {
  enabled: Bool;
}

instance (priority := 2000) flagA: Flag := { enabled := true };
instance (priority := 2000) flagB: Flag := { enabled := false };

def readFlag[f: Flag](n: Nat): Bool := {
  Flag.enabled(f)
}

def selected: Bool := {
  readFlag(0)
}
```

The checked Core for `selected` contains an explicit application of `flagB`, because it has the same priority as `flagA` and was registered later.

## Trust boundary

Instance search is frontend/environment behavior. It adds no Core term and no kernel rule.

```text
instance goal
  -> candidate registry/search
  -> kernel infer + defEq validates candidate type
  -> explicit candidate Core term inserted
  -> ordinary kernel checking/replay
```

The isolated verifier never executes the search algorithm. It validates v9 registration metadata and independently rechecks the already-explicit Core declarations.

## Failure classification

For a fully supported K2o goal shape, absence of a matching global candidate is an elaboration **rejection**, because the search capability exists and failed.

Shapes outside the implemented search model remain `unsupported`, including parameterized classes, recursive instance dependencies, local/scoped candidates, output-parameter search, and default-instance behavior.

## Deliberate limits

K2o does **not** yet implement:

- parameterized classes or instances;
- implicit type parameters interleaved with instance goals such as `{A : Type} [C A]`;
- recursive instance dependencies;
- local or scoped instances;
- `extends`, `class inductive`, or `class abbrev`;
- `outParam` / `semiOutParam`;
- `@[default_instance]`;
- search tabling, cycle/diamond handling, or backtracking beyond the ranked direct candidate list;
- typeclass-driven `OfNat`, `BEq`, arithmetic, comparison, coercion, or other operator families.

## Artifact compatibility

Core artifact format remains v9. K2o adds no wire constructor or registration field. Frozen v9/K2n artifacts are accepted and normalized to the current K2o in-memory producer identity with all class/instance metadata preserved.

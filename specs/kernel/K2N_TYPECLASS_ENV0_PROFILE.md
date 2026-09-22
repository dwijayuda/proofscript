# K2n-typeclass-env0 implementation profile

K2n is an implementation-coverage milestone of ProofScript Language Reference v0.1. It does not define a new language dialect.

## Added coverage

K2n introduces the first typeclass environment layer while keeping the logical kernel unchanged.

Supported source subset:

- parameterless structure-style `class` declarations;
- class fields lowered through the existing one-constructor inductive/structure machinery;
- generated class projections;
- named global `instance` declarations;
- anonymous global `instance` declarations with deterministic generated internal names;
- explicit numeric instance priorities;
- default priority `1000` when no priority is written;
- declaration-order metadata for deterministic equal-priority ordering;
- instance-implicit binders `[x : C]` only when `C` is a registered class in this implemented slice;
- Lean export that reconstructs `class` and `instance` declarations from independently validated metadata.

## Lowering model

A K2n `class` is not a new kernel declaration kind. It lowers to the same checked one-constructor inductive plus projection definitions used by the restricted structure implementation. A separate typeclass registration record marks the checked inductive as a class.

A K2n `instance` is not a new kernel declaration kind. It lowers to an ordinary checked definition. A separate instance registration record identifies that checked definition as a candidate for synthesis.

Thus the trusted logical path remains:

```text
class/instance source
  -> ordinary inductive/definition Core
  -> kernel check
  -> separately validated environment registration metadata
```

## Candidate ordering metadata

The current registry records `priority` and `declarationOrder`. The standalone `@proofscript/typeclass` registry orders candidates by:

1. larger priority first;
2. for equal priorities, larger declaration order first (more recently registered first).

This milestone records and tests candidate ordering but does **not** yet automatically synthesize instance arguments.

## Artifact trust boundary

Core artifact format v9 adds a `typeclasses` section containing class and instance registration metadata. The isolated verifier validates this metadata against declarations it independently rechecks:

- every class registration must refer to a checked inductive of the supported K2n shape;
- its field metadata must agree with generated constructor/projection declarations;
- every instance registration must refer to a checked definition;
- the registered target must be a registered class;
- K2n instance types must be the supported direct parameterless class target.

The metadata cannot make the kernel accept a declaration and cannot introduce a kernel typing/reduction rule.

## Deliberate limits

K2n does **not** yet implement:

- automatic instance synthesis;
- parameterized classes or parameterized instances;
- recursive instance dependencies;
- `extends`;
- `class inductive` or `class abbrev`;
- local/scoped instances;
- output parameters or semi-output parameters;
- default instances;
- search tabling, cycle/diamond handling, or backtracking;
- typeclass-driven operators/literals such as general `OfNat` or `BEq`.

Unsupported source shapes report `unsupported`; malformed declarations in the implemented slice are rejected.

## Compatibility

K2n keeps all v1-v8 artifact readers. Historical artifacts gain an empty typeclass registry when normalized into the current in-memory representation. K2k/K2l/K2m v8 BinderInfo remains preserved.

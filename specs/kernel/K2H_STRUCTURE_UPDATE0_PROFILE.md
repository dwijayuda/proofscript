# K2h-structure-update0 implementation profile

Status: **implementation subset of ProofScript Language Reference v0.1**. It is not a separate language and does not claim full Lean structure-update elaboration.

## Added source coverage

For the existing same-compilation-unit parameterless/nondependent structure slice:

```ts
{ p with left := x }
{ p with left := x, right := y }
```

The initial parser conservatively requires the update base to be a simple source identifier. Nested field paths are deferred.

## Lowering

The elaborator infers the base term type, verifies that it is a known source structure, and reconstructs in declared field order. Updated fields use the supplied values; unchanged fields use the generated projection applied to the original base. The result is an ordinary application of the generated `.mk` constructor.

```text
{ p with left := x }
  -> Pair.mk(x, Pair.right(p))
  -> ordinary curried App core
```

No structure-update or object kernel term exists.

## Validation

- duplicate update fields: parser rejection;
- unknown fields: elaboration rejection;
- non-structure base: unsupported in this slice;
- changed and projected fields are checked against the constructor field types;
- projection results after update are validated by independently kernel-checked `Eq.refl` theorems.

## Scope limitation

Structure source metadata is currently retained only in the active compilation unit. Updating imported structures is deferred until environment extension/source metadata serialization is designed.

## Artifact compatibility

No Core/wire constructor is added, so format v7 remains current. Historical K2c/K2d/K2e/K2f/K2g v7 artifacts remain replayable.

## Deferred

Nested updates, parameters, dependent fields, defaults, parent extension, imported structure metadata, and generalized field notation remain unsupported.

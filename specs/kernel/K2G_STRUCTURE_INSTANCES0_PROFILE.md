# K2g-structure-instances0 implementation profile

Status: **implementation subset of ProofScript Language Reference v0.1**. It is not a separate language and does not claim full Lean structure elaboration.

## Added source coverage

For a same-compilation-unit parameterless/nondependent source structure whose type is known as the expected type, K2g accepts:

```ts
{ left := a, right := b }
{ left, right }
```

Field punning is ordinary ProofScript/Lean structure punning: `left` means `left := left`; it is not JavaScript object shorthand semantics.

## Lowering

The frontend retains source structure field names/order as elaboration metadata. A structure instance is checked against its expected structure type, reordered into declaration field order, and lowered to the existing generated constructor:

```text
{ left := a, right := b }
  -> Pair.mk(a, b)
  -> ordinary curried App core
```

No structure/object literal is introduced in kernel Core.

## Validation

- duplicate fields: rejected by parser;
- unknown fields: elaboration rejection;
- missing fields: elaboration rejection;
- no known expected structure type: unsupported in this slice;
- each field value is checked against the generated constructor field type.

## Scope limitation

Source structure metadata is currently retained only within the active compilation unit. Reconstructing structure field metadata from imported checked artifacts is deferred until environment-extension metadata has a serialized design.

## Artifact compatibility

No Core/wire constructor is added, so format v7 remains current. Historical K2c/K2d/K2e/K2f v7 artifacts remain replayable.

## Deferred

Structure updates, nested updates, defaults, extension/parents, parameters, dependent fields, imported structure metadata, and generalized field notation remain unsupported.
